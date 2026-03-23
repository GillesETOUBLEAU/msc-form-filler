import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TABLE = process.env.SUPABASE_TABLE || "msc_newsletter_contacts";
const FORM_URL =
  "https://www.msccroisieres.fr/formulaires/inscription-newsletter";

// Sitecore field prefix
const PREFIX = "fxb.110379d3-2410-4d74-ba93-4b3ead5d6945";

// Sitecore GUIDs
const FIELDS = {
  email: "08cda5b4-dc1b-4859-94e8-efa1ad32084c",
  telephone: "dde96755-aab7-42c4-badb-a6e6170dae4f",
  prenom: "d516be93-60b4-4b11-906b-9ae4e5d661b4",
  nom: "b21dd2c3-98cb-46ce-b119-a5a7e6919d7e",
  date_naissance: "3001ad09-a38f-4a2a-bdba-7f909b258238",
  experience_navigation: "155e5d57-5454-4d31-b3a5-15e45b824b74",
  destination: "5031aa2c-e08a-4e60-b91f-fe1d7b6209a5",
  consent: "65e1f0d7-8dd4-4af3-8b81-818285684520",
};

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const HEADED = args.includes("--headed");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Random delay between min and max ms */
function sleep(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

/** Build the Sitecore input name */
function fieldName(guid) {
  return `${PREFIX}.${guid}`;
}

/** Build a CSS selector for a Sitecore field */
function fieldSelector(guid) {
  // Sitecore renders name attributes with dots — CSS needs escaping
  const escaped = fieldName(guid).replace(/\./g, "\\.");
  return `[name="${escaped}"]`;
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch pending contacts
  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (LIMIT > 0) query = query.limit(LIMIT);

  const { data: contacts, error: fetchErr } = await query;

  if (fetchErr) {
    console.error("Supabase fetch error:", fetchErr.message);
    process.exit(1);
  }

  if (!contacts || contacts.length === 0) {
    log("No pending contacts. Done.");
    return;
  }

  log(`Found ${contacts.length} pending contact(s).`);

  if (DRY_RUN) {
    for (const c of contacts) {
      log(`[DRY-RUN] Would process: ${c.prenom} ${c.nom} <${c.email}>`);
    }
    return;
  }

  // Launch browser
  const browser = await chromium.launch({
    headless: !HEADED,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    viewport: { width: 1280, height: 800 },
  });

  let successCount = 0;
  let errorCount = 0;

  for (const contact of contacts) {
    const label = `${contact.prenom} ${contact.nom} <${contact.email}>`;
    log(`Processing: ${label}`);

    // Mark as processing
    await supabase
      .from(TABLE)
      .update({ status: "processing" })
      .eq("id", contact.id);

    const page = await context.newPage();

    try {
      // 1. Navigate to form — wait for full JS load
      await page.goto(FORM_URL, { waitUntil: "networkidle", timeout: 30000 });

      // 2. Fill required fields
      await page.fill(fieldSelector(FIELDS.email), contact.email);
      await page.fill(fieldSelector(FIELDS.prenom), contact.prenom);
      await page.fill(fieldSelector(FIELDS.nom), contact.nom);

      // 3. Fill optional fields
      if (contact.telephone) {
        await page.fill(fieldSelector(FIELDS.telephone), contact.telephone);
      }

      if (contact.date_naissance) {
        await page.fill(
          fieldSelector(FIELDS.date_naissance),
          contact.date_naissance
        );
      }

      if (contact.experience_navigation) {
        await page.selectOption(
          fieldSelector(FIELDS.experience_navigation),
          contact.experience_navigation
        );
      }

      if (contact.destination) {
        await page.selectOption(
          fieldSelector(FIELDS.destination),
          contact.destination
        );
      }

      // 4. Submit
      await page.click('button[type="submit"]');

      // 5. Wait for response and check success
      await page.waitForLoadState("networkidle", { timeout: 15000 });

      const pageText = await page.textContent("body");
      const success =
        pageText &&
        (pageText.toLowerCase().includes("merci") ||
          pageText.toLowerCase().includes("succès") ||
          pageText.toLowerCase().includes("inscription confirmée"));

      // Also check for visible error messages
      const hasError = await page
        .locator(".field-validation-error, .validation-summary-errors")
        .count();

      if (success && hasError === 0) {
        log(`  ✓ Success: ${label}`);
        await supabase
          .from(TABLE)
          .update({
            status: "done",
            processed_at: new Date().toISOString(),
            process_details: "OK",
          })
          .eq("id", contact.id);
        successCount++;
      } else {
        const errorText = hasError
          ? await page
              .locator(".field-validation-error, .validation-summary-errors")
              .first()
              .textContent()
          : "No success confirmation detected";
        log(`  ✗ Failed: ${label} — ${errorText}`);
        await supabase
          .from(TABLE)
          .update({
            status: "error",
            processed_at: new Date().toISOString(),
            process_details: errorText?.slice(0, 500),
          })
          .eq("id", contact.id);
        errorCount++;
      }
    } catch (err) {
      log(`  ✗ Error: ${label} — ${err.message}`);
      await supabase
        .from(TABLE)
        .update({
          status: "error",
          processed_at: new Date().toISOString(),
          process_details: err.message?.slice(0, 500),
        })
        .eq("id", contact.id);
      errorCount++;
    } finally {
      await page.close();
    }

    // Throttle between submissions (5-10s random)
    if (contact !== contacts[contacts.length - 1]) {
      const delay = Math.floor(Math.random() * 5000) + 5000;
      log(`  Waiting ${(delay / 1000).toFixed(1)}s before next...`);
      await sleep(delay, delay);
    }
  }

  await context.close();
  await browser.close();

  log(
    `Done. ${successCount} success, ${errorCount} errors out of ${contacts.length} contacts.`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

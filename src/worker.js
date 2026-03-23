import { chromium } from "playwright";
import { FORM_URL, FIELDS, TABLE, fieldSelector, sleep, log } from "./config.js";

// ---------------------------------------------------------------------------
// Browser management
// ---------------------------------------------------------------------------

let browser = null;
let context = null;

export async function initBrowser(headed = false) {
  browser = await chromium.launch({
    headless: !headed,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    viewport: { width: 1280, height: 800 },
  });

  log("Browser initialized.");
  return context;
}

export async function closeBrowser() {
  if (context) await context.close();
  if (browser) await browser.close();
  log("Browser closed.");
}

// ---------------------------------------------------------------------------
// Process a single contact
// ---------------------------------------------------------------------------

export async function processContact(supabase, contact) {
  const label = `${contact.prenom} ${contact.nom} <${contact.email}>`;
  log(`Processing: ${label}`);

  // Mark as processing
  await supabase
    .from(TABLE)
    .update({ status: "processing" })
    .eq("id", contact.id);

  const page = await context.newPage();

  try {
    // 1. Navigate — wait for full JS load
    await page.goto(FORM_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    // Wait for the form to be actually rendered
    await page.waitForSelector('button[type="submit"]', { timeout: 30000 });

    // 2. Fill required fields
    await page.fill(fieldSelector(FIELDS.email), contact.email);
    await page.fill(fieldSelector(FIELDS.prenom), contact.prenom);
    await page.fill(fieldSelector(FIELDS.nom), contact.nom);

    // 3. Fill optional fields
    if (contact.telephone) {
      await page.fill(fieldSelector(FIELDS.telephone), contact.telephone);
    }
    if (contact.date_naissance) {
      await page.fill(fieldSelector(FIELDS.date_naissance), contact.date_naissance);
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
    await page.waitForLoadState("domcontentloaded", { timeout: 15000 });
    await sleep(3000, 5000); // Let the page settle after submission

    const pageText = await page.textContent("body");
    const success =
      pageText &&
      (pageText.toLowerCase().includes("merci") ||
        pageText.toLowerCase().includes("succès") ||
        pageText.toLowerCase().includes("inscription confirmée"));

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
  } finally {
    await page.close();
  }

  // Throttle 5-10s between submissions (anti-detection)
  await sleep(5000, 10000);
}

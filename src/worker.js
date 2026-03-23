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
    // Wait for the form to exist in DOM (may be hidden behind cookie banner)
    await page.waitForSelector('#email', { state: 'attached', timeout: 30000 });

    // Dismiss cookie banner if present
    try {
      const cookieBtn = page.locator('[id*="onetrust-accept"], [class*="cookie"] button, [class*="accept-cookies"], button:has-text("Accepter"), button:has-text("Accept")');
      await cookieBtn.first().click({ timeout: 5000 });
      await sleep(1000, 2000);
    } catch { /* no cookie banner, continue */ }

    // 2. Fill required fields using evaluate (bypasses visibility checks)
    await page.evaluate((data) => {
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };
      setVal('email', data.email);
      setVal('firstName', data.prenom);
      setVal('lastName', data.nom);
      if (data.telephone) setVal('phoneNumber', data.telephone);
    }, contact);

    // 3. Fill optional select fields (also via evaluate to bypass visibility)
    await page.evaluate((data) => {
      const setSelect = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) {
          el.value = val;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };
      setSelect('fxb_110379d3-2410-4d74-ba93-4b3ead5d6945_Fields_155e5d57-5454-4d31-b3a5-15e45b824b74__Value', data.experience);
      setSelect('fxb_110379d3-2410-4d74-ba93-4b3ead5d6945_Fields_5031aa2c-e08a-4e60-b91f-fe1d7b6209a5__Value', data.destination);
    }, { experience: contact.experience_navigation, destination: contact.destination });

    // 4. Check marketing consent checkbox
    await page.evaluate(() => {
      const cb = document.getElementById('marketingConsent');
      if (cb && !cb.checked) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 5. Submit
    await page.evaluate(() => {
      const btn = document.querySelector('input[type="submit"]');
      if (btn) btn.click();
    });

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

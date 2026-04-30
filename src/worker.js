import { chromium } from "playwright";
import { FORM_URL, MKTO_FORM_ID, NAME_MAX_LENGTH, sleep, log } from "./config.js";

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

function truncate(value, max) {
  if (!value) return value;
  return value.length > max ? value.slice(0, max) : value;
}

export async function processContact(supabase, contact) {
  const label = `${contact.prenom} ${contact.nom} <${contact.email}>`;
  log(`Processing: ${label}`);

  await supabase
    .from("msc_newsletter_contacts")
    .update({ status: "processing" })
    .eq("id", contact.id);

  const page = await context.newPage();

  try {
    await page.goto(FORM_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Cookie banner (OneTrust on info.msccruises.com).
    try {
      const cookieBtn = page.locator(
        '#onetrust-accept-btn-handler, [id*="onetrust-accept"], button:has-text("Accepter"), button:has-text("Accept")'
      );
      await cookieBtn.first().click({ timeout: 5000 });
      await sleep(800, 1500);
    } catch { /* no banner */ }

    // Wait for Marketo to render the form into the DOM.
    await page.waitForFunction(
      (formId) =>
        window.MktoForms2 &&
        typeof window.MktoForms2.getForm === "function" &&
        window.MktoForms2.getForm(formId),
      MKTO_FORM_ID,
      { timeout: 30000 }
    );

    const fillResult = await page.evaluate(
      ({ formId, values }) => {
        const form = window.MktoForms2.getForm(formId);
        if (!form) return { ok: false, reason: "form_not_found" };
        form.vals(values);
        // flgProfiling is a single-checkbox: setting "yes" via vals() should tick it,
        // but Marketo wraps checkboxes in a fieldset that sometimes ignores vals().
        // Force the underlying input to be checked + dispatch change.
        const cb = form.getFormElem()[0]?.querySelector('input[name="flgProfiling"]');
        if (cb && !cb.checked) {
          cb.checked = true;
          cb.dispatchEvent(new Event("change", { bubbles: true }));
        }
        return { ok: true };
      },
      {
        formId: MKTO_FORM_ID,
        values: {
          firstNameWebform: truncate(contact.prenom, NAME_MAX_LENGTH),
          lastNameWebform: truncate(contact.nom, NAME_MAX_LENGTH),
          Email: contact.email,
          phoneWebform: contact.telephone || "",
          flgProfiling: "yes",
        },
      }
    );

    if (!fillResult.ok) {
      throw new Error(`Marketo form not found: ${fillResult.reason}`);
    }

    // Hook onSuccess BEFORE submitting; resolve a promise from inside the page.
    const successPromise = page.evaluate((formId) => {
      return new Promise((resolve) => {
        const form = window.MktoForms2.getForm(formId);
        let settled = false;
        form.onSuccess(() => {
          if (!settled) {
            settled = true;
            resolve({ ok: true });
          }
          // Prevent the default thank-you redirect.
          return false;
        });
        // Fallback timeout: 20s.
        setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve({ ok: false, reason: "timeout" });
          }
        }, 20000);
      });
    }, MKTO_FORM_ID);

    // Submit.
    await page.evaluate((formId) => {
      window.MktoForms2.getForm(formId).submit();
    }, MKTO_FORM_ID);

    const result = await successPromise;

    if (result.ok) {
      log(`  ✓ Success: ${label}`);
      await supabase
        .from("msc_newsletter_contacts")
        .update({
          status: "done",
          processed_at: new Date().toISOString(),
          process_details: "OK",
        })
        .eq("id", contact.id);
    } else {
      // Capture Marketo's inline error if any.
      const errorText = await page.evaluate(() => {
        const err = document.querySelector(".mktoError .mktoErrorMsg, .mktoErrorMsg");
        return err?.textContent?.trim() || null;
      });
      const detail = errorText || `No success callback (${result.reason || "unknown"})`;
      log(`  ✗ Failed: ${label} — ${detail}`);
      await supabase
        .from("msc_newsletter_contacts")
        .update({
          status: "error",
          processed_at: new Date().toISOString(),
          process_details: detail.slice(0, 500),
        })
        .eq("id", contact.id);
    }
  } catch (err) {
    log(`  ✗ Error: ${label} — ${err.message}`);
    await supabase
      .from("msc_newsletter_contacts")
      .update({
        status: "error",
        processed_at: new Date().toISOString(),
        process_details: err.message?.slice(0, 500),
      })
      .eq("id", contact.id);
  } finally {
    await page.close();
  }

  await sleep(5000, 10000);
}

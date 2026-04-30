export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
export const TABLE = process.env.SUPABASE_TABLE || "msc_newsletter_contacts";
export const MAX_CONCURRENCY = parseInt(process.env.MAX_CONCURRENCY || "10", 10);

// Marketo "Stand Pop Up" lead-capture form (replaces the old Sitecore newsletter
// form on msccroisieres.fr). Page loads MktoForms2 and renders form 4669.
export const FORM_URL = "https://info.msccruises.com/stand-pop-up.html";
export const MKTO_FORM_ID = 4669;

// firstNameWebform / lastNameWebform are capped at 15 chars by the form definition.
export const NAME_MAX_LENGTH = 15;

export function sleep(min, max) {
  const ms = max ? Math.floor(Math.random() * (max - min + 1)) + min : min;
  return new Promise((r) => setTimeout(r, ms));
}

export function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

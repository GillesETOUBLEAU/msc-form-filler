// ---------------------------------------------------------------------------
// Configuration & helpers
// ---------------------------------------------------------------------------

export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
export const TABLE = process.env.SUPABASE_TABLE || "msc_newsletter_contacts";
export const MAX_CONCURRENCY = parseInt(process.env.MAX_CONCURRENCY || "10", 10);
export const FORM_URL =
  "https://www.msccroisieres.fr/formulaires/inscription-newsletter";

// Sitecore field prefix
const PREFIX = "fxb.110379d3-2410-4d74-ba93-4b3ead5d6945";

// Sitecore GUIDs
export const FIELDS = {
  email: "08cda5b4-dc1b-4859-94e8-efa1ad32084c",
  telephone: "dde96755-aab7-42c4-badb-a6e6170dae4f",
  prenom: "d516be93-60b4-4b11-906b-9ae4e5d661b4",
  nom: "b21dd2c3-98cb-46ce-b119-a5a7e6919d7e",
  date_naissance: "3001ad09-a38f-4a2a-bdba-7f909b258238",
  experience_navigation: "155e5d57-5454-4d31-b3a5-15e45b824b74",
  destination: "5031aa2c-e08a-4e60-b91f-fe1d7b6209a5",
  consent: "65e1f0d7-8dd4-4af3-8b81-818285684520",
};

/** Build the Sitecore input name */
export function fieldName(guid) {
  return `${PREFIX}.${guid}`;
}

/** Build a CSS selector for a Sitecore field */
export function fieldSelector(guid) {
  const escaped = fieldName(guid).replace(/\./g, "\\.");
  return `[name="${escaped}"]`;
}

/** Random delay between min and max ms */
export function sleep(min, max) {
  const ms = max ? Math.floor(Math.random() * (max - min + 1)) + min : min;
  return new Promise((r) => setTimeout(r, ms));
}

export function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

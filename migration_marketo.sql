-- One-shot migration: align production schema with the Marketo "Stand Pop Up" form.
-- The new form drops date_naissance / experience_navigation / destination,
-- and requires a phone number.
-- Run AFTER deploying the new worker (which no longer reads those columns).

ALTER TABLE msc_newsletter_contacts
  DROP COLUMN IF EXISTS date_naissance,
  DROP COLUMN IF EXISTS experience_navigation,
  DROP COLUMN IF EXISTS destination;

-- telephone is now required by the upstream form. Backfill blanks before
-- enforcing NOT NULL, otherwise existing rows with NULL will fail.
UPDATE msc_newsletter_contacts SET telephone = '' WHERE telephone IS NULL;
ALTER TABLE msc_newsletter_contacts ALTER COLUMN telephone SET NOT NULL;

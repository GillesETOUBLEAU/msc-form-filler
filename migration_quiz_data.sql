-- Capture quiz outcomes alongside the lead.
-- The quiz site (WMH-Project/msc-cruise-profile-finder) inserts the contact
-- at form submit, then PATCHes the same row with answers + computed profile
-- once the 5-question quiz finishes. profiling_consent is set on the initial
-- insert from the form's "expérience personnalisée" checkbox.

ALTER TABLE msc_newsletter_contacts
  ADD COLUMN IF NOT EXISTS quiz_answers      JSONB,    -- e.g. ["B","A","D","C","B"]
  ADD COLUMN IF NOT EXISTS profile_letter    TEXT,     -- 'A' | 'B' | 'C' | 'D'
  ADD COLUMN IF NOT EXISTS profiling_consent BOOLEAN;

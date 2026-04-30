-- MSC Newsletter Contacts (initial schema, post-Marketo migration)
-- Run this in Supabase SQL Editor for a fresh project.

CREATE TABLE msc_newsletter_contacts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT now(),
  email           TEXT NOT NULL,
  prenom          TEXT NOT NULL,
  nom             TEXT NOT NULL,
  telephone       TEXT NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
  processed_at    TIMESTAMPTZ,
  process_details TEXT
);

CREATE INDEX idx_msc_newsletter_status ON msc_newsletter_contacts (status)
  WHERE status = 'pending';

-- MSC Newsletter Contacts
-- Run this in Supabase SQL Editor

CREATE TABLE msc_newsletter_contacts (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at            TIMESTAMPTZ DEFAULT now(),
  email                 TEXT NOT NULL,
  prenom                TEXT NOT NULL,
  nom                   TEXT NOT NULL,
  telephone             TEXT,
  date_naissance        TEXT,           -- JJ/MM/AAAA
  experience_navigation TEXT,           -- '1','2','3','4'
  destination           TEXT,           -- valeur exacte du select
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
  processed_at          TIMESTAMPTZ,
  process_details       TEXT
);

-- Index for the worker to pick up pending contacts quickly
CREATE INDEX idx_msc_newsletter_status ON msc_newsletter_contacts (status)
  WHERE status = 'pending';

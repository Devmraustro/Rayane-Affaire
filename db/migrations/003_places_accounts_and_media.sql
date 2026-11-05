-- Add editorial places, explicit location verification, account security
-- preferences and password-reset storage. This migration is additive except for
-- rebuilding media's entity-type CHECK, which SQLite cannot alter in place.

-- The additive admin_users columns are installed by applySchema's idempotent
-- column guard before this file runs (SQLite has no ADD COLUMN IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TEXT NOT NULL,
  used_at      TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_exp  ON password_reset_tokens(expires_at);

CREATE TABLE IF NOT EXISTS places (
  id                   TEXT PRIMARY KEY,
  slug                 TEXT NOT NULL UNIQUE,
  reference            TEXT NOT NULL UNIQUE,
  name_fr              TEXT NOT NULL,
  name_ar              TEXT NOT NULL,
  description_fr       TEXT NOT NULL DEFAULT '',
  description_ar       TEXT NOT NULL DEFAULT '',
  address_fr           TEXT NOT NULL DEFAULT '',
  address_ar           TEXT NOT NULL DEFAULT '',
  commune_id           TEXT NOT NULL REFERENCES communes(id) ON DELETE RESTRICT,
  category             TEXT NOT NULL CHECK (category IN
                         ('landmark','restaurant','cafe','hotel','shopping','service','culture','nature','beach','other')),
  lat                  REAL,
  lng                  REAL,
  coordinate_precision TEXT NOT NULL DEFAULT 'pending'
                         CHECK (coordinate_precision IN ('exact','approximate','pending')),
  location_status      TEXT NOT NULL DEFAULT 'missing'
                         CHECK (location_status IN ('missing','unverified','verified')),
  verified_by          TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  verified_at          TEXT,
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','published','archived')),
  is_demo              INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  published_at         TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  CHECK ((lat IS NULL AND lng IS NULL) OR
         (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)),
  CHECK ((location_status = 'missing' AND lat IS NULL AND lng IS NULL AND coordinate_precision = 'pending') OR
         (location_status IN ('unverified','verified') AND lat IS NOT NULL AND lng IS NOT NULL AND coordinate_precision IN ('exact','approximate'))),
  CHECK (location_status <> 'verified' OR verified_at IS NOT NULL),
  CHECK (status <> 'published' OR (name_fr <> '' AND name_ar <> ''))
);
CREATE INDEX IF NOT EXISTS idx_places_public   ON places(status, is_demo, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_places_commune  ON places(commune_id);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_geo      ON places(location_status, lat, lng);

CREATE TABLE media_migrated (
  id           TEXT PRIMARY KEY,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('property','vehicle','place')),
  entity_id    TEXT NOT NULL,
  url          TEXT NOT NULL,
  alt_fr       TEXT NOT NULL DEFAULT '',
  alt_ar       TEXT NOT NULL DEFAULT '',
  width        INTEGER,
  height       INTEGER,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  credit       TEXT,
  source_url   TEXT,
  license      TEXT,
  created_at   TEXT NOT NULL
);
INSERT INTO media_migrated SELECT * FROM media;
DROP TABLE media;
ALTER TABLE media_migrated RENAME TO media;
CREATE INDEX IF NOT EXISTS idx_media_entity ON media(entity_type, entity_id, sort_order);

-- ============================================================================
-- RAYANE AFFAIRE — relational schema (SQLite dialect, portable to PostgreSQL)
-- ============================================================================
-- Conventions
--   * All timestamps are ISO-8601 UTC strings (`YYYY-MM-DDTHH:MM:SS.sssZ`).
--   * Money is stored as INTEGER DZD (no floats — Algerian dinar has no cents
--     in practice and floats would corrupt totals).
--   * Bilingual content uses `<field>_fr` / `<field>_ar` column pairs.
--   * Every listing carries `is_demo` so demonstration rows can never be
--     mistaken for real client inventory (and are excluded from statistics).
--   * Foreign keys are enforced (`PRAGMA foreign_keys = ON`, set per connection).
-- ============================================================================

CREATE TABLE IF NOT EXISTS communes (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  name_fr          TEXT NOT NULL,
  name_ar          TEXT NOT NULL,
  wilaya_fr        TEXT NOT NULL,
  wilaya_ar        TEXT NOT NULL,
  wilaya_code      TEXT NOT NULL,
  lat              REAL NOT NULL,
  lng              REAL NOT NULL,
  default_zoom     INTEGER NOT NULL DEFAULT 13,
  -- Provenance of the centroid. `osm_relation_id` makes every coordinate
  -- auditable; `source` records how it was obtained.
  osm_relation_id  TEXT,
  source           TEXT NOT NULL DEFAULT 'osm-nominatim',
  active           INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS properties (
  id                   TEXT PRIMARY KEY,
  slug                 TEXT NOT NULL UNIQUE,
  reference            TEXT NOT NULL UNIQUE,
  title_fr             TEXT NOT NULL,
  title_ar             TEXT NOT NULL,
  description_fr       TEXT NOT NULL DEFAULT '',
  description_ar       TEXT NOT NULL DEFAULT '',
  category             TEXT NOT NULL CHECK (category IN
                         ('apartment','studio','villa','house','commercial','land','office')),
  transaction_type     TEXT NOT NULL CHECK (transaction_type IN
                         ('rent_annual','rent_short','sale','exchange')),
  price                INTEGER NOT NULL CHECK (price >= 0),
  price_unit           TEXT NOT NULL CHECK (price_unit IN ('month','night','total')),
  currency             TEXT NOT NULL DEFAULT 'DZD' CHECK (currency = 'DZD'),
  commune_id           TEXT NOT NULL REFERENCES communes(id) ON DELETE RESTRICT,
  address_fr           TEXT NOT NULL DEFAULT '',
  address_ar           TEXT NOT NULL DEFAULT '',
  lat                  REAL,
  lng                  REAL,
  coordinate_precision TEXT NOT NULL DEFAULT 'pending'
                         CHECK (coordinate_precision IN ('exact','approximate','commune','pending')),
  surface              INTEGER NOT NULL DEFAULT 0 CHECK (surface >= 0),
  bedrooms             INTEGER NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
  bathrooms            INTEGER NOT NULL DEFAULT 0 CHECK (bathrooms >= 0),
  floor                INTEGER,
  furnishing           TEXT NOT NULL DEFAULT 'unfurnished'
                         CHECK (furnishing IN ('furnished','unfurnished','semi_furnished')),
  amenities            TEXT NOT NULL DEFAULT '[]',
  availability_status  TEXT NOT NULL DEFAULT 'available'
                         CHECK (availability_status IN ('available','reserved','unavailable')),
  available_from       TEXT,
  featured             INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  video_url            TEXT,
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','published','archived')),
  is_demo              INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  published_at         TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  -- A record can only be published if it has enough content to be useful AND
  -- its position has been assessed (pending coordinates are allowed but then
  -- the listing is excluded from the public map).
  CHECK (status <> 'published' OR (title_fr <> '' AND title_ar <> '' AND price > 0)),
  CHECK ((lat IS NULL AND lng IS NULL) OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)),
  CHECK (coordinate_precision <> 'pending' OR (lat IS NULL AND lng IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_properties_status      ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_public      ON properties(status, is_demo, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_commune     ON properties(commune_id);
CREATE INDEX IF NOT EXISTS idx_properties_transaction ON properties(transaction_type);
CREATE INDEX IF NOT EXISTS idx_properties_category    ON properties(category);
CREATE INDEX IF NOT EXISTS idx_properties_price       ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_geo         ON properties(lat, lng);

CREATE TABLE IF NOT EXISTS vehicles (
  id                   TEXT PRIMARY KEY,
  slug                 TEXT NOT NULL UNIQUE,
  reference            TEXT NOT NULL UNIQUE,
  title_fr             TEXT NOT NULL,
  title_ar             TEXT NOT NULL,
  description_fr       TEXT NOT NULL DEFAULT '',
  description_ar       TEXT NOT NULL DEFAULT '',
  brand                TEXT NOT NULL,
  model                TEXT NOT NULL,
  year                 INTEGER NOT NULL CHECK (year BETWEEN 1950 AND 2100),
  category             TEXT NOT NULL CHECK (category IN
                         ('economy','sedan','suv','luxury','utility','van')),
  transmission         TEXT NOT NULL CHECK (transmission IN ('manual','automatic')),
  fuel                 TEXT NOT NULL CHECK (fuel IN ('petrol','diesel','hybrid','electric','lpg')),
  seats                INTEGER NOT NULL DEFAULT 5 CHECK (seats BETWEEN 1 AND 30),
  doors                INTEGER NOT NULL DEFAULT 5 CHECK (doors BETWEEN 2 AND 6),
  deal_type            TEXT NOT NULL CHECK (deal_type IN ('rent','sale','both')),
  daily_price          INTEGER CHECK (daily_price IS NULL OR daily_price >= 0),
  sale_price           INTEGER CHECK (sale_price IS NULL OR sale_price >= 0),
  currency             TEXT NOT NULL DEFAULT 'DZD' CHECK (currency = 'DZD'),
  commune_id           TEXT NOT NULL REFERENCES communes(id) ON DELETE RESTRICT,
  lat                  REAL,
  lng                  REAL,
  coordinate_precision TEXT NOT NULL DEFAULT 'pending'
                         CHECK (coordinate_precision IN ('exact','approximate','commune','pending')),
  mileage_km           INTEGER CHECK (mileage_km IS NULL OR mileage_km >= 0),
  features             TEXT NOT NULL DEFAULT '[]',
  availability_status  TEXT NOT NULL DEFAULT 'available'
                         CHECK (availability_status IN ('available','reserved','unavailable')),
  featured             INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','published','archived')),
  is_demo              INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  published_at         TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  CHECK (deal_type <> 'rent' OR daily_price IS NOT NULL),
  CHECK (deal_type <> 'sale' OR sale_price IS NOT NULL),
  CHECK (deal_type <> 'both' OR (daily_price IS NOT NULL AND sale_price IS NOT NULL)),
  CHECK (status <> 'published' OR (title_fr <> '' AND title_ar <> '')),
  CHECK ((lat IS NULL AND lng IS NULL) OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180))
);

CREATE INDEX IF NOT EXISTS idx_vehicles_status   ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_public   ON vehicles(status, is_demo, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_commune  ON vehicles(commune_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category);
CREATE INDEX IF NOT EXISTS idx_vehicles_dealtype ON vehicles(deal_type);

-- One media table for both listing kinds: keeps galleries, ordering and
-- attribution identical to render, and avoids two near-identical schemas.
CREATE TABLE IF NOT EXISTS media (
  id           TEXT PRIMARY KEY,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('property','vehicle')),
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

CREATE INDEX IF NOT EXISTS idx_media_entity ON media(entity_type, entity_id, sort_order);

CREATE TABLE IF NOT EXISTS customers (
  id         TEXT PRIMARY KEY,
  full_name  TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT,
  type       TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual','company')),
  notes      TEXT,
  tags       TEXT NOT NULL DEFAULT '[]',
  is_demo    INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE TABLE IF NOT EXISTS inquiries (
  id                   TEXT PRIMARY KEY,
  locale               TEXT NOT NULL DEFAULT 'fr' CHECK (locale IN ('fr','ar')),
  type                 TEXT NOT NULL CHECK (type IN ('property','vehicle','general','reservation')),
  status               TEXT NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new','contacted','qualified','won','lost','spam')),
  full_name            TEXT NOT NULL,
  phone                TEXT NOT NULL,
  email                TEXT,
  message              TEXT NOT NULL,
  property_id          TEXT REFERENCES properties(id) ON DELETE SET NULL,
  vehicle_id           TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  preferred_channel    TEXT NOT NULL DEFAULT 'phone'
                         CHECK (preferred_channel IN ('phone','whatsapp','email')),
  preferred_date       TEXT,
  source_ip_hash       TEXT,
  user_agent           TEXT,
  admin_notes          TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status  ON inquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);

CREATE TABLE IF NOT EXISTS reservations (
  id             TEXT PRIMARY KEY,
  reference      TEXT NOT NULL UNIQUE,
  kind           TEXT NOT NULL CHECK (kind IN ('property','vehicle')),
  property_id    TEXT REFERENCES properties(id) ON DELETE SET NULL,
  vehicle_id     TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  customer_id    TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  item_title_fr  TEXT NOT NULL DEFAULT '',
  item_title_ar  TEXT NOT NULL DEFAULT '',
  item_reference TEXT NOT NULL DEFAULT '',
  start_date     TEXT NOT NULL,
  end_date       TEXT NOT NULL,
  amount         INTEGER NOT NULL DEFAULT 0 CHECK (amount >= 0),
  deposit        INTEGER NOT NULL DEFAULT 0 CHECK (deposit >= 0),
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','active','completed','cancelled')),
  notes          TEXT,
  is_demo        INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  CHECK (end_date >= start_date),
  CHECK ((kind = 'property' AND property_id IS NOT NULL) OR
         (kind = 'vehicle'  AND vehicle_id  IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_reservations_dates  ON reservations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_demo   ON reservations(is_demo);

CREATE TABLE IF NOT EXISTS admin_users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','manager','editor')),
  active         INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  last_login_at  TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

-- Server-side sessions: the cookie carries a random token, the database stores
-- only its SHA-256 hash, so a database leak cannot be replayed as a session.
CREATE TABLE IF NOT EXISTS admin_sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  csrf_token   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  ip_hash      TEXT,
  user_agent   TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exp  ON admin_sessions(expires_at);

-- Durable rate limiting that survives restarts and works across instances.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket       TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

-- Lightweight audit trail for privileged operations.
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT,
  actor_email TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  detail      TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- Business settings editable from the admin UI (single-row key/value store).
-- Only non-secret operational values belong here.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

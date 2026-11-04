-- ===========================================================================
-- 002 — public visibility of the vehicle section
-- ===========================================================================
-- The client has decided that vehicles are NOT part of the public offer. They
-- continue to be managed in the back-office, and the whole public section can be
-- restored by flipping this one flag — no data recovery, no schema change.
--
-- This migration is deliberately additive: it inserts a row into `settings` and
-- touches nothing else. No vehicle record is deleted, no column is dropped, and
-- no existing relationship is modified. Hiding is a read-time projection.
--
-- ON CONFLICT DO NOTHING keeps re-runs harmless and guarantees that an operator's
-- explicit choice is never overwritten by a later migration.
--
-- Note the value: 'false' is a *deliberate* default here, unlike migration 001.
-- An existing deployment that upgrades picks up the client's decision
-- automatically, which is the whole point of shipping it as a migration rather
-- than as a code default.
-- ===========================================================================

INSERT INTO settings (key, value, updated_at)
VALUES ('vehicle_public_visible', 'false', '2026-11-04T00:00:00.000Z')
ON CONFLICT (key) DO NOTHING;

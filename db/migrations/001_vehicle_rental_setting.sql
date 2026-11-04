-- ===========================================================================
-- 001 — vehicle rental visibility setting
-- ===========================================================================
-- Records the agency's answer to "do you actually offer vehicle rental
-- (own fleet or a partner)?". Until the agency answers, the value stays 'true'
-- so the public site keeps behaving exactly as it did before this setting
-- existed. An operator turns it off from /admin/settings once the answer is
-- known to be "no".
--
-- The row is inserted with ON CONFLICT DO NOTHING so re-running is harmless and
-- an operator's saved choice is never overwritten by a later migration.
-- ===========================================================================

INSERT INTO settings (key, value, updated_at)
VALUES ('vehicle_rental_enabled', 'true', '2026-11-03T00:00:00.000Z')
ON CONFLICT (key) DO NOTHING;

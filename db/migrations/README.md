# Versioned migrations

`db/schema.sql` is the idempotent baseline applied on every boot. Anything that
cannot be expressed with `CREATE ... IF NOT EXISTS` (column additions,
backfills, constraint changes) goes here as a numbered file:

```
db/migrations/001_add_property_energy_class.sql
db/migrations/002_backfill_slug_arabic.sql
```

Rules:

1. **Never edit an applied migration.** Add the next number instead.
2. **Never drop a column or table** that holds client data without a two-step
   expand/contract migration and a documented backup.
3. Every migration is wrapped in a transaction by `db/migrate.ts` and recorded in
   `schema_migrations`; a failure rolls back the whole file.
4. SQL must stay portable to PostgreSQL 15+ (no SQLite-only pragmas here).

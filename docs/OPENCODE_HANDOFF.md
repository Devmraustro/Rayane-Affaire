# Handoff — remaining work

This document lists **only what is still open**. Anything described as delivered
in `README.md`, `docs/IMPLEMENTATION_REPORT.md`, `docs/TESTING_REPORT.md` and
`docs/FINAL_REPORT.md` is finished and verified — do not redo it.

Every task carries what it needs, where it lives, and how its completion will be
recognised. There is no "finish testing" style item: an item that cannot be
checked has no place here.

**Repository state at the time of writing**

| Item | Value |
| --- | --- |
| Branch | `arena/c6e4a623-rayane-affaire` |
| Base | `main` @ `8f8a982` |
| Pull request | #1 — **open**, not merged, not deployed |
| Database | No database is committed. Fresh migration: 11 communes, 0 properties, 0 vehicles, 0 admins. |
| Vehicle policy | New installations default to **hidden** (`vehicle_public_visible = 'false'`). |

Reproduce the quality gate and the two HTTP policy states as documented in
`docs/TESTING_REPORT.md` §5. The smoke test uses a throwaway migrated database;
never point it at data that must be kept.

Latest local result at this revision: typecheck 0 errors · lint clean · **215
tests passing in 9 files** · build succeeds · smoke **17/17** in both hidden and
public states. Separately, GitHub Actions push run `41883710180` and pull-request
run `41883722087` both passed on commit `59649d7` on 4 November 2026 (quality/build
and dependency-audit jobs). For any later push, verify the latest head's checks
rather than inferring CI status from these earlier runs. No deployment was run.

---

## Bloc A — Doable in the repository right now

No external input required.

### A1. End-to-end tests in a real browser

- No E2E suite exists. `npx playwright install chromium` fails in the current
  environment (no browser download), so this is **not** done and must not be
  claimed.
- Target coverage: FR→AR switch and RTL direction, public contact flow, admin
  login, listing creation with photo upload, publication, map display, absence of
  horizontal overflow at 360 px / tablet / desktop.
- Files to add: `tests/e2e/*.spec.ts`, `playwright.config.ts`; add an `e2e` job to
  `.github/workflows/ci.yml` once the browser can be installed on the runner.

### A2. Photo orientation after metadata stripping

The uploader now strips **all** embedded metadata, including the EXIF
orientation tag (`lib/server/image-sanitize.ts`). Consequence, stated plainly: a
portrait photo taken with the phone rotated is stored with its raw pixel order,
so browsers will not rotate it and it may display sideways.

- Today's mitigation is procedural: re-orient before upload.
- Proper fix: bake orientation into pixels at upload time. This needs a decoder
  (`sharp` or `@napi-rs/canvas`) and therefore a deliberate dependency decision,
  plus a migration path for already-stored files.
- Acceptance: uploading a portrait phone photo yields a correctly oriented
  stored image, and a test proves it.

### A3. Admin user management UI

The model (`admin_users`, roles `owner`/`manager`/`editor`) and the authorisation
matrix exist; **no page exists** to create, deactivate or re-role an account.

- Build in `app/admin/users/` + `app/api/admin/users/*`:
  - account list (owner only);
  - creation (generated password shown once, never mailed);
  - deactivation (must revoke sessions immediately);
  - role change, forbidding an owner from removing their own `owner` role.
- Acceptance: an owner creates an editor, the editor cannot reach settings, and
  deactivation invalidates an active session (test in `tests/api.test.ts`).

### A4. Back-office ergonomics

- Reservations: no creation UI (model and reads exist, writes are not exposed).
- Calendar: month view only; add a week/list view.
- Media: no drag-and-drop reordering (order is stored in the database, the UI
  does not expose it).

### A5. Test coverage gaps

Covered today (215 tests, 9 files): the central vehicle visibility policy
(`tests/vehicle-rental-setting.test.ts`, 52 tests), image metadata stripping
(`tests/image-sanitize.test.ts`, 22 tests), upload sniffing and refusals
(`tests/security.test.ts`), `PATCH /api/admin/settings` including its role and
CSRF rules (`tests/api.test.ts`), database integrity and statistics scoping
(`tests/database.test.ts`).

- Not covered: `lib/db/reservations`, `lib/db/customers`, `DELETE
  /api/admin/media`, the commune reference data, and any component rendering (no
  DOM environment in Vitest).
- Acceptance: each named module gains at least one behavioural test that fails
  when the behaviour is removed.

### A6. Accessibility

- Add an automated axe-core pass once A1 exists.
- Manually verify the Radix modal focus trap and the tab order in RTL.
- Acceptance: zero serious axe violations on `/`, `/properties`, `/contact`,
  `/admin/login`, in both languages.

### A7. Configuration cleanup

- `next.config.mjs`: `serverExternalPackages: []` is empty and useless — remove or
  justify.
- Migrate `npm run lint` from `next lint` to the ESLint CLI before Next.js 16
  removes the deprecated command. The present lint run is clean; this is a
  toolchain warning, not a lint failure.
- Resolve the non-blocking Vitest 5.1/Vite warning for `vitest.config.ts` before
  a future major changes the native config loader default.
- Confirm `NEXT_PUBLIC_HERO_IMAGE` is documented in `docs/DEPLOYMENT_GUIDE.md`
  (it is consumed by `components/home/hero.tsx`).

### A8. Next 16 major upgrade

- The remaining high advisory (see `docs/SECURITY_AUDIT.md` §10) is only
  removable by upgrading Next from 15 to 16, which currently ships
  `postcss@8.4.31` internally. The earlier critical Vitest/tinypool advisories
  were cleared by upgrading Vitest to 5.1.0.
- The exception in `.github/audit-exceptions.json` **expires on 2027-03-31**;
  after that date CI fails until this is done or the exception is re-reviewed.
- Acceptance: `npm audit` across the complete dependency tree reports no
  high/critical advisory, the exception file no longer lists `postcss`, and the
  full gate passes.

---

## Bloc B — Needs information from the client

Without these, no credible business content can be published. **Never invent a
substitute value.**

### B1. Professional contact details

To obtain and place in the `NEXT_PUBLIC_*` variables (see
`docs/ENVIRONMENT_VARIABLES.md`):

- WhatsApp number (international, no `+`, e.g. `213XXXXXXXXX`);
- displayed phone number — **currently supplied only as a screenshot and not
  verifiable from this repository; the digits must be confirmed in writing
  before they are published.** Do not transcribe them from an image by guesswork;
- contact e-mail address (none is published today, by design);
- office postal address (optional — the address block is omitted when empty);
- social profiles (optional; TikTok `@rayane_affaire` is the only one referenced);
- real opening hours (`contact.hoursValue` in the dictionaries is a generic
  default and needs confirmation).

### B2. Real inventory

Per property: FR and AR title, category, transaction, price and unit, commune,
district, surface, rooms, bathrooms, furnishing, features, availability, **GPS
coordinates with a declared precision** (`exact`, `approximate` or `commune` —
`pending` when unknown), photos.

Per vehicle (admin only for now): make, model, year, category, fuel, gearbox,
seats, daily rate and/or sale price, commune, mileage, photos.

**Never enter a "centre of the commune" coordinate to make a marker appear.** If
the position is unknown, choose `pending` — the database rejects coordinates with
`pending`.

The optional demo seed has 6 properties — 2 with `commune` precision, 2
`approximate`, **2 with `pending` and no coordinates**. The database is not
committed; on a fresh checkout, only the 11 commune references are seeded. The
42 missing communes remain to be confirmed/added from OpenStreetMap relations
(`source='osm-nominatim'`), and real listing coordinates require client input.

### B3. Photographs

- Client-supplied photos (rights confirmed in writing) **or** freely licensed
  photos with exact author and licence.
- Per photo: FR and AR alt text, credit, licence, optional source URL.
- Note: uploads are re-encoded only at the metadata level, so images must arrive
  already oriented (see A2).

### B4. Identity and editorial content

- Confirm the exact name, logo and palette (today: "RAYANE AFFAIRE", gold/sand/
  ink).
- Approve the `/about` copy, the services list and their descriptions.
- **Confirm the founding year.** The year 2024 is *not* confirmed and must not be
  published as fact; `BRAND.establishedYear` is configuration, not a verified
  claim.
- Approve opening hours, displayed languages and the privacy policy.

### B5. Geographic scope

- Confirm the covered area is Béjaïa and surroundings, and **which communes** must
  appear in the reference data (11 of 53 present).
- Supply OSM centroids for the missing communes (same method as `db/communes.ts`:
  an OpenStreetMap relation, never an estimate).

### B6. Visual reference

- **The four reference screenshots announced as a visual target were never
  supplied.** Provide them if pixel-level parity is expected. Until then the
  interface follows its own identity and no pixel parity is claimed.

---

## Bloc C — Needs production environment access

### C1. Hosting and domain

- Choose a host **with a persistent disk** (see `docs/DEPLOYMENT_GUIDE.md` §1:
  Vercel/Netlify do not fit without migrating to PostgreSQL plus object storage).
- Reserve the domain, configure DNS, obtain the TLS certificate.

### C2. Deployment and secrets

- Generate a 48-byte `SESSION_SECRET` **different** from development.
- Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS URL **before** the build (these
  values are frozen at compile time).
- Create the production owner account with a strong password.
- Run `npm run smoke -- https://<domain>` and record the result.

### C3. Backups and monitoring

- Daily backup (database + uploads) and **a tested restore** before opening.
- HTTP monitoring and a disk-space alert; log rotation.

### C4. Notification delivery

No e-mail service is configured: a new enquiry stays silent until an
administrator opens `/admin/inquiries`. Choose a provider (SMTP or API), add the
environment variables and send on creation. **Not implemented.**

### C5. External audit

A penetration test and a server configuration review are recommended before
launch. Neither has been performed (residual risks are in
`docs/SECURITY_AUDIT.md`).

---

## Bloc D — Needs explicit client verification

To be confirmed in writing before the site is called finished.

### D1. Accuracy of published data

- Every listing, price and coordinate confirmed by the agency.
- At minimum, spot-check map positions against the field.
- Confirm the declared precision level for each listing.

### D2. Image rights

- Written confirmation that the agency holds the rights to every published photo
  and that the recorded credits and licences are exact.

### D3. Bilingual content

- Native-speaker review of the Arabic copy (currently functional, must be
  approved by the agency).
- RTL rendering on the devices the clientele actually use (low-end Android in
  particular).
- Confirmation that business vocabulary matches local usage.

### D4. Compliance and legal notices

- Approve the privacy policy and the enquiry retention period.
- Confirm the legal notices to display (registration, tax identifiers).
- Confirm the consent capture in the forms is sufficient for the applicable law.

### D5. Final functional validation

- The agency walks the whole journey itself: login, create a listing with photos,
  publish, receive an enquiry, reply.
- Confirm the dashboard matches how the agency actually follows its activity.

---

## Rules to keep

1. **Invent nothing**: no listing, price, coordinate, client, review, statistic or
   phone number.
2. **Always declare geographic precision**; `pending` when unknown.
3. **Do not disable a test or reduce coverage** to make a suite pass.
4. **Do not claim** a deployment, a push or a test that was not actually executed
   and verified. In particular: CI has run only if `gh run list` shows it.
5. **Commit no secret**; `SESSION_SECRET` and `.env.local` stay out of the
   repository.
6. **Do not modify an applied migration**; add a new one.
7. **Keep vehicle hiding central.** New code that reads vehicles for the public
   must go through `getVehicleVisibility()`; a direct `SELECT` in a component is a
   defect even if the section is currently visible.
8. **Never narrow an audit exception** without the reason and expiry date that
   justify it.

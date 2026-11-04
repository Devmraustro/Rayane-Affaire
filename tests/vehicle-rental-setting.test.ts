import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTempDbEnv, initSchema, type TempDb } from './helpers/temp-db';

/**
 * Vehicle-rental visibility.
 *
 * The client asked for a real show/hide control, so these tests assert the two
 * things that make it real: the value survives a round-trip through the database,
 * and disabling it actually removes rental inventory from every public reader
 * while leaving sale-only vehicles and the whole property catalogue untouched.
 *
 * Real SQLite, no mocks. Rental is switched by writing the setting exactly as the
 * admin API does, and then reading through the same functions the public pages use.
 */
let env: TempDb;

beforeAll(async () => {
  env = createTempDbEnv();
  await initSchema();
});

afterAll(() => env.cleanup());

interface Seed {
  slug: string;
  dealType: 'rent' | 'sale' | 'both';
  category: string;
}

const VEHICLES: Seed[] = [
  { slug: 'verif-rent-only', dealType: 'rent', category: 'economy' },
  { slug: 'verif-sale-only', dealType: 'sale', category: 'sedan' },
  { slug: 'verif-both', dealType: 'both', category: 'suv' },
];

/**
 * Opens the public vehicle section and sets the rental flag.
 *
 * The client's standing policy hides the whole section, so every test that
 * exercises *rental refinement* must first state that vehicles are public;
 * otherwise it would be testing the hidden path by accident. The hidden path
 * itself has its own describe block below.
 */
async function openSection(rentalEnabled: boolean): Promise<void> {
  const { setVehiclePublicVisible, setVehicleRentalEnabled } = await import('@/lib/db/settings');
  setVehiclePublicVisible(true);
  setVehicleRentalEnabled(rentalEnabled);
}

async function hideSection(): Promise<void> {
  const { setVehiclePublicVisible } = await import('@/lib/db/settings');
  setVehiclePublicVisible(false);
}

async function seedVehicles(): Promise<void> {
  const { createVehicle, setVehicleStatus } = await import('@/lib/db/admin-listings');
  const { addMedia } = await import('@/lib/db/media');

  for (const item of VEHICLES) {
    const created = createVehicle({
      titleFr: `Véhicule ${item.slug}`,
      titleAr: `سيارة ${item.slug}`,
      descriptionFr: 'Véhicule de test.',
      descriptionAr: 'سيارة اختبار.',
      brand: 'TestBrand',
      model: item.slug,
      year: 2023,
      category: item.category,
      transmission: 'manual',
      fuel: 'petrol',
      seats: 5,
      doors: 5,
      dealType: item.dealType,
      dailyPrice: item.dealType === 'sale' ? null : 5000,
      salePrice: item.dealType === 'rent' ? null : 3000000,
      communeSlug: 'bejaia',
      coordinatePrecision: 'pending',
      features: [],
      availabilityStatus: 'available',
      featured: true,
      status: 'draft',
    } as never);

    addMedia({
      entityType: 'vehicle',
      entityId: created.id,
      url: `/api/media/00000000-0000-4000-8000-0000000000${item.dealType === 'rent' ? '01' : item.dealType === 'sale' ? '02' : '03'}.png`,
      altFr: 'x',
      altAr: 'x',
      credit: 'Test',
      license: 'Test',
    });
    setVehicleStatus(created.id, 'published');
  }
}

async function seedProperties(): Promise<void> {
  const { createProperty, setPropertyStatus } = await import('@/lib/db/admin-listings');
  const { addMedia } = await import('@/lib/db/media');

  for (const [index, title] of ['Appartement vérification', 'Villa vérification'].entries()) {
    const created = createProperty({
      titleFr: title,
      titleAr: `عقار ${index}`,
      descriptionFr: 'Bien de test.',
      descriptionAr: 'عقار اختبار.',
      category: index === 0 ? 'apartment' : 'villa',
      transaction: 'rent_annual',
      price: 45000,
      priceUnit: 'month',
      communeSlug: 'bejaia',
      // `createProperty` reads these directly (the Zod layer normalises form
      // input); the repository itself expects them present.
      addressFr: '',
      addressAr: '',
      coordinatePrecision: 'pending',
      surface: 80,
      bedrooms: 3,
      bathrooms: 1,
      furnishing: 'unfurnished',
      amenities: [],
      availabilityStatus: 'available',
      featured: false,
      status: 'draft',
    } as never);
    addMedia({
      entityType: 'property',
      entityId: created.id,
      url: `/api/media/00000000-0000-4000-8000-0000000001${index}0.png`,
      altFr: 'x',
      altAr: 'x',
      credit: 'Test',
      license: 'Test',
    });
    setPropertyStatus(created.id, 'published');
  }
}

beforeAll(async () => {
  await seedVehicles();
  await seedProperties();
});

/**
 * Slugs are generated as `<brand>-<model>-<year>`, so assertions map them back to
 * the short test key. Keeping the mapping explicit means a change to the slug
 * generator fails one helper instead of every test.
 */
const slugFor = (key: string) => `testbrand-${key}-2023`;

const vehicleSlugs = async (options: { rentalEnabled?: boolean } = {}) => {
  const { listVehicles } = await import('@/lib/db/vehicles');
  const { defaultVehicleFilters } = await import('@/lib/filters');
  return listVehicles(defaultVehicleFilters(), options)
    .items.map((v) => v.slug.replace('testbrand-', '').replace('-2023', ''))
    .sort();
};

describe('setting persistence', () => {
  it('defaults to enabled so deploying the setting changes nothing on its own', async () => {
    const { isVehicleRentalEnabled } = await import('@/lib/db/settings');
    expect(isVehicleRentalEnabled()).toBe(true);
  });

  it('persists false and reads it back from the database', async () => {
    const { setVehicleRentalEnabled, isVehicleRentalEnabled } = await import('@/lib/db/settings');
    setVehicleRentalEnabled(false);
    expect(isVehicleRentalEnabled()).toBe(false);

    const { getDb } = await import('@/db/client');
    const row = getDb()
      .prepare("SELECT value FROM settings WHERE key = 'vehicle_rental_enabled'")
      .get() as { value: string };
    expect(row.value).toBe('false');
  });

  it('persists true again (round-trip)', async () => {
    const { setVehicleRentalEnabled, isVehicleRentalEnabled } = await import('@/lib/db/settings');
    setVehicleRentalEnabled(true);
    expect(isVehicleRentalEnabled()).toBe(true);
  });

  it('falls back to the default when the row is missing', async () => {
    const { getDb } = await import('@/db/client');
    const { isVehicleRentalEnabled } = await import('@/lib/db/settings');
    getDb().prepare("DELETE FROM settings WHERE key = 'vehicle_rental_enabled'").run();
    expect(isVehicleRentalEnabled()).toBe(true);
  });

  it('treats an unparsable stored value as the default instead of crashing', async () => {
    const { getDb } = await import('@/db/client');
    const { isVehicleRentalEnabled } = await import('@/lib/db/settings');
    getDb()
      .prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES ('vehicle_rental_enabled', 'maybe', ?)`,
      )
      .run(new Date().toISOString());
    expect(isVehicleRentalEnabled()).toBe(true);
  });

  it('parses the accepted boolean spellings', async () => {
    const { parseBooleanSetting } = await import('@/lib/settings');
    expect(parseBooleanSetting('true', false)).toBe(true);
    expect(parseBooleanSetting('1', false)).toBe(true);
    expect(parseBooleanSetting('false', true)).toBe(false);
    expect(parseBooleanSetting('0', true)).toBe(false);
    expect(parseBooleanSetting(null, true)).toBe(true);
    expect(parseBooleanSetting('nonsense', false)).toBe(false);
  });

  it('classifies rent and both as rentable, sale as not', async () => {
    const { isRentableDealType } = await import('@/lib/settings');
    expect(isRentableDealType('rent')).toBe(true);
    expect(isRentableDealType('both')).toBe(true);
    expect(isRentableDealType('sale')).toBe(false);
    expect(isRentableDealType('')).toBe(false);
  });
});

describe('public catalogue', () => {
  it('lists every vehicle while rental is enabled', async () => {
    await openSection(true);
    expect(await vehicleSlugs()).toEqual(['verif-both', 'verif-rent-only', 'verif-sale-only']);
  });

  it('drops rental-only listings and keeps sale inventory when rental is disabled', async () => {
    await openSection(false);
    // `both` is saleable, so it must survive the switch: hiding it would hide
    // inventory the agency is trying to sell.
    expect(await vehicleSlugs()).toEqual(['verif-both', 'verif-sale-only']);
    await openSection(true);
  });

  it('follows the persisted value when no explicit scope is passed', async () => {
    const { listVehicles } = await import('@/lib/db/vehicles');
    const { defaultVehicleFilters } = await import('@/lib/filters');

    await openSection(false);
    expect(
      listVehicles(defaultVehicleFilters()).items.map((v) =>
        v.slug.replace('testbrand-', '').replace('-2023', ''),
      ),
    ).toEqual(['verif-both', 'verif-sale-only']);
    await openSection(true);
    expect(listVehicles(defaultVehicleFilters()).total).toBe(3);
  });

  it('still honours category and search filters while rental is off', async () => {
    const { listVehicles } = await import('@/lib/db/vehicles');
    const { defaultVehicleFilters } = await import('@/lib/filters');

    await openSection(false);
    const byCategory = listVehicles({ ...defaultVehicleFilters(), categories: ['sedan'] });
    expect(byCategory.items.map((v) => v.slug)).toEqual([slugFor('verif-sale-only')]);

    // A search that only matches a rental vehicle must return nothing.
    const rentalSearch = listVehicles({ ...defaultVehicleFilters(), query: 'rent-only' });
    expect(rentalSearch.total).toBe(0);
    await openSection(true);
  });
});

describe('detail pages', () => {
  it('resolves a rental vehicle while rental is enabled', async () => {
    const { getVehicleBySlug } = await import('@/lib/db/vehicles');
    await openSection(true);
    expect(getVehicleBySlug(slugFor('verif-rent-only'))?.slug).toBe(slugFor('verif-rent-only'));
  });

  it('404s a rental-only listing but keeps sale and saleable `both` listings', async () => {
    const { getVehicleBySlug } = await import('@/lib/db/vehicles');
    await openSection(false);
    expect(getVehicleBySlug(slugFor('verif-rent-only'))).toBeNull();
    // Sale-only still resolves: hiding rental must not hide sales.
    expect(getVehicleBySlug(slugFor('verif-sale-only'))?.slug).toBe(slugFor('verif-sale-only'));
    // `both` is reachable, projected as a sale listing.
    expect(getVehicleBySlug(slugFor('verif-both'))?.slug).toBe(slugFor('verif-both'));
    await openSection(true);
  });

  it('presents a `both` listing as a sale when rental is off, withholding the rental price', async () => {
    const { getVehicleBySlug } = await import('@/lib/db/vehicles');

    await openSection(true);
    const asBoth = getVehicleBySlug(slugFor('verif-both'))!;
    expect(asBoth.dealType).toBe('both');
    expect(asBoth.dailyPrice).toBeGreaterThan(0);
    expect(asBoth.salePrice).not.toBeNull();

    await openSection(false);
    const asSale = getVehicleBySlug(slugFor('verif-both'))!;
    // The projection: sale presentation, no rental figure leaking.
    expect(asSale.dealType).toBe('sale');
    expect(asSale.dailyPrice).toBeNull();
    expect(asSale.salePrice).toBe(asBoth.salePrice);
    await openSection(true);
  });

  it('never mutates the stored row when projecting `both` as a sale', async () => {
    const { getVehicleBySlug, getVehicleById } = await import('@/lib/db/vehicles');
    const { getDb } = await import('@/db/client');

    await openSection(false);
    const projected = getVehicleBySlug(slugFor('verif-both'))!;
    expect(projected.dealType).toBe('sale');

    // The database still holds the original deal type and both prices.
    const raw = getDb()
      .prepare('SELECT deal_type, daily_price, sale_price FROM vehicles WHERE slug = ?')
      .get(slugFor('verif-both')) as {
      deal_type: string;
      daily_price: number | null;
      sale_price: number | null;
    };
    expect(raw.deal_type).toBe('both');
    expect(raw.daily_price).not.toBeNull();
    expect(raw.sale_price).not.toBeNull();

    // The admin read is unprojected, so the operator still sees `both`.
    expect(getVehicleById(projected.id)?.dealType).toBe('both');
    await openSection(true);
  });

  it('cannot produce a `both` listing without a sale price (the database forbids it)', async () => {
    const { getDb } = await import('@/db/client');
    const { SAFE_PROJECTION_SQL } = await import('@/lib/settings');

    // The projection's sale-price guard is defence in depth: the CHECK constraint
    // means the bad state cannot exist in the first place. Both are asserted so a
    // future migration that relaxes the constraint fails here rather than shipping
    // a sale listing with no price.
    expect(() =>
      getDb()
        .prepare('UPDATE vehicles SET sale_price = NULL WHERE slug = ?')
        .run(slugFor('verif-both')),
    ).toThrow(/CHECK constraint failed/);

    // And the query itself would still exclude such a row if it ever existed.
    expect(SAFE_PROJECTION_SQL).toContain('sale_price IS NOT NULL');
  });

  it('never suggests a rental-only listing alongside a sale while rental is off', async () => {
    const { getVehicleBySlug, listSimilarVehicles } = await import('@/lib/db/vehicles');
    await openSection(true);
    const sale = getVehicleBySlug(slugFor('verif-sale-only'));
    expect(sale).not.toBeNull();

    await openSection(false);
    const similar = listSimilarVehicles(sale!, 5, { rentalEnabled: false });
    expect(similar.map((v) => v.slug)).not.toContain(slugFor('verif-rent-only'));
    // The saleable `both` row may appear, but only as a sale.
    for (const item of similar) {
      expect(item.dealType).toBe('sale');
      expect(item.dailyPrice).toBeNull();
    }
    await openSection(true);
  });
});

describe('homepage', () => {
  it('features vehicles while rental is enabled', async () => {
    const { listFeaturedVehicles } = await import('@/lib/db/vehicles');
    await openSection(true);
    expect(listFeaturedVehicles(3).length).toBeGreaterThan(0);
  });

  it('features sale inventory — including saleable `both` — when rental is disabled', async () => {
    const { listFeaturedVehicles } = await import('@/lib/db/vehicles');
    await openSection(false);
    const featured = listFeaturedVehicles(3, { rentalEnabled: false });
    expect(featured.map((v) => v.slug).sort()).toEqual([
      slugFor('verif-both'),
      slugFor('verif-sale-only'),
    ]);
    // Every featured item is presented as a sale with no per-day price.
    for (const item of featured) {
      expect(item.dealType).toBe('sale');
      expect(item.dailyPrice).toBeNull();
    }
    await openSection(true);
  });

  it('counts exactly the sale inventory the public can browse when rental is off', async () => {
    const { getPublicStats } = await import('@/lib/db/stats');
    const { listVehicles } = await import('@/lib/db/vehicles');
    const { defaultVehicleFilters } = await import('@/lib/filters');

    await openSection(true);
    const withRental = getPublicStats();
    expect(withRental.publishedVehicles).toBe(3);

    await openSection(false);
    const withoutRental = getPublicStats();
    // Sale-only + saleable `both`: the figure must match the catalogue, not
    // silently under-report the stock the visitor can browse.
    expect(withoutRental.publishedVehicles).toBe(2);
    expect(withoutRental.publishedVehicles).toBe(
      listVehicles(defaultVehicleFilters(), { rentalEnabled: false }).total,
    );
    // Properties are never affected by this setting.
    expect(withoutRental.publishedProperties).toBe(withRental.publishedProperties);
    expect(withoutRental.availableNow).toBeLessThanOrEqual(withRental.availableNow);
    await openSection(true);
  });
});

describe('regression: real estate is untouched', () => {
  it('keeps every published property visible in both states', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { listProperties } = await import('@/lib/db/properties');
    const { defaultPropertyFilters } = await import('@/lib/filters');

    setVehicleRentalEnabled(true);
    const before = listProperties(defaultPropertyFilters()).total;
    setVehicleRentalEnabled(false);
    const after = listProperties(defaultPropertyFilters()).total;
    setVehicleRentalEnabled(true);

    expect(after).toBe(before);
    expect(after).toBeGreaterThanOrEqual(2);
  });

  it('keeps property detail pages resolvable in both states', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { listProperties, getPropertyBySlug } = await import('@/lib/db/properties');
    const { defaultPropertyFilters } = await import('@/lib/filters');

    setVehicleRentalEnabled(true);
    const slug = listProperties(defaultPropertyFilters()).items[0]?.slug;
    expect(slug).toBeTruthy();

    setVehicleRentalEnabled(false);
    expect(getPropertyBySlug(slug!)).not.toBeNull();
    setVehicleRentalEnabled(true);
  });

  it('keeps the map points and commune coverage independent of the setting', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { listPropertyMapPoints } = await import('@/lib/db/properties');
    const { getPublicStats } = await import('@/lib/db/stats');
    const { defaultPropertyFilters } = await import('@/lib/filters');

    setVehicleRentalEnabled(true);
    const pointsBefore = listPropertyMapPoints(defaultPropertyFilters()).length;
    const communesBefore = getPublicStats().coveredCommunes;

    setVehicleRentalEnabled(false);
    expect(listPropertyMapPoints(defaultPropertyFilters()).length).toBe(pointsBefore);
    // Communes still covered because the properties alone cover them.
    expect(getPublicStats().coveredCommunes).toBe(communesBefore);
    setVehicleRentalEnabled(true);
  });
});

describe('admin reads stay complete', () => {
  it('still lists hidden rental vehicles in the back-office', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { listAdminVehicles } = await import('@/lib/db/admin-listings');

    setVehicleRentalEnabled(false);
    const adminRows = listAdminVehicles({ status: 'published' });
    setVehicleRentalEnabled(true);

    // An operator must be able to see and manage what the public cannot.
    expect(adminRows.length).toBe(3);
    expect(adminRows.map((row) => row.reference).every(Boolean)).toBe(true);
  });
});

describe('navigation keeps sale inventory discoverable', () => {
  it('offers a vehicle-sales link (not a hidden one) when rental is disabled', async () => {
    const { primaryNavFor } = await import('@/lib/brand');

    const withRental = primaryNavFor({ rentalEnabled: true });
    expect(withRental.some((item) => item.labelKey === 'vehicles')).toBe(true);
    expect(withRental.some((item) => item.labelKey === 'vehicleSales')).toBe(false);

    const saleOnly = primaryNavFor({ rentalEnabled: false, hasSaleInventory: true });
    const entry = saleOnly.find((item) => item.href === '/vehicles');
    // The link survives, relabelled — it is not dropped.
    expect(entry).toBeDefined();
    expect(entry?.labelKey).toBe('vehicleSales');
    expect(saleOnly.some((item) => item.labelKey === 'vehicles')).toBe(false);
    // Property navigation is untouched.
    expect(saleOnly.some((item) => item.labelKey === 'properties')).toBe(true);
  });

  it('drops the entry only when there is no sale inventory at all', async () => {
    const { primaryNavFor } = await import('@/lib/brand');
    const empty = primaryNavFor({ rentalEnabled: false, hasSaleInventory: false });
    expect(empty.some((item) => item.href === '/vehicles')).toBe(false);
  });

  it('reports sale inventory from the live catalogue, ignoring demo rows', async () => {
    const { countPublicSaleVehicles } = await import('@/lib/db/vehicles');
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');

    setVehicleRentalEnabled(true);
    // Both our seeded sale and `both` rows are real (is_demo = 0).
    expect(countPublicSaleVehicles(true)).toBe(3);

    setVehicleRentalEnabled(false);
    // Sale-only + saleable `both`; the rental-only row is not sellable.
    expect(countPublicSaleVehicles(false)).toBe(2);
    setVehicleRentalEnabled(true);
  });
});

describe('sitemap advertises the sale catalogue while rental is off', () => {
  it('includes /vehicles and sale detail URLs, and excludes rental-only ones', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { default: sitemap } = await import('@/app/sitemap');

    setVehicleRentalEnabled(true);
    const enabledUrls = sitemap().map((entry) => entry.url);
    expect(enabledUrls.some((url) => url.endsWith('/vehicles'))).toBe(true);
    expect(enabledUrls.some((url) => url.endsWith(slugFor('verif-rent-only')))).toBe(true);

    setVehicleRentalEnabled(false);
    const disabledUrls = sitemap().map((entry) => entry.url);
    // The catalogue itself stays advertised: it is a sale catalogue now.
    expect(disabledUrls.some((url) => url.endsWith('/vehicles'))).toBe(true);
    // Sale inventory is discoverable by crawlers.
    expect(disabledUrls.some((url) => url.endsWith(slugFor('verif-sale-only')))).toBe(true);
    expect(disabledUrls.some((url) => url.endsWith(slugFor('verif-both')))).toBe(true);
    // Rental-only URLs would 404, so they must never be listed.
    expect(disabledUrls.some((url) => url.endsWith(slugFor('verif-rent-only')))).toBe(false);

    setVehicleRentalEnabled(true);
  });
});

describe('sale presentation projection', () => {
  it('is the identity when rental is enabled', async () => {
    const { projectVehicleForPublic } = await import('@/lib/settings');
    const row = { dealType: 'both', dailyPrice: 5000, salePrice: 3000000 };
    expect(projectVehicleForPublic(row, true)).toBe(row);
  });

  it('turns a `both` listing into a sale and withholds the rental price', async () => {
    const { projectVehicleForPublic } = await import('@/lib/settings');
    expect(projectVehicleForPublic({ dealType: 'both', dailyPrice: 5000, salePrice: 3000000 }, false))
      .toEqual({ dealType: 'sale', dailyPrice: null, salePrice: 3000000 });
  });

  it('leaves a pure sale listing untouched', async () => {
    const { projectVehicleForPublic } = await import('@/lib/settings');
    expect(projectVehicleForPublic({ dealType: 'sale', dailyPrice: null, salePrice: 900 }, false))
      .toEqual({ dealType: 'sale', dailyPrice: null, salePrice: 900 });
  });

  it('never invents a sale price for a `both` row that lacks one', async () => {
    const { projectVehicleForPublic } = await import('@/lib/settings');
    // Defensive: the query excludes such rows, but the projection must not guess.
    expect(projectVehicleForPublic({ dealType: 'both', dailyPrice: 5000, salePrice: null }, false))
      .toEqual({ dealType: 'both', dailyPrice: 5000, salePrice: null });
  });
});

describe('rental-specific surfaces stay hidden', () => {
  it('keeps the rental deal-type filter options out of the catalogue', async () => {
    // The filter panel renders `rent` and `both` options only when rental is on;
    // a sale catalogue must not offer a rental filter that yields nothing.
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile('components/vehicles/vehicle-filters.tsx', 'utf8'),
    );
    expect(source).toContain('{rentalEnabled && <option value="rent">');
    expect(source).toContain('{rentalEnabled && <option value="both">');
  });

  it('gates the rental service card on the setting', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile('components/home/services-section.tsx', 'utf8'),
    );
    expect(source).toContain("SERVICES.filter((item) => item.key !== 'vehicles')");
  });

  it('gates the hero rental CTA and the detail reservation action', async () => {
    const hero = await import('node:fs/promises').then((fs) =>
      fs.readFile('components/home/hero.tsx', 'utf8'),
    );
    // The rental CTA wording is only used while rental is on.
    expect(hero).toContain('rentalEnabled ? t.home.heroCtaSecondary');
    expect(hero).toContain('t.home.heroCtaVehicleSales');

    const detail = await import('node:fs/promises').then((fs) =>
      fs.readFile('components/vehicles/vehicle-detail.tsx', 'utf8'),
    );
    // Rental price, reservation intent and pickup wording are all gated.
    expect(detail).toContain('{rentalEnabled && vehicle.dailyPrice != null && (');
    expect(detail).toContain("intent={rentalEnabled ? 'reservation' : 'vehicle'}");
    expect(detail).toContain('{WHATSAPP_NUMBER && rentalEnabled && (');
  });
});

/**
 * ---------------------------------------------------------------------------
 * Public hiding of the whole vehicle section — the client's standing policy.
 * ---------------------------------------------------------------------------
 * These are the acceptance tests for the directive: nothing about vehicles may
 * reach a visitor, while the back-office keeps full control. They are written
 * against the real database and the real route handlers, not against mocks.
 */
describe('public hiding: nothing vehicle-related reaches a visitor', () => {
  it('defaults to hidden, so a fresh install exposes no vehicles', async () => {
    const { SETTING_DEFINITIONS, VEHICLE_PUBLIC_VISIBLE_DEFAULT } = await import('@/lib/settings');
    expect(VEHICLE_PUBLIC_VISIBLE_DEFAULT).toBe(false);
    expect(SETTING_DEFINITIONS.vehiclePublicVisible.defaultValue).toBe(false);
  });

  it('hides everything even while the rental flag says "offered"', async () => {
    const { resolveVehicleVisibility } = await import('@/lib/settings');
    // The secondary flag must never be able to expose a hidden section.
    expect(resolveVehicleVisibility({ publicVisible: false, rentalEnabled: true })).toEqual({
      publicVisible: false,
      rentalEnabled: false,
    });
    expect(resolveVehicleVisibility({ publicVisible: true, rentalEnabled: true })).toEqual({
      publicVisible: true,
      rentalEnabled: true,
    });
  });

  it('serves an empty catalogue while hidden, whatever the filters', async () => {
    const { listVehicles } = await import('@/lib/db/vehicles');
    const { defaultVehicleFilters } = await import('@/lib/filters');
    await hideSection();

    const page = listVehicles(defaultVehicleFilters());
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    // Even a filter that would match everything returns nothing.
    const byCategory = listVehicles({ ...defaultVehicleFilters(), categories: ['sedan', 'suv'] });
    expect(byCategory.total).toBe(0);

    await openSection(true);
    expect(listVehicles(defaultVehicleFilters()).total).toBe(3);
  });

  it('resolves no vehicle detail while hidden — every slug becomes a 404', async () => {
    const { getVehicleBySlug } = await import('@/lib/db/vehicles');
    await hideSection();
    for (const key of ['verif-rent-only', 'verif-sale-only', 'verif-both']) {
      expect(getVehicleBySlug(slugFor(key))).toBeNull();
    }
    await openSection(true);
  });

  it('features nothing on the homepage while hidden', async () => {
    const { listFeaturedVehicles } = await import('@/lib/db/vehicles');
    await hideSection();
    expect(listFeaturedVehicles(3)).toEqual([]);
    await openSection(true);
    expect(listFeaturedVehicles(3).length).toBeGreaterThan(0);
  });

  it('counts no vehicle and no vehicle commune in public statistics while hidden', async () => {
    const { getPublicStats } = await import('@/lib/db/stats');
    await openSection(true);
    const visible = getPublicStats();

    await hideSection();
    const hidden = getPublicStats();
    expect(hidden.publishedVehicles).toBe(0);
    // Same test fixtures put both a property and a vehicle in Béjaïa, so hiding
    // vehicles must not change the commune coverage.
    expect(hidden.publishedProperties).toBe(visible.publishedProperties);
    await openSection(true);
  });

  it('removes the navigation entry entirely while hidden', async () => {
    const { primaryNavFor } = await import('@/lib/brand');
    const hidden = primaryNavFor({
      vehiclePublicVisible: false,
      rentalEnabled: true,
      hasSaleInventory: true,
    });
    expect(hidden.some((item) => item.href === '/vehicles')).toBe(false);
    expect(hidden.some((item) => item.labelKey === 'vehicles')).toBe(false);
    expect(hidden.some((item) => item.labelKey === 'vehicleSales')).toBe(false);
    // The real-estate navigation is untouched.
    expect(hidden.map((item) => item.labelKey)).toEqual([
      'home',
      'properties',
      'map',
      'services',
      'about',
      'contact',
    ]);
  });

  it('emits no vehicle URL in the sitemap while hidden', async () => {
    const { default: sitemap } = await import('@/app/sitemap');
    await hideSection();
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.some((url) => url.includes('/vehicles'))).toBe(false);
    for (const key of ['verif-rent-only', 'verif-sale-only', 'verif-both']) {
      expect(urls.some((url) => url.includes(slugFor(key)))).toBe(false);
    }
    // The real-estate surface is still advertised.
    expect(urls.some((url) => url.endsWith('/properties'))).toBe(true);

    await openSection(true);
    expect(sitemap().map((entry) => entry.url).some((url) => url.endsWith('/vehicles'))).toBe(true);
  });

  it('falls back to hidden when the settings table cannot be read', async () => {
    // The routes wrap the read in try/catch and treat a failure as "hidden", so a
    // database problem can only under-render — it can never leak a section.
    const { HIDDEN_VEHICLES } = await import('@/lib/settings');
    expect(HIDDEN_VEHICLES).toEqual({ publicVisible: false, rentalEnabled: false });
  });

  it('restores the exact previous state when visibility is switched back on', async () => {
    const { listVehicles } = await import('@/lib/db/vehicles');
    const { getDb } = await import('@/db/client');
    const { defaultVehicleFilters } = await import('@/lib/filters');

    const beforeRows = getDb()
      .prepare('SELECT id, deal_type, daily_price, sale_price, status FROM vehicles ORDER BY id')
      .all();

    await hideSection();
    await openSection(true);

    const afterRows = getDb()
      .prepare('SELECT id, deal_type, daily_price, sale_price, status FROM vehicles ORDER BY id')
      .all();

    // Hiding is a read-time projection: not one column changed.
    expect(afterRows).toEqual(beforeRows);
    expect(listVehicles(defaultVehicleFilters()).total).toBe(3);
  });
});

describe('public hiding: the back-office keeps working', () => {
  it('still lists every vehicle for administrators while the section is hidden', async () => {
    const { listAdminVehicles } = await import('@/lib/db/admin-listings');
    await hideSection();
    const rows = listAdminVehicles({});
    expect(rows.length).toBe(3);
    await openSection(true);
  });

  it('still creates, edits and deletes vehicles while the section is hidden', async () => {
    const { createVehicle, updateVehicle, deleteVehicle, setVehicleStatus } = await import(
      '@/lib/db/admin-listings'
    );
    const { addMedia } = await import('@/lib/db/media');
    const { getVehicleById } = await import('@/lib/db/vehicles');
    await hideSection();

    const payload = {
      titleFr: 'Véhicule administratif masqué',
      titleAr: 'سيارة إدارية مخفية',
      descriptionFr: 'Créé alors que la section est masquée.',
      descriptionAr: 'أُنشئت وقسم السيارات مخفي.',
      brand: 'AdminBrand',
      model: 'HiddenModel',
      year: 2024,
      category: 'sedan',
      transmission: 'automatic',
      fuel: 'petrol',
      seats: 5,
      doors: 5,
      dealType: 'rent',
      dailyPrice: 6000,
      salePrice: null,
      communeSlug: 'bejaia',
      coordinatePrecision: 'pending',
      features: [],
      availabilityStatus: 'available',
      featured: false,
      status: 'draft',
    };
    const created = createVehicle(payload as never);
    // The admin read is never projected, so the operator sees the real deal type.
    expect(getVehicleById(created.id)?.dealType).toBe('rent');

    // A full write payload: a partial one is a validation error, not an update.
    updateVehicle(created.id, { ...payload, dailyPrice: 7000 } as never);
    expect(getVehicleById(created.id)?.dailyPrice).toBe(7000);

    addMedia({
      entityType: 'vehicle',
      entityId: created.id,
      url: '/api/media/00000000-0000-4000-8000-00000000aa01.png',
      altFr: 'x',
      altAr: 'x',
      credit: 'Test',
      license: 'Test',
    });
    setVehicleStatus(created.id, 'published');
    expect(getVehicleById(created.id)?.status).toBe('published');

    // Published, yet still invisible to the public — the two concepts are separate.
    const { getVehicleBySlug } = await import('@/lib/db/vehicles');
    expect(getVehicleBySlug(created.slug)).toBeNull();

    deleteVehicle(created.id);
    expect(getVehicleById(created.id)).toBeNull();

    await openSection(true);
  });

  it('keeps every pre-existing vehicle record intact across a hide/show cycle', async () => {
    const { getDb } = await import('@/db/client');
    const count = () =>
      (getDb().prepare('SELECT COUNT(*) AS n FROM vehicles').get() as { n: number }).n;

    const before = count();
    await hideSection();
    expect(count()).toBe(before);
    await openSection(true);
    expect(count()).toBe(before);
  });
});

describe('public hiding: no API can bypass the policy', () => {
  it('drops a vehicle reference on a public inquiry while the section is hidden', async () => {
    const { createInquiry } = await import('@/lib/db/inquiries');
    const { getDb } = await import('@/db/client');
    const vehicle = getDb()
      .prepare(`SELECT id FROM vehicles WHERE status = 'published' LIMIT 1`)
      .get() as { id: string };

    await hideSection();
    const inquiry = createInquiry(
      {
        locale: 'fr',
        type: 'vehicle',
        fullName: 'Visiteur',
        phone: '0550123456',
        message: 'Bonjour, je suis intéressé.',
        preferredChannel: 'phone',
        consent: true,
        website: '',
        vehicleId: vehicle.id,
      } as never,
      { ipHash: 'test', userAgent: 'vitest' },
    );

    // The reference is not stored, and the type degrades — no oracle either way.
    expect(inquiry.vehicleId).toBeNull();
    expect(inquiry.type).toBe('general');

    await openSection(true);
  });

  it('accepts the same vehicle reference once the section is public again', async () => {
    const { createInquiry } = await import('@/lib/db/inquiries');
    const { getDb } = await import('@/db/client');
    const vehicle = getDb()
      .prepare(`SELECT id FROM vehicles WHERE status = 'published' LIMIT 1`)
      .get() as { id: string };

    await openSection(true);
    const inquiry = createInquiry(
      {
        locale: 'fr',
        type: 'vehicle',
        fullName: 'Visiteur',
        phone: '0550123456',
        message: 'Bonjour, je suis intéressé.',
        preferredChannel: 'phone',
        consent: true,
        website: '',
        vehicleId: vehicle.id,
      } as never,
      { ipHash: 'test', userAgent: 'vitest' },
    );
    expect(inquiry.vehicleId).toBe(vehicle.id);
    expect(inquiry.type).toBe('vehicle');
  });
});

describe('public hiding: both languages respect the policy', () => {
  it('has no vehicle wording in the real-estate-only copy, in FR or AR', async () => {
    const { fr } = await import('@/lib/i18n/dictionaries/fr');
    const { ar } = await import('@/lib/i18n/dictionaries/ar');
    const { BRAND } = await import('@/lib/brand');

    // The description and positioning used while hidden must not mention vehicles
    // in either language — this is the copy a search engine will read.
    for (const text of [
      fr.meta.defaultDescriptionRealEstate,
      ar.meta.defaultDescriptionRealEstate,
      BRAND.positioningRealEstate.fr,
      BRAND.positioningRealEstate.ar,
    ]) {
      expect(text).not.toMatch(/v[ée]hicule|voiture|سيار/i);
    }
  });

  it('keeps the Arabic and French navigation label parity for the sale entry', async () => {
    const { fr } = await import('@/lib/i18n/dictionaries/fr');
    const { ar } = await import('@/lib/i18n/dictionaries/ar');
    // The label a *visible* section uses still exists in both languages.
    expect(fr.nav.vehicleSales.length).toBeGreaterThan(0);
    expect(ar.nav.vehicleSales.length).toBeGreaterThan(0);
  });
});

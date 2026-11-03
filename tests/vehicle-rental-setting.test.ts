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
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    setVehicleRentalEnabled(true);
    expect(await vehicleSlugs()).toEqual(['verif-both', 'verif-rent-only', 'verif-sale-only']);
  });

  it('drops rental-only listings and keeps sale inventory when rental is disabled', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    setVehicleRentalEnabled(false);
    // `both` is saleable, so it must survive the switch: hiding it would hide
    // inventory the agency is trying to sell.
    expect(await vehicleSlugs()).toEqual(['verif-both', 'verif-sale-only']);
    setVehicleRentalEnabled(true);
  });

  it('follows the persisted value when no explicit scope is passed', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { listVehicles } = await import('@/lib/db/vehicles');
    const { defaultVehicleFilters } = await import('@/lib/filters');

    setVehicleRentalEnabled(false);
    expect(
      listVehicles(defaultVehicleFilters()).items.map((v) =>
        v.slug.replace('testbrand-', '').replace('-2023', ''),
      ),
    ).toEqual(['verif-both', 'verif-sale-only']);
    setVehicleRentalEnabled(true);
    expect(listVehicles(defaultVehicleFilters()).total).toBe(3);
  });

  it('still honours category and search filters while rental is off', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { listVehicles } = await import('@/lib/db/vehicles');
    const { defaultVehicleFilters } = await import('@/lib/filters');

    setVehicleRentalEnabled(false);
    const byCategory = listVehicles({ ...defaultVehicleFilters(), categories: ['sedan'] });
    expect(byCategory.items.map((v) => v.slug)).toEqual([slugFor('verif-sale-only')]);

    // A search that only matches a rental vehicle must return nothing.
    const rentalSearch = listVehicles({ ...defaultVehicleFilters(), query: 'rent-only' });
    expect(rentalSearch.total).toBe(0);
    setVehicleRentalEnabled(true);
  });
});

describe('detail pages', () => {
  it('resolves a rental vehicle while rental is enabled', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { getVehicleBySlug } = await import('@/lib/db/vehicles');
    setVehicleRentalEnabled(true);
    expect(getVehicleBySlug(slugFor('verif-rent-only'))?.slug).toBe(slugFor('verif-rent-only'));
  });

  it('404s a rental-only listing but keeps sale and saleable `both` listings', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { getVehicleBySlug } = await import('@/lib/db/vehicles');
    setVehicleRentalEnabled(false);
    expect(getVehicleBySlug(slugFor('verif-rent-only'))).toBeNull();
    // Sale-only still resolves: hiding rental must not hide sales.
    expect(getVehicleBySlug(slugFor('verif-sale-only'))?.slug).toBe(slugFor('verif-sale-only'));
    // `both` is reachable, projected as a sale listing.
    expect(getVehicleBySlug(slugFor('verif-both'))?.slug).toBe(slugFor('verif-both'));
    setVehicleRentalEnabled(true);
  });

  it('presents a `both` listing as a sale when rental is off, withholding the rental price', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { getVehicleBySlug } = await import('@/lib/db/vehicles');

    setVehicleRentalEnabled(true);
    const asBoth = getVehicleBySlug(slugFor('verif-both'))!;
    expect(asBoth.dealType).toBe('both');
    expect(asBoth.dailyPrice).toBeGreaterThan(0);
    expect(asBoth.salePrice).not.toBeNull();

    setVehicleRentalEnabled(false);
    const asSale = getVehicleBySlug(slugFor('verif-both'))!;
    // The projection: sale presentation, no rental figure leaking.
    expect(asSale.dealType).toBe('sale');
    expect(asSale.dailyPrice).toBeNull();
    expect(asSale.salePrice).toBe(asBoth.salePrice);
    setVehicleRentalEnabled(true);
  });

  it('never mutates the stored row when projecting `both` as a sale', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { getVehicleBySlug, getVehicleById } = await import('@/lib/db/vehicles');
    const { getDb } = await import('@/db/client');

    setVehicleRentalEnabled(false);
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
    setVehicleRentalEnabled(true);
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
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { getVehicleBySlug, listSimilarVehicles } = await import('@/lib/db/vehicles');
    setVehicleRentalEnabled(true);
    const sale = getVehicleBySlug(slugFor('verif-sale-only'));
    expect(sale).not.toBeNull();

    setVehicleRentalEnabled(false);
    const similar = listSimilarVehicles(sale!, 5, { rentalEnabled: false });
    expect(similar.map((v) => v.slug)).not.toContain(slugFor('verif-rent-only'));
    // The saleable `both` row may appear, but only as a sale.
    for (const item of similar) {
      expect(item.dealType).toBe('sale');
      expect(item.dailyPrice).toBeNull();
    }
    setVehicleRentalEnabled(true);
  });
});

describe('homepage', () => {
  it('features vehicles while rental is enabled', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { listFeaturedVehicles } = await import('@/lib/db/vehicles');
    setVehicleRentalEnabled(true);
    expect(listFeaturedVehicles(3).length).toBeGreaterThan(0);
  });

  it('features sale inventory — including saleable `both` — when rental is disabled', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { listFeaturedVehicles } = await import('@/lib/db/vehicles');
    setVehicleRentalEnabled(false);
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
    setVehicleRentalEnabled(true);
  });

  it('counts exactly the sale inventory the public can browse when rental is off', async () => {
    const { setVehicleRentalEnabled } = await import('@/lib/db/settings');
    const { getPublicStats } = await import('@/lib/db/stats');
    const { listVehicles } = await import('@/lib/db/vehicles');
    const { defaultVehicleFilters } = await import('@/lib/filters');

    setVehicleRentalEnabled(true);
    const withRental = getPublicStats();
    expect(withRental.publishedVehicles).toBe(3);

    setVehicleRentalEnabled(false);
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
    setVehicleRentalEnabled(true);
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

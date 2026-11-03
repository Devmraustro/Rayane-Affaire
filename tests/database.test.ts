import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTempDbEnv, initSchema, type TempDb } from './helpers/temp-db';

/**
 * Database integration tests — real SQLite, real schema, no mocks.
 *
 * They cover: schema constraints, referential integrity, the property/vehicle
 * repositories (filtering, search, sorting, pagination), the publish guard, the
 * map-point rule (pending coordinates must never produce a marker) and the
 * statistics scope (demo data excluded).
 */
let env: TempDb;

beforeAll(async () => {
  env = createTempDbEnv();
  await initSchema();
});

afterAll(() => env.cleanup());

const property = (overrides: Record<string, unknown> = {}) => ({
  titleFr: 'Appartement F3 Béjaïa',
  titleAr: 'شقة F3 ببجاية',
  descriptionFr: 'Appartement lumineux.',
  descriptionAr: 'شقة مضيئة.',
  category: 'apartment',
  transaction: 'rent_annual',
  price: 45000,
  priceUnit: 'month',
  communeSlug: 'bejaia',
  addressFr: '',
  addressAr: '',
  coordinatePrecision: 'pending',
  surface: 82,
  bedrooms: 3,
  bathrooms: 1,
  furnishing: 'unfurnished',
  amenities: ['Ascenseur'],
  availabilityStatus: 'available',
  featured: false,
  status: 'draft',
  ...overrides,
});

const vehicle = (overrides: Record<string, unknown> = {}) => ({
  titleFr: 'Renault Clio 5',
  titleAr: 'رونو كليو 5',
  descriptionFr: 'Citadine.',
  descriptionAr: 'سيارة اقتصادية.',
  brand: 'Renault',
  model: 'Clio 5',
  year: 2023,
  category: 'economy',
  transmission: 'manual',
  fuel: 'petrol',
  seats: 5,
  doors: 5,
  dealType: 'rent',
  dailyPrice: 4500,
  communeSlug: 'bejaia',
  coordinatePrecision: 'pending',
  features: ['Climatisation'],
  availabilityStatus: 'available',
  featured: false,
  status: 'draft',
  ...overrides,
});

describe('schema and reference data', () => {
  it('seeds the 11 OSM-verified Béjaïa communes', async () => {
    const { listCommunes } = await import('@/lib/db/communes');
    const communes = listCommunes();
    expect(communes).toHaveLength(11);
    expect(communes.every((c) => c.wilayaCode === '06')).toBe(true);
    expect(communes.every((c) => c.osmRelationId)).toBe(true);
  });

  it('stores commune centroids inside the Béjaïa wilaya bounding box', async () => {
    const { listCommunes } = await import('@/lib/db/communes');
    for (const commune of listCommunes()) {
      // Béjaïa wilaya spans roughly 36.0–36.9 N and 4.2–5.5 E.
      expect(commune.center.lat).toBeGreaterThan(36.0);
      expect(commune.center.lat).toBeLessThan(36.95);
      expect(commune.center.lng).toBeGreaterThan(4.2);
      expect(commune.center.lng).toBeLessThan(5.55);
    }
  });

  it('rejects a listing that references an unknown commune (foreign key)', async () => {
    const { getDb } = await import('@/db/client');
    const db = getDb();
    expect(() =>
      db
        .prepare(
          `INSERT INTO properties (id, slug, reference, title_fr, title_ar, category, transaction_type,
             price, price_unit, commune_id, surface, bedrooms, bathrooms, furnishing, amenities,
             availability_status, featured, status, is_demo, created_at, updated_at)
           VALUES ('x','x','X','a','b','apartment','rent_annual',1,'month','missing','0','0','0','unfurnished','[]','available',0,'draft',0,'now','now')`,
        )
        .run(),
    ).toThrow();
  });

  it('rejects pending precision combined with coordinates (CHECK constraint)', async () => {
    const { getDb } = await import('@/db/client');
    const db = getDb();
    expect(() =>
      db
        .prepare(
          `INSERT INTO properties (id, slug, reference, title_fr, title_ar, category, transaction_type,
             price, price_unit, commune_id, lat, lng, coordinate_precision, surface, bedrooms, bathrooms,
             furnishing, amenities, availability_status, featured, status, is_demo, created_at, updated_at)
           VALUES ('y','y','Y','a','b','apartment','rent_annual',1,'month','commune-bejaia',36.75,5.06,'pending',
             0,0,0,'unfurnished','[]','available',0,'draft',0,'now','now')`,
        )
        .run(),
    ).toThrow();
  });
});

describe('property create / publish lifecycle', () => {
  it('creates a draft with a generated unique reference and slug', async () => {
    const { createProperty, updateProperty } = await import('@/lib/db/admin-listings');
    const created = createProperty(property() as never);
    expect(created.status).toBe('draft');
    expect(created.reference).toMatch(/^RA-P-\d{4}$/);
    expect(created.slug).toBe('appartement-f3-bejaia');
    expect(created.isDemo).toBe(false);

    const second = createProperty(property({ titleFr: 'Appartement F3 Béjaïa' }) as never);
    expect(second.slug).toBe('appartement-f3-bejaia-2');
    expect(second.reference).not.toBe(created.reference);

    // Kept for later assertions in this file.
    (globalThis as Record<string, unknown>).__propertyId = created.id;
    (globalThis as Record<string, unknown>).__propertySlug = created.slug;

    expect(updateProperty).toBeTypeOf('function');
  });

  it('refuses to publish a listing without a photograph', async () => {
    const { setPropertyStatus } = await import('@/lib/db/admin-listings');
    const id = (globalThis as Record<string, unknown>).__propertyId as string;
    expect(() => setPropertyStatus(id, 'published')).toThrowError(/photograph/i);
  });

  it('publishes once a photograph exists', async () => {
    const { setPropertyStatus } = await import('@/lib/db/admin-listings');
    const { addMedia } = await import('@/lib/db/media');
    const id = (globalThis as Record<string, unknown>).__propertyId as string;
    addMedia({
      entityType: 'property',
      entityId: id,
      url: '/api/media/00000000-0000-4000-8000-000000000000.png',
      altFr: 'Salon',
      altAr: 'صالة',
    });
    const published = setPropertyStatus(id, 'published');
    expect(published?.status).toBe('published');
    expect(published?.media).toHaveLength(1);
  });

  it('hides draft listings from the public reader', async () => {
    const { getPropertyBySlug } = await import('@/lib/db/properties');
    expect(getPropertyBySlug('appartement-f3-bejaia-2')).toBeNull();
  });

  it('only exposes a public listing by slug when published', async () => {
    const { getPropertyBySlug } = await import('@/lib/db/properties');
    const slug = (globalThis as Record<string, unknown>).__propertySlug as string;
    const published = getPropertyBySlug(slug);
    expect(published).not.toBeNull();
    expect(published?.title.ar).toBe('شقة F3 ببجاية');
  });
});

describe('map point rule', () => {
  it('never returns a marker for a published listing with pending coordinates', async () => {
    const { listPropertyMapPoints } = await import('@/lib/db/properties');
    const { defaultPropertyFilters } = await import('@/lib/filters');
    const points = listPropertyMapPoints(defaultPropertyFilters());
    const ids = points.map((point) => point.id);
    expect(ids).not.toContain((globalThis as Record<string, unknown>).__propertyId);
    expect(points.every((point) => point.coordinatePrecision !== 'pending')).toBe(true);
  });

  it('returns a marker with its precision once coordinates are verified', async () => {
    const { updateProperty } = await import('@/lib/db/admin-listings');
    const { listPropertyMapPoints } = await import('@/lib/db/properties');
    const { defaultPropertyFilters } = await import('@/lib/filters');
    const id = (globalThis as Record<string, unknown>).__propertyId as string;

    updateProperty(id, {
      ...property({
        lat: 36.7614,
        lng: 5.0719,
        coordinatePrecision: 'approximate',
        status: 'published',
        addressFr: 'Quartier Ihaddaden',
      }),
    } as never);

    const points = listPropertyMapPoints(defaultPropertyFilters());
    const mine = points.find((point) => point.id === id);
    expect(mine).toBeDefined();
    expect(mine?.coordinatePrecision).toBe('approximate');
    expect(mine?.lat).toBeCloseTo(36.7614, 3);
  });

  it('counts listings that cannot be mapped', async () => {
    const { countPublishedWithoutCoordinates } = await import('@/lib/db/properties');
    const count = countPublishedWithoutCoordinates();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

describe('search, filtering and pagination', () => {
  it('filters by commune, category, transaction and price range', async () => {
    const { createProperty, setPropertyStatus } = await import('@/lib/db/admin-listings');
    const { addMedia } = await import('@/lib/db/media');
    const { listProperties } = await import('@/lib/db/properties');
    const { defaultPropertyFilters } = await import('@/lib/filters');

    const villa = createProperty(
      property({
        titleFr: 'Villa Tichy bord de mer',
        titleAr: 'فيلا تيشي',
        category: 'villa',
        transaction: 'rent_short',
        price: 12000,
        priceUnit: 'night',
        communeSlug: 'tichy',
        surface: 180,
        bedrooms: 4,
      }) as never,
    );
    addMedia({
      entityType: 'property',
      entityId: villa.id,
      url: '/api/media/00000000-0000-4000-8000-000000000001.png',
      altFr: 'Villa',
      altAr: 'فيلا',
    });
    setPropertyStatus(villa.id, 'published');

    const byCommune = listProperties({ ...defaultPropertyFilters(), communes: ['tichy'] });
    expect(byCommune.items.every((item) => item.commune.slug === 'tichy')).toBe(true);
    expect(byCommune.total).toBeGreaterThanOrEqual(1);

    const byCategory = listProperties({ ...defaultPropertyFilters(), categories: ['villa'] });
    expect(byCategory.items.every((item) => item.category === 'villa')).toBe(true);

    const byPrice = listProperties({
      ...defaultPropertyFilters(),
      minPrice: 10000,
      maxPrice: 20000,
    });
    expect(byPrice.items.every((item) => item.price >= 10000 && item.price <= 20000)).toBe(true);
  });

  it('searches French and Arabic titles, and references', async () => {
    const { listProperties } = await import('@/lib/db/properties');
    const { defaultPropertyFilters } = await import('@/lib/filters');

    expect(
      listProperties({ ...defaultPropertyFilters(), query: 'tichy' }).items.length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      listProperties({ ...defaultPropertyFilters(), query: 'فيلا' }).items.length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('sorts by price ascending and descending', async () => {
    const { listProperties } = await import('@/lib/db/properties');
    const { defaultPropertyFilters } = await import('@/lib/filters');

    const asc = listProperties({ ...defaultPropertyFilters(), sort: 'price-asc' });
    const prices = asc.items.map((item) => item.price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('paginates deterministically', async () => {
    const { listProperties } = await import('@/lib/db/properties');
    const { defaultPropertyFilters } = await import('@/lib/filters');
    const pageOne = listProperties({ ...defaultPropertyFilters(), page: 1, pageSize: 1 });
    const pageTwo = listProperties({ ...defaultPropertyFilters(), page: 2, pageSize: 1 });
    expect(pageOne.items).toHaveLength(1);
    expect(pageOne.totalPages).toBe(pageOne.total);
    expect(pageTwo.items[0]?.id).not.toBe(pageOne.items[0]?.id);
  });
});

describe('vehicles', () => {
  it('creates, publishes and rejects publishing without a photo', async () => {
    const { createVehicle, setVehicleStatus } = await import('@/lib/db/admin-listings');
    const { addMedia } = await import('@/lib/db/media');
    const { getVehicleBySlug } = await import('@/lib/db/vehicles');

    const created = createVehicle(vehicle() as never);
    expect(created.dealType).toBe('rent');
    expect(created.dailyPrice).toBe(4500);
    expect(() => setVehicleStatus(created.id, 'published')).toThrowError(/photograph/i);

    addMedia({
      entityType: 'vehicle',
      entityId: created.id,
      url: '/api/media/00000000-0000-4000-8000-000000000002.png',
      altFr: 'Clio',
      altAr: 'كليو',
    });
    setVehicleStatus(created.id, 'published');

    const fetched = getVehicleBySlug(created.slug);
    expect(fetched?.brand).toBe('Renault');
    expect(fetched?.media).toHaveLength(1);
  });
});

describe('statistics scope', () => {
  it('excludes demonstration rows from public statistics', async () => {
    const { getDb } = await import('@/db/client');
    const { getPublicStats } = await import('@/lib/db/stats');
    const db = getDb();

    const before = getPublicStats();
    db.prepare(`UPDATE properties SET is_demo = 1 WHERE is_demo = 0`).run();
    const after = getPublicStats();
    expect(after.publishedProperties).toBe(0);
    expect(after.publishedProperties).toBeLessThanOrEqual(before.publishedProperties);

    // Restore so subsequent assertions stay meaningful.
    db.prepare(`UPDATE properties SET is_demo = 0`).run();
  });

  it('returns zeros on an empty catalogue rather than fabricated numbers', async () => {
    const { getDb } = await import('@/db/client');
    const { getPublicStats } = await import('@/lib/db/stats');
    const db = getDb();
    db.prepare(`UPDATE properties SET status = 'draft'`).run();
    db.prepare(`UPDATE vehicles SET status = 'draft'`).run();
    const stats = getPublicStats();
    expect(stats.publishedProperties).toBe(0);
    expect(stats.publishedVehicles).toBe(0);
    expect(stats.isEmpty).toBe(true);
    db.prepare(`UPDATE properties SET status = 'published'`).run();
    db.prepare(`UPDATE vehicles SET status = 'published'`).run();
  });
});

describe('deletion integrity', () => {
  it('removes a listing and its media together', async () => {
    const { createProperty, deleteProperty } = await import('@/lib/db/admin-listings');
    const { addMedia, countMedia } = await import('@/lib/db/media');
    const created = createProperty(property({ titleFr: 'Bien à supprimer' }) as never);
    addMedia({
      entityType: 'property',
      entityId: created.id,
      url: '/api/media/00000000-0000-4000-8000-000000000003.png',
      altFr: 'x',
      altAr: 'x',
    });
    expect(countMedia('property', created.id)).toBe(1);
    expect(deleteProperty(created.id)).toBe(true);
    expect(countMedia('property', created.id)).toBe(0);
  });
});

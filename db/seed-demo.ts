/**
 * OPT-IN demonstration content — `npm run db:seed:demo`
 *
 * Purpose: let the owner and the developer see every UI state (cards, galleries,
 * map markers, precision badges, both locales) before real inventory exists.
 *
 * Safety rules baked into this script:
 *  * every row is written with `is_demo = 1`;
 *  * the images are the branded SVG placeholders, never photographs of a real
 *    property or vehicle;
 *  * geo coordinates are always absent (`pending`): demonstration rows never
 *    create map pins or imply the location of a real place;
 *  * titles/descriptions say "démonstration" / "تجريبي";
 *  * demo rows are excluded from every public statistic and from the homepage
 *    spotlight, and are badged on cards, detail pages and map popups;
 *  * `npm run db:seed:demo -- --purge` removes everything it created.
 *
 * Nothing here pretends to be RAYANE AFFAIRE's real portfolio.
 */
import { getDb, transaction } from './client';
import { seedCommunes } from './seed-communes';
import { randomUUID } from 'node:crypto';

const sql = getDb();

function purge(): void {
  const db = getDb();
  transaction(db, () => {
    const demos = db.prepare(`SELECT id FROM properties WHERE is_demo = 1`).all() as { id: string }[];
    for (const row of demos) {
      db.prepare(`DELETE FROM media WHERE entity_type='property' AND entity_id=?`).run(row.id);
    }
    const demoVeh = db.prepare(`SELECT id FROM vehicles WHERE is_demo = 1`).all() as { id: string }[];
    for (const row of demoVeh) {
      db.prepare(`DELETE FROM media WHERE entity_type='vehicle' AND entity_id=?`).run(row.id);
    }
    db.prepare('DELETE FROM reservations WHERE is_demo = 1').run();
    db.prepare('DELETE FROM properties WHERE is_demo = 1').run();
    db.prepare('DELETE FROM vehicles WHERE is_demo = 1').run();
  });
  console.log('✔ Demonstration records removed.');
}

interface DemoProperty {
  slug: string;
  reference: string;
  titleFr: string;
  titleAr: string;
  descFr: string;
  descAr: string;
  category: string;
  transaction: string;
  price: number;
  priceUnit: string;
  communeSlug: string;
  lat: number | null;
  lng: number | null;
  precision: string;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  furnishing: string;
  amenities: string[];
  featured: boolean;
  image: string;
}

/**
 * Demonstration rows deliberately carry no coordinates. Commune centroids remain
 * administrative reference data and are never copied into listing positions.
 */
const PROPERTIES: DemoProperty[] = [
  {
    slug: 'demo-appartement-f3-bejaia-centre',
    reference: 'RA-DEMO-P-0001',
    titleFr: '[Démonstration] Appartement F3 — Béjaïa centre',
    titleAr: '[تجريبي] شقة F3 — وسط بجاية',
    descFr:
      'Annonce de démonstration. Appartement de type F3 avec séjour lumineux, cuisine équipée et balcon. Ce contenu sert uniquement à valider l’affichage du site et ne correspond à aucun bien réel de l’agence.',
    descAr:
      'إعلان تجريبي. شقة من نوع F3 بصالة مضيئة ومطبخ مجهز وشرفة. هذا المحتوى مخصص فقط لاختبار عرض الموقع ولا يمثل أي عقار حقيقي للوكالة.',
    category: 'apartment',
    transaction: 'rent_annual',
    price: 45000,
    priceUnit: 'month',
    communeSlug: 'bejaia',
    lat: null,
    lng: null,
    precision: 'pending',
    surface: 82,
    bedrooms: 3,
    bathrooms: 1,
    furnishing: 'unfurnished',
    amenities: ['Ascenseur', 'Balcon', 'Parking'],
    featured: true,
    image: '/images/fallback/property-1.svg',
  },
  {
    slug: 'demo-villa-tichy',
    reference: 'RA-DEMO-P-0002',
    titleFr: '[Démonstration] Villa avec jardin — Tichy',
    titleAr: '[تجريبي] فيلا بحديقة — تيشي',
    descFr:
      'Annonce de démonstration. Villa individuelle de cinq pièces avec jardin et terrasse, à proximité de la plage. Contenu fictif destiné à la validation de l’interface.',
    descAr:
      'إعلان تجريبي. فيلا مستقلة بخمس غرف مع حديقة وتراس قرب الشاطئ. محتوى وهمي مخصص لاختبار الواجهة.',
    category: 'villa',
    transaction: 'rent_short',
    price: 12000,
    priceUnit: 'night',
    communeSlug: 'tichy',
    lat: null,
    lng: null,
    precision: 'pending',
    surface: 180,
    bedrooms: 4,
    bathrooms: 2,
    furnishing: 'furnished',
    amenities: ['Jardin', 'Terrasse', 'Vue mer', 'Climatisation'],
    featured: true,
    image: '/images/fallback/property-2.svg',
  },
  {
    slug: 'demo-studio-el-kseur',
    reference: 'RA-DEMO-P-0003',
    titleFr: '[Démonstration] Studio meublé — El Kseur',
    titleAr: '[تجريبي] استوديو مفروش — القصر',
    descFr:
      'Annonce de démonstration. Studio meublé, idéal pour un séjour professionnel. Aucune visite ne peut être organisée : ce bien n’existe pas.',
    descAr:
      'إعلان تجريبي. استوديو مفروش مناسب لإقامة مهنية. لا يمكن تنظيم أي زيارة: هذا العقار غير موجود.',
    category: 'studio',
    transaction: 'rent_short',
    price: 4500,
    priceUnit: 'night',
    communeSlug: 'el-kseur',
    lat: null,
    lng: null,
    precision: 'pending',
    surface: 34,
    bedrooms: 1,
    bathrooms: 1,
    furnishing: 'furnished',
    amenities: ['Wi-Fi', 'Kitchenette'],
    featured: false,
    image: '/images/fallback/property-3.svg',
  },
  {
    slug: 'demo-local-commercial-akbou',
    reference: 'RA-DEMO-P-0004',
    titleFr: '[Démonstration] Local commercial — Akbou',
    titleAr: '[تجريبي] محل تجاري — أقبو',
    descFr:
      'Annonce de démonstration. Local commercial en rez-de-chaussée avec vitrine sur axe principal. Contenu fictif.',
    descAr: 'إعلان تجريبي. محل تجاري بالطابق الأرضي بواجهة على المحور الرئيسي. محتوى وهمي.',
    category: 'commercial',
    transaction: 'rent_annual',
    price: 70000,
    priceUnit: 'month',
    communeSlug: 'akbou',
    lat: null,
    lng: null,
    precision: 'pending',
    surface: 65,
    bedrooms: 0,
    bathrooms: 1,
    furnishing: 'unfurnished',
    amenities: ['Vitrine', 'Réserve'],
    featured: false,
    image: '/images/fallback/property-6.svg',
  },
  {
    slug: 'demo-terrain-amizour',
    reference: 'RA-DEMO-P-0005',
    titleFr: '[Démonstration] Terrain constructible — Amizour',
    titleAr: '[تجريبي] أرض صالحة للبناء — أميزور',
    descFr:
      'Annonce de démonstration. Terrain constructible avec acte notarié, à proximité des commodités. Contenu fictif, aucun document réel.',
    descAr:
      'إعلان تجريبي. أرض صالحة للبناء بعقد موثق قرب المرافق. محتوى وهمي، لا وثيقة حقيقية.',
    category: 'land',
    transaction: 'sale',
    price: 6500000,
    priceUnit: 'total',
    communeSlug: 'amizour',
    lat: null,
    lng: null,
    precision: 'pending',
    surface: 320,
    bedrooms: 0,
    bathrooms: 0,
    furnishing: 'unfurnished',
    amenities: [],
    featured: false,
    image: '/images/fallback/property-5.svg',
  },
  {
    slug: 'demo-appartement-aokas',
    reference: 'RA-DEMO-P-0006',
    titleFr: '[Démonstration] Appartement F4 vue mer — Aokas',
    titleAr: '[تجريبي] شقة F4 بإطلالة على البحر — أوقاس',
    descFr:
      'Annonce de démonstration. Appartement F4 au troisième étage avec vue dégagée sur la mer. Contenu fictif destiné aux tests.',
    descAr: 'إعلان تجريبي. شقة F4 بالطابق الثالث بإطلالة مفتوحة على البحر. محتوى وهمي للاختبار.',
    category: 'apartment',
    transaction: 'sale',
    price: 18500000,
    priceUnit: 'total',
    communeSlug: 'aokas',
    lat: null,
    lng: null,
    precision: 'pending',
    surface: 110,
    bedrooms: 4,
    bathrooms: 2,
    furnishing: 'unfurnished',
    amenities: ['Vue mer', 'Ascenseur', 'Garage'],
    featured: true,
    image: '/images/fallback/property-4.svg',
  },
];

const VEHICLES = [
  {
    slug: 'demo-renault-clio-5',
    reference: 'RA-DEMO-V-0001',
    titleFr: '[Démonstration] Renault Clio 5 essence',
    titleAr: '[تجريبي] رونو كليو 5 بنزين',
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
    salePrice: null,
    communeSlug: 'bejaia',
    mileageKm: 38000,
    features: ['Climatisation', 'Bluetooth', 'GPS'],
    image: '/images/fallback/vehicle-1.svg',
    descFr: 'Véhicule de démonstration. Citadine économique pour la démonstration du site.',
    descAr: 'سيارة تجريبية. سيارة اقتصادية لاختبار الموقع.',
  },
  {
    slug: 'demo-dacia-duster',
    reference: 'RA-DEMO-V-0002',
    titleFr: '[Démonstration] Dacia Duster diesel',
    titleAr: '[تجريبي] داسيا دوستر مازوت',
    brand: 'Dacia',
    model: 'Duster',
    year: 2022,
    category: 'suv',
    transmission: 'manual',
    fuel: 'diesel',
    seats: 5,
    doors: 5,
    dealType: 'rent',
    dailyPrice: 6500,
    salePrice: null,
    communeSlug: 'bejaia',
    mileageKm: 61000,
    features: ['4x4', 'Climatisation', 'Barres de toit'],
    image: '/images/fallback/vehicle-2.svg',
    descFr: 'Véhicule de démonstration. SUV adapté aux routes de la région.',
    descAr: 'سيارة تجريبية. سيارة رياضية مناسبة لطرق المنطقة.',
  },
  {
    slug: 'demo-hyundai-accent',
    reference: 'RA-DEMO-V-0003',
    titleFr: '[Démonstration] Hyundai Accent berline',
    titleAr: '[تجريبي] هيونداي أكسنت سيدان',
    brand: 'Hyundai',
    model: 'Accent',
    year: 2021,
    category: 'sedan',
    transmission: 'automatic',
    fuel: 'petrol',
    seats: 5,
    doors: 4,
    dealType: 'both',
    dailyPrice: 5500,
    salePrice: 3200000,
    communeSlug: 'el-kseur',
    mileageKm: 84000,
    features: ['Boîte automatique', 'Caméra de recul'],
    image: '/images/fallback/vehicle-3.svg',
    descFr: 'Véhicule de démonstration, disponible à la location ou à la vente.',
    descAr: 'سيارة تجريبية، متاحة للكراء أو البيع.',
  },
];

function main(): void {
  if (process.argv.includes('--purge')) {
    purge();
    return;
  }

  const db = getDb();
  seedCommunes(db);

  const existing = db.prepare('SELECT COUNT(*) AS n FROM properties WHERE is_demo = 1').get() as {
    n: number;
  };
  if (existing.n > 0 && !process.argv.includes('--force')) {
    console.log('ℹ Demonstration records already present. Use --force to replace them.');
    return;
  }
  if (process.argv.includes('--force')) purge();

  const now = new Date().toISOString();

  transaction(db, () => {
    for (const item of PROPERTIES) {
      const commune = db
        .prepare('SELECT id FROM communes WHERE slug = ?')
        .get(item.communeSlug) as { id: string } | undefined;
      if (!commune) continue;
      const id = randomUUID();
      db.prepare(
        `INSERT INTO properties (
           id, slug, reference, title_fr, title_ar, description_fr, description_ar,
           category, transaction_type, price, price_unit, currency, commune_id,
           address_fr, address_ar, lat, lng, coordinate_precision, surface, bedrooms,
           bathrooms, floor, furnishing, amenities, availability_status, available_from,
           featured, video_url, status, is_demo, published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DZD', ?, '', '', ?, ?, ?, ?, ?, ?, NULL, ?, ?, 'available', NULL, ?, NULL, 'published', 1, ?, ?, ?)`,
      ).run(
        id,
        item.slug,
        item.reference,
        item.titleFr,
        item.titleAr,
        item.descFr,
        item.descAr,
        item.category,
        item.transaction,
        item.price,
        item.priceUnit,
        commune.id,
        item.lat,
        item.lng,
        item.precision,
        item.surface,
        item.bedrooms,
        item.bathrooms,
        item.furnishing,
        JSON.stringify(item.amenities),
        item.featured ? 1 : 0,
        now,
        now,
        now,
      );
      db.prepare(
        `INSERT INTO media (id, entity_type, entity_id, url, alt_fr, alt_ar, width, height,
                            sort_order, credit, source_url, license, created_at)
         VALUES (?, 'property', ?, ?, ?, ?, 960, 640, 0, ?, NULL, ?, ?)`,
      ).run(
        randomUUID(),
        id,
        item.image,
        `Visuel de démonstration — ${item.titleFr.replace('[Démonstration] ', '')}`,
        `صورة توضيحية — ${item.titleAr.replace('[تجريبي] ', '')}`,
        'RAYANE AFFAIRE — visuel de démonstration',
        'Propriété de RAYANE AFFAIRE',
        now,
      );
    }

    for (const item of VEHICLES) {
      const commune = db
        .prepare('SELECT id FROM communes WHERE slug = ?')
        .get(item.communeSlug) as { id: string } | undefined;
      if (!commune) continue;
      const id = randomUUID();
      db.prepare(
        `INSERT INTO vehicles (
           id, slug, reference, title_fr, title_ar, description_fr, description_ar,
           brand, model, year, category, transmission, fuel, seats, doors, deal_type,
           daily_price, sale_price, currency, commune_id, lat, lng, coordinate_precision,
           mileage_km, features, availability_status, featured, status, is_demo,
           published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DZD', ?, ?, ?, 'commune', ?, ?, 'available', 0, 'published', 1, ?, ?, ?)`,
      ).run(
        id,
        item.slug,
        item.reference,
        item.titleFr,
        item.titleAr,
        item.descFr,
        item.descAr,
        item.brand,
        item.model,
        item.year,
        item.category,
        item.transmission,
        item.fuel,
        item.seats,
        item.doors,
        item.dealType,
        item.dailyPrice,
        item.salePrice,
        commune.id,
        null,
        null,
        item.mileageKm,
        JSON.stringify(item.features),
        now,
        now,
        now,
      );
      db.prepare(
        `INSERT INTO media (id, entity_type, entity_id, url, alt_fr, alt_ar, width, height,
                            sort_order, credit, source_url, license, created_at)
         VALUES (?, 'vehicle', ?, ?, ?, ?, 960, 640, 0, ?, NULL, ?, ?)`,
      ).run(
        randomUUID(),
        id,
        item.image,
        `Visuel de démonstration — ${item.brand} ${item.model}`,
        `صورة توضيحية — ${item.brand} ${item.model}`,
        'RAYANE AFFAIRE — visuel de démonstration',
        'Propriété de RAYANE AFFAIRE',
        now,
      );
    }
  });

  console.log(`✔ ${PROPERTIES.length} demonstration properties and ${VEHICLES.length} vehicles inserted.`);
  console.log('  They are flagged is_demo = 1, badged in the UI, and excluded from public statistics.');
  console.log('  Remove them with: npm run db:seed:demo -- --purge');
}

void sql;
main();

/**
 * Béjaïa launch-market communes — VERIFIED GEOGRAPHY.
 *
 * Provenance: every centroid below was returned by the OpenStreetMap Nominatim
 * geocoder for the commune's own administrative boundary relation, in the
 * wilaya of Béjaïa (code 06). `osmRelationId` is the OSM relation the centroid
 * came from, so any coordinate can be re-verified in one request:
 *
 *   https://nominatim.openstreetmap.org/lookup?osm_ids=R<osmRelationId>&format=jsonv2
 *   https://www.openstreetmap.org/relation/<osmRelationId>
 *
 * Data © OpenStreetMap contributors, ODbL 1.0.
 *
 * IMPORTANT: these are *commune centroids*, not property addresses. They exist
 * so filters, distance sorting and the commune-level map fallback work. A
 * property's own coordinates are stored separately and its precision
 * (`exact` / `approximate` / `commune` / `pending`) is always shown publicly.
 * Do not add a commune here without a verifiable source.
 */

export interface CommuneSeed {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  lat: number;
  lng: number;
  defaultZoom: number;
  osmRelationId: string;
}

export const BEJAIA_COMMUNES: CommuneSeed[] = [
  { id: 'commune-bejaia', slug: 'bejaia', nameFr: 'Béjaïa', nameAr: 'بجاية', lat: 36.7511783, lng: 5.0643687, defaultZoom: 13, osmRelationId: '2094122' },
  { id: 'commune-amizour', slug: 'amizour', nameFr: 'Amizour', nameAr: 'أميزور', lat: 36.6439022, lng: 4.9036535, defaultZoom: 13, osmRelationId: '4112937' },
  { id: 'commune-el-kseur', slug: 'el-kseur', nameFr: 'El Kseur', nameAr: 'القصر', lat: 36.6794351, lng: 4.8523757, defaultZoom: 13, osmRelationId: '4067937' },
  { id: 'commune-akbou', slug: 'akbou', nameFr: 'Akbou', nameAr: 'أقبو', lat: 36.4597538, lng: 4.5289243, defaultZoom: 13, osmRelationId: '4069688' },
  { id: 'commune-aokas', slug: 'aokas', nameFr: 'Aokas', nameAr: 'أوقاس', lat: 36.6376518, lng: 5.2453122, defaultZoom: 13, osmRelationId: '4112961' },
  { id: 'commune-tichy', slug: 'tichy', nameFr: 'Tichy', nameAr: 'تيشي', lat: 36.668951, lng: 5.1574875, defaultZoom: 13, osmRelationId: '4112952' },
  { id: 'commune-tala-hamza', slug: 'tala-hamza', nameFr: 'Tala Hamza', nameAr: 'تالة حمزة', lat: 36.7029253, lng: 5.0394177, defaultZoom: 13, osmRelationId: '4112949' },
  { id: 'commune-oued-ghir', slug: 'oued-ghir', nameFr: 'Oued Ghir', nameAr: 'وادي غير', lat: 36.7106296, lng: 4.9782915, defaultZoom: 13, osmRelationId: '4067884' },
  { id: 'commune-kherrata', slug: 'kherrata', nameFr: 'Kherrata', nameAr: 'خراطة', lat: 36.4936262, lng: 5.2771041, defaultZoom: 13, osmRelationId: '4112854' },
  { id: 'commune-darguina', slug: 'darguina', nameFr: 'Darguina', nameAr: 'درقينة', lat: 36.564307, lng: 5.3063118, defaultZoom: 13, osmRelationId: '4112864' },
  { id: 'commune-sidi-aich', slug: 'sidi-aich', nameFr: 'Sidi-Aïch', nameAr: 'سيدي عيش', lat: 36.6127914, lng: 4.6913091, defaultZoom: 13, osmRelationId: '4069476' },
];

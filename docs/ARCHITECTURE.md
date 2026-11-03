# Architecture

## 1. Vue d'ensemble

```
Navigateur
   │  HTML rendu serveur + îlots clients (React 19)
   ▼
middleware.ts ─── CSP à nonce, HSTS (prod), en-têtes de sécurité,
   │              garde de présence du cookie /admin → /admin/login
   ▼
App Router (Next.js 15.5, Node runtime)
   ├── Server Components (site public + pages /admin)  ──► lib/db/*  ──► SQLite
   ├── Client Components (formulaires, carte, upload)  ──► /api/*
   └── Route Handlers (/api/*)  ──► lib/server/{authz,session,upload,audit}
                                        └──► lib/db/*
                                                       │
                                            data/rayane.db (WAL)
                                            data/uploads/*.png|jpg|webp|avif
```

Aucun état métier ne vit dans le navigateur : React ne conserve que l'état de
formulaire et la préférence de langue (cookie). C'est la différence
architecturale majeure avec le projet de référence, qui stockait tout dans
`localStorage`.

## 2. Pile technique

| Couche | Choix | Raison |
| --- | --- | --- |
| Framework | Next.js 15.5 (App Router) | Rendu serveur, routes API, métadonnées, existant conservé |
| UI | React 19, TypeScript 5.7, Tailwind 3.4 | Existant conservé ; classes utilitaires, pas de CSS-in-JS |
| Primitives | Radix UI + composants maison (`components/ui`) | Accessibilité (focus, clavier, ARIA) sans dépendance lourde |
| Icônes | lucide-react | Cohérence visuelle |
| Carte | Leaflet 1.9 + react-leaflet 5 + markercluster | Tuiles OpenStreetMap, pas de clé API, attribution obligatoire |
| Base | SQLite via `node:sqlite` | Aucun service externe, sauvegarde = un fichier, suffisant pour un inventaire d'agence |
| Validation | Zod 3 | Une seule source de vérité, messages convertis en clés i18n |
| Tests | Vitest 3 | Rapide, ESM natif, aucune configuration de navigateur requise |

### Pourquoi SQLite et pas PostgreSQL

Le volume réel d'une agence locale (centaines de biens, milliers de demandes) ne
justifie pas un serveur de base de données, et l'hébergement cible ne dispose pas
forcément d'un service managé. `node:sqlite` (natif, Node ≥ 22.5) supprime toute
dépendance de compilation. **Limite assumée** : un seul nœud applicatif, pas de
réplication. Le passage à PostgreSQL est décrit en §8 et reste localisé aux
fichiers `lib/db/*`.

## 3. Découpage des couches

### `app/` — routage

- **Server Components** par défaut : lecture directe de la base, aucun appel HTTP
  interne. Les pages publiques sont `force-dynamic` ou mises en cache selon la
  fraîcheur nécessaire ; les pages `/admin` sont toujours dynamiques.
- **Route Handlers** pour toute écriture et pour les uploads.
- `app/admin/layout.tsx` vérifie la session **en base** à chaque requête : le
  middleware ne fait qu'un contrôle de présence de cookie (rapide, sans I/O).

### `lib/db/` — accès aux données

Un fichier par domaine (`properties`, `vehicles`, `inquiries`, `reservations`,
`customers`, `media`, `admin-users`, `communes`, `stats`, `admin-listings`).
Chaque fichier :

1. commence par `import '@/lib/server/guard'` — ce module lève une erreur s'il est
   évalué dans un bundle client, ce qui empêche `node:sqlite` de fuiter vers le
   navigateur (erreur déjà rencontrée, voir `docs/IMPLEMENTATION_REPORT.md`) ;
2. expose des fonctions typées qui renvoient des objets du domaine
   (`types/index.ts`), jamais des lignes SQL brutes ;
3. utilise des requêtes préparées avec paramètres liés (aucune concaténation SQL).

### `lib/server/` — sécurité et transport

| Fichier | Responsabilité |
| --- | --- |
| `guard.ts` | Interdit l'import côté client des modules serveur |
| `env.ts` | Lecture paresseuse et validation des secrets |
| `password.ts` | scrypt + politique de robustesse |
| `session.ts` | Émission, résolution, révocation, cookies |
| `credentials.ts` | Extraction cookie/en-tête depuis une `Request` |
| `authz.ts` | `requireAdmin(minRole, credentials)`, `HttpError`, matrice de rôles |
| `rate-limit.ts` | Compteur durable en base, identifiants hachés |
| `audit.ts` | Journal des mutations |
| `upload.ts` | Détection par *magic bytes*, quota, nommage UUID |
| `api.ts` | Enveloppe de réponse, même-origine, IP cliente |

### `components/`

`ui/` (primitives), `layout/` (en-tête, pied de page), `shared/` (badges, cartes
vides), `home/`, `properties/`, `vehicles/`, `map/`, `admin/`. Les composants
clients ne lisent jamais la base : ils reçoivent des props sérialisables
(le provider i18n est le seul contexte client).

### `lib/i18n/`

- `dictionaries/fr.ts` et `ar.ts` : deux objets dont **les clés sont vérifiées à la
  compilation** (`Widen<T>` force la parité) ;
- `locale.ts` : helpers isomorphes (`resolveLocale`, `dirFor`, `bcp47`) — sans
  `'use client'`, donc utilisables côté serveur ;
- `index.tsx` : provider client (`useI18n`) exposant `t`, `locale`, `dir`,
  `setLocale`, `pick`.

La locale est lue sur le serveur depuis le cookie `ra_locale` et posée sur
`<html lang dir>`, ce qui évite tout flash de direction (FOUC) en arabe.

## 4. Flux d'une écriture (exemple : publier un bien)

```
Client Component (property-form)
   │ adminFetch('/api/admin/properties/:id', PATCH, { statusOnly: 'published' })
   │   └─ copie le cookie ra_csrf dans l'en-tête x-ra-csrf
   ▼
Route Handler
   ├─ isSameOrigin(request)                 → 403 si cross-origin
   ├─ requireAdmin('editor', credentials)   → 401 session absente/expirée/révoquée
   │                                        → 403 rôle insuffisant, CSRF invalide
   ├─ zod safeParse                         → 422 + codes i18n par champ
   ├─ setPropertyStatus()                   → transaction SQLite
   │     └─ re-vérifie la présence d'un média (422 MEDIA_REQUIRED)
   ├─ recordAudit(session, 'property.status', …)
   └─ 200 { ok: true, data }
```

Le contrôle des médias est refait **côté serveur** : l'interface ne peut pas
contourner la règle « pas de publication sans photo ».

## 5. Flux d'une lecture publique

Les pages publiques interrogent directement `lib/db/*` (pas de `fetch` interne),
filtrent `status = 'published' AND is_demo = 0` là où c'est requis, et rendent le
HTML côté serveur. Les statistiques de la page d'accueil sont des agrégats SQL
exécutés à chaque requête ; sans données, elles valent zéro.

## 6. Carte et précision géographique

```
PropertyPoint = { id, lat, lng, precision: 'exact' | 'approximate' | 'commune' }
```

- `listPropertyMapPoints()` ne renvoie que les annonces publiées dont
  `coordinate_precision <> 'pending'` — donc avec des coordonnées non nulles,
  garanti par la contrainte `CHECK` du schéma ;
- la couleur et la taille du marqueur encodent la précision, une légende
  l'explique, et le popup rappelle le niveau ;
- la page `/map` affiche séparément le nombre d'annonces **sans** position
  vérifiée, plutôt que de les regrouper au centre de la commune ;
- Leaflet est chargé côté client uniquement (`dynamic(..., { ssr: false })`), les
  tuiles viennent d'OpenStreetMap (attribution affichée, ODbL).

## 7. Internationalisation et RTL

| Aspect | Implémentation |
| --- | --- |
| Locale par défaut | `fr`, LTR |
| Bascule | Cookie `ra_locale`, `SameSite=Lax`, 1 an |
| Rendu | `<html lang="ar" dir="rtl">` calculé côté serveur |
| Mise en page | Classes logiques (`ps-*`, `pe-*`, `ms-*`, `me-*`, `text-start`) — aucun `left`/`right` codé en dur |
| Nombres | Toujours en chiffres latins ; groupement à la française pour les deux langues (voir `docs/IMPLEMENTATION_REPORT.md`, §Corrections) |
| Erreurs | Le serveur renvoie des **clés** (`form.phoneInvalid`), le client les traduit |

## 8. Évolutions prévues

1. **PostgreSQL** : réécrire `db/client.ts` et les requêtes de `lib/db/*` ; le reste
   de l'application est inchangé.
2. **Stockage objet** (S3/R2) : remplacer `lib/server/upload.ts` ; `media.url`
   stocke déjà une URL, la route `/api/media/[file]` ne sert que le stockage local.
3. **Réservations en libre-service** : le schéma et les statuts sont en place ; il
   reste la validation de disponibilité et le paiement.
4. **Notifications** : un courriel ou message WhatsApp à chaque nouvelle demande
   (aujourd'hui la demande est uniquement persistée et visible dans `/admin`).

## 9. Réglages opérationnels (visibilité de la location de véhicules)

Certaines décisions ne relèvent pas du code mais de l'activité réelle de l'agence.
Elles vivent dans la table `settings` et sont modifiables depuis
`/admin/settings`, sans redéploiement.

```
settings.vehicle_rental_enabled = 'true' | 'false'   (défaut 'true')

lib/settings.ts             définition + valeurs autorisées (sans import de base)
lib/db/settings.ts          lecture/écriture (isVehicleRentalEnabled)
/api/admin/settings  PATCH  manager + CSRF + validation stricte + audit
components/admin/vehicle-rental-toggle.tsx   interface (role="switch")
```

Le drapeau est lu par `PublicShell` (une fois par page publique) et transmis aux
menus, puis par chaque lecteur qui sert des véhicules :

| Couche | Effet quand la location est désactivée |
| --- | --- |
| `buildVehicleWhere` | exclut les annonces **uniquement** de location (`rent`) ; conserve `sale` **et** `both` |
| `getVehicleBySlug` | même règle ⇒ `404` pour une annonce `rent` ; `sale` et `both` restent accessibles |
| `listFeaturedVehicles` | même règle ⇒ la une montre l'inventaire de vente |
| `listSimilarVehicles` | même règle ⇒ pas de location suggérée |
| `getPublicStats` | compte l'inventaire de vente réellement visible |
| `countPublicSaleVehicles` | alimente le menu, le CTA du héros et le sitemap |
| `sitemap.ts` | `/vehicles` et les fiches de vente restent listés ; les URL de location disparaissent |

### Ce que « conserver la vente » veut dire exactement

Une première version désactivait la location en retirant **toute** la surface
véhicules : entrée de menu, bloc de la une, URL du sitemap. Les annonces de vente
restaient en base mais devenaient introuvables — le réglage masquait donc la
vente, contrairement à l'exigence. Comportement actuel, par type d'annonce :

| `deal_type` | Location activée | Location désactivée |
| --- | --- | --- |
| `sale` | visible, prix de vente | **visible à l'identique** |
| `rent` | visible, prix/jour | **invisible** (`404`, hors menu, hors sitemap) |
| `both` | visible, prix/jour **et** prix de vente | **visible comme une vente** : badge « Vente », prix de vente seul, prix/jour retiré |

La projection de `both` est une **vue**, pas une écriture : `projectVehicleForPublic`
(`lib/settings.ts`) transforme `{dealType:'both', dailyPrice, salePrice}` en
`{dealType:'sale', dailyPrice:null, salePrice}` au moment du rendu public. La ligne
en base conserve `deal_type='both'` et ses deux prix, donc réactiver la location
restaure l'affichage d'origine sans migration ni perte de donnée. Les lecteurs
d'administration (`getVehicleById`, `listAdminVehicles`) ne projettent jamais :
l'opérateur voit toujours le type réel et les deux prix.

`both` ne peut pas exister sans prix de vente : la table impose
`CHECK (deal_type <> 'both' OR (daily_price IS NOT NULL AND sale_price IS NOT NULL))`.
La requête publique revérifie tout de même `sale_price IS NOT NULL`
(`SAFE_PROJECTION_SQL`) — défense en profondeur si un jour la contrainte était
assouplie.

### Conséquence sur la navigation et le référencement

Le menu ne peut pas être simplement « avec » ou « sans » entrée véhicules :

| Situation | Menu | Sitemap |
| --- | --- | --- |
| Location activée | « Véhicules » → `/vehicles` | `/vehicles` + fiches |
| Location désactivée, stock de vente présent | « Véhicules à vendre » → `/vehicles` | `/vehicles` + fiches de vente |
| Location désactivée, aucun stock de vente | entrée retirée | `/vehicles` absent |

Le libellé change parce que la promesse change : un lien « Véhicules » ouvrant un
catalogue sans location serait trompeur. L'entrée n'est retirée que lorsqu'il n'y
a réellement rien à vendre, pour ne pas mener à un catalogue vide.

### Piège à connaître : `loading.tsx` et les codes de statut

Un `loading.tsx` place la route (et ses enfants) dans une frontière Suspense.
La réponse commençant alors à être diffusée avant que `notFound()` ne soit levé,
le statut reste **200** avec un corps « page introuvable » — un *soft 404*.
Constaté sur `/vehicles/[slug]` et `/properties/[slug]` à cause du
`loading.tsx` racine, puis du `loading.tsx` de segment. Conclusion appliquée :
aucun `loading.tsx` sur un segment possédant un enfant dynamique qui appelle
`notFound()` ; le squelette de chargement est conservé sur `/map`, route feuille.
`npm run smoke` vérifie désormais explicitement ce comportement.

## 10. Décisions et compromis

| Décision | Compromis accepté |
| --- | --- |
| SQLite | Pas de montée en charge horizontale |
| Pas d'ORM | Requêtes explicites, mais migrations écrites à la main |
| CSS utility-first | Pas de thème dynamique runtime (non demandé) |
| `node:sqlite` expérimental | Avertissement au démarrage, à documenter en production |
| Vitest sans navigateur | Pas de test visuel automatique ; vérification manuelle de la mise en page |

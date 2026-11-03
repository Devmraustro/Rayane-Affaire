# Schéma de la base de données

Moteur : **SQLite** (`node:sqlite`, Node ≥ 22.5), mode WAL, `PRAGMA foreign_keys = ON`.
Schéma de référence : `db/schema.sql`. Migration : `npm run db:migrate`.
Chemin par défaut : `data/rayane.db` (surchargeable par `DATABASE_PATH`).

**12 tables · 21 index · contraintes `CHECK` et `FOREIGN KEY` actives.**

Conventions :

- identifiants : `TEXT` contenant un UUID v4 ;
- montants : `INTEGER` en dinars algériens (DZD), jamais de flottant pour de l'argent ;
- dates : `TEXT` ISO-8601 UTC (`2024-09-12T10:00:00.000Z`) ou `TEXT` de date
  (`2024-09-12`) pour les périodes de réservation ;
- champs bilingues : suffixe `_fr` / `_ar` (les deux sont obligatoires pour les
  titres, facultatifs pour les descriptions) ;
- booléens : `INTEGER` 0/1 avec `CHECK (col IN (0,1))` ;
- listes (`amenities`, `features`) : JSON sérialisé dans une colonne `TEXT`.

---

## 1. `communes` — référentiel géographique

| Colonne | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | ex. `commune-bejaia` |
| `slug` | TEXT UNIQUE | ex. `bejaia` |
| `name_fr`, `name_ar` | TEXT NOT NULL | |
| `wilaya`, `wilaya_code` | TEXT | `Béjaïa`, `06` |
| `lat`, `lng` | REAL NOT NULL | centroïde du polygone administratif |
| `osm_relation_id` | INTEGER | identifiant de relation OpenStreetMap |
| `active` | INTEGER | 0/1 |
| `created_at` | TEXT | |

**Source des 11 communes** : OpenStreetMap via Nominatim, centroïdes de la
relation administrative (ODbL, attribution requise). Le tableau complet figure
dans `docs/IMPLEMENTATION_REPORT.md` §Géodonnées. Aucune coordonnée n'a été
estimée à la main.

---

## 2. `properties` — biens

| Colonne | Type | Contrainte |
| --- | --- | --- |
| `id` | TEXT PK | UUID |
| `slug` | TEXT UNIQUE | généré depuis le titre français |
| `reference` | TEXT UNIQUE | `RA-P-####`, séquence monotone |
| `title_fr`, `title_ar` | TEXT NOT NULL | |
| `description_fr`, `description_ar` | TEXT | |
| `category` | TEXT | `apartment` `studio` `villa` `house` `commercial` `land` `office` |
| `transaction_type` | TEXT | `rent_annual` `rent_short` `sale` `exchange` |
| `price` | INTEGER | `>= 0` |
| `price_unit` | TEXT | `month` `night` `total` |
| `currency` | TEXT | `DZD` |
| `commune_id` | TEXT FK → `communes.id` | `ON DELETE RESTRICT` |
| `address_fr`, `address_ar` | TEXT | quartier, jamais une adresse inventée |
| `lat`, `lng` | REAL NULL | |
| `coordinate_precision` | TEXT | `exact` `approximate` `commune` `pending` |
| `surface` | INTEGER | m² |
| `bedrooms`, `bathrooms`, `floor` | INTEGER | |
| `furnishing` | TEXT | `furnished` `unfurnished` `semi_furnished` |
| `amenities` | TEXT | JSON |
| `availability_status` | TEXT | `available` `reserved` `unavailable` |
| `available_from` | TEXT NULL | |
| `featured` | INTEGER | 0/1 |
| `video_url` | TEXT NULL | URL externe |
| `status` | TEXT | `draft` `published` `archived` |
| `is_demo` | INTEGER | 0/1, exclu des statistiques publiques |
| `published_at`, `created_at`, `updated_at` | TEXT | |

**Contrainte clé** :

```sql
CHECK (
  (coordinate_precision = 'pending' AND lat IS NULL AND lng IS NULL)
  OR
  (coordinate_precision <> 'pending' AND lat IS NOT NULL AND lng IS NOT NULL
   AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
)
```

Conséquence : il est **impossible** d'enregistrer une position « en attente » avec
des coordonnées, donc impossible d'afficher un marqueur inventé.

---

## 3. `vehicles` — véhicules

Colonnes principales : `slug`, `reference` (`RA-V-####`), `title_fr/ar`,
`description_fr/ar`, `brand`, `model`, `year`, `category`
(`economy` `sedan` `suv` `luxury` `utility` `van`), `transmission`
(`manual` `automatic`), `fuel` (`petrol` `diesel` `hybrid` `electric` `lpg`),
`seats`, `doors`, `deal_type` (`rent` `sale` `both`), `daily_price`,
`sale_price`, `currency`, `commune_id` FK, `lat`, `lng`,
`coordinate_precision` (+ même `CHECK` que `properties`), `mileage_km`,
`features` (JSON), `availability_status`, `featured`, `status`, `is_demo`,
`published_at`, `created_at`, `updated_at`.

Règles applicatives complémentaires (validées par Zod) : `deal_type = 'rent'`
exige `daily_price`, `deal_type = 'sale'` exige `sale_price`, `deal_type = 'both'`
exige les deux.

---

## 4. `media` — photographies

| Colonne | Type | Notes |
| --- | --- | --- |
| `id` | TEXT PK | UUID |
| `entity_type` | TEXT | `property` `vehicle` |
| `entity_id` | TEXT | identifiant de l'annonce |
| `url` | TEXT NOT NULL | `/api/media/<uuid>.png` ou URL absolue |
| `alt_fr`, `alt_ar` | TEXT NOT NULL | accessibilité bilingue (défaut fourni par le serveur si absent) |
| `width`, `height` | INTEGER | |
| `sort_order` | INTEGER | ordre de la galerie |
| `credit` | TEXT NULL | auteur / agence (l'interface l'exige, la base le tolère) |
| `source_url` | TEXT NULL | provenance |
| `license` | TEXT NULL | licence ou mention « propriété du client » |
| `created_at` | TEXT | |

Suppression en cascade applicative : supprimer une annonce supprime ses lignes
`media` **et** les fichiers correspondants (transaction + nettoyage disque).

---

## 5. `customers`

`id`, `full_name`, `phone` (normalisé `0XXXXXXXXX`), `email` NULL, `type`
(`individual` `company`), `notes`, `created_at`, `updated_at`.
Un client est créé lors de sa première réservation ; aucune fiche n'est
pré-remplie.

---

## 6. `inquiries` — demandes entrantes

`id`, `reference` (`RA-DEM-####`), `type` (`property` `vehicle` `service` `general`),
`property_id` / `vehicle_id` (FK NULL), `full_name`, `phone`, `email`,
`message`, `preferred_channel` (`phone` `whatsapp` `email`), `status`
(`new` `contacted` `qualified` `won` `lost` `spam`), `admin_notes`,
`source` (`website` `phone` `whatsapp` `walk_in`), `locale`, `ip_hash`,
`created_at`, `updated_at`.

`ip_hash` est un condensé non réversible (FNV-1a) : il sert à la limitation de
débit, jamais à identifier une personne.

---

## 7. `reservations`

| Colonne | Type | Contrainte |
| --- | --- | --- |
| `id` | TEXT PK | UUID |
| `reference` | TEXT UNIQUE | `RA-RES-####` |
| `kind` | TEXT | `property` \| `vehicle` |
| `property_id` / `vehicle_id` | TEXT FK | `ON DELETE SET NULL` |
| `customer_id` | TEXT FK → `customers.id` | `ON DELETE RESTRICT` |
| `item_title_fr`, `item_title_ar`, `item_reference` | TEXT | copie de l'annonce au moment de la réservation (l'historique reste lisible si l'annonce est archivée) |
| `start_date`, `end_date` | TEXT (date) | `CHECK (end_date >= start_date)` |
| `amount`, `deposit` | INTEGER | `>= 0`, DZD |
| `status` | TEXT | `pending` `confirmed` `active` `completed` `cancelled` |
| `notes` | TEXT | |
| `is_demo` | INTEGER | 0/1 |
| `created_at`, `updated_at` | TEXT | |

Contrainte d'intégrité :

```sql
CHECK ((kind = 'property' AND property_id IS NOT NULL) OR
       (kind = 'vehicle'  AND vehicle_id  IS NOT NULL))
```

Les revenus affichés dans `/admin/finances` ne comptent que les statuts
`confirmed`, `active` et `completed`, et excluent `is_demo = 1`.

---

## 8. `admin_users`

`id`, `email` UNIQUE (minuscules), `password_hash` (`scrypt$N$r$p$salt$hash`),
`full_name`, `role` (`owner` `manager` `editor`), `active`, `last_login_at`,
`created_at`, `updated_at`.

Hiérarchie : `editor` (1) < `manager` (2) < `owner` (3). `DELETE` d'une annonce
exige `manager` ou plus ; les autres écritures exigent `editor`.

---

## 9. `admin_sessions`

`id`, `user_id` FK, `token_hash` UNIQUE, `csrf_token`, `expires_at`,
`created_at`, `ip_hash`, `user_agent`.

`token_hash = sha256(token + "." + SESSION_SECRET)` : une copie de la base ne
permet pas de rejouer une session. Durée de vie absolue de 8 h ; révocation
immédiate à la déconnexion.

---

## 10. `rate_limits`

| Colonne | Type | Notes |
| --- | --- | --- |
| `bucket` | TEXT | préfixe + identifiant haché (`login:ip:<hash>`) |
| `window_start` | TEXT | début de la fenêtre courante |
| `count` | INTEGER | incrément |

Clé primaire composite `(bucket, window_start)`. Compteurs durables : ils
survivent à un redémarrage, contrairement à un compteur en mémoire, et
fonctionnent pour plusieurs processus partageant la base.

---

## 11. `audit_log`

`id`, `actor_id`, `actor_email`, `action` (ex. `property.delete`),
`entity_type`, `entity_id`, `detail` (JSON), `created_at`.
Écrit à chaque mutation réussie ; consulté dans `/admin/settings`.

---

## 12. `settings`

Magasin clé/valeur (`key` PK, `value`, `updated_at`) réservé aux réglages
modifiables sans redéploiement. Les secrets **n'y sont jamais stockés** : ils
restent dans l'environnement.

| Clé | Valeurs | Défaut | Effet |
| --- | --- | --- | --- |
| `vehicle_rental_enabled` | `'true'` \| `'false'` | `'true'` | Expose ou masque l'offre de location de véhicules sur le site public (voir `docs/API_DOCUMENTATION.md`) |

Insérée par la migration `db/migrations/001_vehicle_rental_setting.sql`
(`ON CONFLICT DO NOTHING`, donc un choix déjà enregistré n'est jamais écrasé).
Une valeur illisible est traitée comme le défaut ; une ligne absente aussi, ce
qui rend le réglage rétro-compatible avec une base migrée avant son existence.

**Le défaut `'true'` préserve le comportement antérieur** : déployer ce réglage
ne change rien tant qu'un opérateur ne le désactive pas explicitement.

---

## Index (21)

| Table | Index |
| --- | --- |
| `properties` | `status`, `(status, is_demo, published_at DESC)` — *index public*, `commune_id`, `transaction_type`, `category`, `price`, `(lat, lng)` |
| `vehicles` | `status`, `(status, is_demo, published_at DESC)`, `commune_id`, `category`, `deal_type` |
| `media` | `(entity_type, entity_id, sort_order)` |
| `inquiries` | `(status, created_at DESC)`, `(created_at DESC)` |
| `reservations` | `(start_date, end_date)`, `status`, `is_demo` |
| `admin_sessions` | `user_id`, `expires_at` (+ `UNIQUE` sur `token_hash`) |
| `audit_log` | `(created_at DESC)` |

Les colonnes `UNIQUE` (`slug`, `reference`, `email`, `token_hash`) créent des
index implicites supplémentaires.

---

## Migrations

- `npm run db:migrate` exécute `db/schema.sql` (idempotent : `CREATE TABLE IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`), puis applique les fichiers numérotés présents dans
  `db/migrations/` qui n'ont pas encore été joués, puis (ré)alimente le
  référentiel des communes.
- `npm run db:reset` supprime le fichier de base et repart du schéma — **outil de
  développement uniquement**, jamais à lancer en production.
- Toute évolution ultérieure s'ajoute sous forme de fichier numéroté dans
  `db/migrations/` (voir le `README.md` du dossier). Ne jamais modifier une
  migration déjà appliquée en production.

## Sauvegarde et restauration

```bash
# sauvegarde cohérente (WAL inclus)
sqlite3 data/rayane.db ".backup 'backup-$(date +%F).db'"
# restauration
systemctl stop rayane && cp backup-2026-11-03.db data/rayane.db && systemctl start rayane
```

Sauvegarder aussi `data/uploads/` (photographies) — la base ne contient que les
URL.

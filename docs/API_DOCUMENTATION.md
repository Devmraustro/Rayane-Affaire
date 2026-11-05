# Documentation de l'API

Toutes les routes sont servies par le runtime Node de Next.js (App Router).
Base : `NEXT_PUBLIC_SITE_URL` (ex. `https://rayane-affaire.dz`).

## Format des réponses

Succès :

```json
{ "ok": true, "data": { … } }
```

Erreur :

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION",
    "message": "Invalid property payload.",
    "fields": { "titleFr": "admin.validation.titleRequired" }
  }
}
```

- `code` est stable et destiné au code appelant.
- `fields` n'apparaît que pour les erreurs de validation ; les valeurs sont des
  **clés de traduction** (`admin.validation.*`, `form.*`) que le client traduit
  dans la langue active — le serveur ne renvoie jamais de phrase française.

### Codes d'erreur

| Code | HTTP | Signification |
| --- | --- | --- |
| `VALIDATION` | 422 | Charge utile invalide (`fields` détaillé) |
| `BAD_REQUEST` | 400 | JSON illisible |
| `UNAUTHORIZED` | 401 | Aucune session valide |
| `INVALID_CREDENTIALS` | 401 | E-mail ou mot de passe incorrect (message volontairement générique) |
| `FORBIDDEN` | 403 | Origine différente ou rôle insuffisant |
| `CSRF` | 403 | Jeton CSRF absent ou incorrect |
| `NOT_FOUND` | 404 | Ressource inexistante |
| `RATE_LIMITED` | 429 | Trop de requêtes (en-tête `Retry-After`) |
| `MEDIA_REQUIRED` | 422 | Publication refusée : aucune photo |
| `REFERENCE_TAKEN` | 422 | Référence déjà utilisée |
| `SERVER_ERROR` | 500 | Erreur interne (aucun détail exposé) |

### Sécurité des écritures

Toute route `/api/admin/*` exige **simultanément** :

1. un cookie `ra_session` correspondant à une ligne `admin_sessions` non expirée
   (compte `active = 1`, rôle suffisant) ;
2. l'en-tête `x-ra-csrf` égal au jeton CSRF de cette session (double soumission) ;
3. une origine identique (`Origin` = `Host`), sinon `403`.

Chaque mutation réussie écrit une ligne dans `audit_log`.

---

## Public

### `POST /api/inquiries`

Crée une demande de contact. Protégé par un quota par IP et par un champ piège.

Requête :

```json
{
  "fullName": "Amine Boudiaf",
  "phone": "0550 12 34 56",
  "email": "amine@example.dz",
  "message": "Bonjour, je cherche un F3 à Béjaïa pour 45 000 DA par mois.",
  "consent": true,
  "preferredChannel": "whatsapp",
  "type": "property",
  "propertyId": "5f0c…",
  "locale": "fr",
  "website": ""
}
```

| Champ | Règle |
| --- | --- |
| `fullName` | 2–80 caractères |
| `phone` | normalisé en `0XXXXXXXXX` (formats `0X…`, `+213X…`, `00213X…`) |
| `email` | facultatif, sinon adresse valide |
| `message` | 10–2000 caractères |
| `consent` | doit valoir `true` |
| `type` | `property` `vehicle` `service` `general` |
| `propertyId` / `vehicleId` | UUID facultatif |
| `website` | **doit rester vide** (champ piège anti-robot) |
| `locale` | `fr` ou `ar` |

Réponse `200` :

```json
{ "ok": true, "data": { "received": true, "id": "0b1f…" } }
```

Erreurs : `422 VALIDATION` (avec `fields`), `429 RATE_LIMITED`.

> `consent` est enregistré avec la demande : la preuve de consentement est
> conservée côté serveur, pas seulement affichée dans le formulaire.

### `GET /api/media/[file]`

Sert une photographie téléversée. Le nom doit correspondre exactement à
`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif)$` ;
toute autre valeur renvoie `404` (aucune traversée de répertoire possible).
Réponse : `Content-Type` déduit de l'extension **whitelistée**,
`X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=31536000, immutable`.

---

## Authentification

### `POST /api/auth/login`

```json
{ "email": "direction@example.dz", "password": "…" }
```

Réponse `200` :

```json
{
  "ok": true,
  "data": {
    "user": { "id": "…", "email": "…", "fullName": "…", "role": "owner" }
  }
}
```

En-têtes `Set-Cookie` :

| Cookie | Attributs | Rôle |
| --- | --- | --- |
| `ra_session` | `HttpOnly; SameSite=Lax; Path=/; Expires=+8h` (`Secure` en prod) | Jeton de session (valeur aléatoire de 32 octets, hachée en base) |
| `ra_csrf` | `SameSite=Lax; Path=/` (**non** HttpOnly, lisible par l'interface) | Jeton à recopier dans `x-ra-csrf` |

Erreurs : `401 INVALID_CREDENTIALS` (identique pour e-mail inconnu, mot de passe
faux ou compte désactivé — aucune énumération de comptes), `403 FORBIDDEN`
(origine différente), `409 NOT_CONFIGURED` (aucun administrateur en base),
`429 RATE_LIMITED`, `422 VALIDATION`.

### `POST /api/auth/logout`

Révoque la session **en base** puis efface les deux cookies.

```json
{ "ok": true, "data": { "signedOut": true } }
```

### Cycle de vie du mot de passe

- `POST /api/auth/change-password` : session + CSRF, corps
  `{ currentPassword, newPassword }`. Autorisé pendant le changement forcé ;
  conserve la session courante et révoque les autres.
- `POST /api/auth/forgot-password` : corps `{ email }`, même origine, 5 essais /
  15 min / IP. Réponse générique `{ accepted: true }`, que le compte ou la
  livraison existe ou non. Avec Resend configuré, envoie un lien de 30 minutes.
- `POST /api/auth/reset-password` : corps `{ token, password }`, 8 essais / 15 min /
  IP. Jeton à usage unique ; `400 INVALID_RESET_TOKEN` si invalide, expiré ou
  consommé. Toutes les sessions du compte sont révoquées après succès.

---

## Administration — biens

### `GET /api/admin/properties` (usage interne)

La liste est lue directement par le Server Component `app/admin/properties`.
Les filtres disponibles dans l'interface : `status`, `q`, `demo`, `geo`.
(Pas d'appel `fetch` interne : le serveur interroge la base.)

### `POST /api/admin/properties`

Rôle requis : `editor`. Charge utile : voir `propertyWriteSchema`
(`lib/validation.ts`).

```json
{
  "titleFr": "Appartement F3 Ihaddaden",
  "titleAr": "شقة F3 إحدادن",
  "descriptionFr": "Trois pièces avec balcon.",
  "descriptionAr": "ثلاث غرف مع شرفة.",
  "category": "apartment",
  "transaction": "rent_annual",
  "price": 45000,
  "priceUnit": "month",
  "communeSlug": "bejaia",
  "surface": 82,
  "bedrooms": 3,
  "bathrooms": 1,
  "furnishing": "unfurnished",
  "coordinatePrecision": "pending",
  "status": "draft"
}
```

Règles notables :

- `titleFr` **et** `titleAr` obligatoires (le site est bilingue) ;
- `lat` et `lng` doivent être fournis ensemble, ou pas du tout ;
- si `coordinatePrecision = "pending"`, les coordonnées sont forcées à `NULL` ;
- la référence (`RA-P-####`) et le slug sont générés et garantis uniques ;
- `status: "published"` exige au moins un média (sinon `422 MEDIA_REQUIRED`).

Réponse `200` : l'annonce créée, avec `id`, `slug`, `reference`.

### `PATCH /api/admin/properties/[id]`

Rôle : `editor`. Accepte soit la charge complète (édition), soit un changement de
statut seul :

```json
{ "statusOnly": "published" }
```

`statusOnly` accepte `draft`, `published`, `archived`. La règle du média est
revérifiée côté serveur.

### `DELETE /api/admin/properties/[id]`

Rôle : **`manager`** minimum. Supprime l'annonce, ses lignes `media` et les
fichiers correspondants dans une transaction, puis journalise l'action.

---

## Administration — véhicules

`GET` (lecture par Server Component), `POST /api/admin/vehicles`,
`PATCH /api/admin/vehicles/[id]`, `DELETE /api/admin/vehicles/[id]` : mêmes
règles et mêmes codes que les biens, avec `vehicleWriteSchema`
(`brand`, `model`, `year` entre 1900 et année+1, `dealType`, `dailyPrice`,
`salePrice`, `transmission`, `fuel`, `seats`, `doors`, …).

Cohérence des prix : `rent` ⇒ `dailyPrice` requis ; `sale` ⇒ `salePrice` requis ;
`both` ⇒ les deux.

---

## Administration — demandes

### `PATCH /api/admin/inquiries/[id]`

Rôle : `editor`.

```json
{ "status": "contacted", "adminNotes": "Rappelé le 12/09, visite samedi." }
```

`status` ∈ `new` `contacted` `qualified` `won` `lost` `spam` ; `adminNotes`
≤ 4000 caractères. Les notes ne sont **jamais** exposées côté public.

---

## Administration — paramètres

### `PATCH /api/admin/settings`

Rôle requis : **`manager`** minimum. Les paramètres modifient la surface
publique et ne sont pas une décision éditoriale mineure.

Le champ principal masque ou expose toute la section ; le second ne s'applique
qu'à une section déjà exposée. Un seul appel peut soumettre l'un ou les deux :

```json
{ "vehiclePublicVisible": false }
```

Réponse `200` (exemple) :

```json
{
  "ok": true,
  "data": {
    "vehiclePublicVisible": false,
    "vehicleRentalEnabled": true,
    "changed": true
  }
}
```

| Champ | Règle |
| --- | --- |
| `vehiclePublicVisible` | booléen strict ; défaut enregistré : `false` |
| `vehicleRentalEnabled` | booléen strict ; défaut enregistré : `true`, consulté seulement si `vehiclePublicVisible` est vrai |
| objet | **strict** : toute clé inconnue est refusée (`422`), aucun réglage inventé n'est accepté |
| corps | au moins une clé, sinon `422` |

Le réglage secondaire est conservé pendant le masquage global : une valeur `true`
peut donc apparaître dans la réponse alors que `vehiclePublicVisible` vaut
`false`. Elle n'a alors aucun effet public ; la bascule principale ne détruit pas
le choix opérationnel de location.

- `changed` vaut `false` quand aucun des réglages fournis n'a changé : aucune
  ligne d'audit n'est alors écrite.
- l'audit enregistre `settings.update` avec les valeurs **avant** et **après**.
- erreurs : `401`, `403` (`FORBIDDEN` / `CSRF`), `400` (JSON illisible),
  `422` (`admin.validation.invalidSetting`).

Effet public immédiat de `vehiclePublicVisible: false` :

| Surface | Comportement |
| --- | --- |
| Navigation | aucune entrée ou libellé véhicule |
| `/vehicles` et `/vehicles/[slug]` | `404`, y compris les fiches existantes |
| Accueil, services, à propos, footer, logo | aucune carte, CTA, sous-titre ou mention véhicule |
| Métadonnées et sitemap | marque immobilière uniquement, aucune URL de véhicule |
| Statistiques publiques | aucun véhicule ou commune de véhicule comptabilisé |
| `POST /api/inquiries` avec `vehicleId` | l'identifiant ne contourne pas le masquage ; demande ramenée au flux général |
| Back-office | inventaire et CRUD inchangés, aucune ligne supprimée |

Quand `vehiclePublicVisible: true`, le réglage secondaire `vehicleRentalEnabled`
retire la location, jamais la vente :

| `deal_type` | Location activée | Location désactivée |
| --- | --- | --- |
| `sale` | visible, prix de vente | **inchangée** |
| `rent` | visible, prix/jour | **`404`**, hors menu et sitemap |
| `both` | visible, prix/jour et prix de vente | visible comme une vente, prix/jour retiré, ligne intacte |

Le basculement restaure la visibilité sans redémarrage ni modification des
annonces. Tests réels : `tests/api.test.ts` et
`tests/vehicle-rental-setting.test.ts`.

---

## Administration — médias

### `POST /api/admin/media`

Rôle : `editor`. `multipart/form-data`.

| Champ | Contenu |
| --- | --- |
| `entityType` | `property`, `vehicle` ou `place` |
| `entityId` | identifiant de l'annonce ou du lieu |
| `files` | 1 à 8 fichiers |
| `altFr`, `altAr` | textes alternatifs bilingues (obligatoires) |
| `credit` | auteur ou agence (obligatoire par le serveur) |
| `license` | licence ou mention de propriété (obligatoire par le serveur) |
| `sourceUrl` | facultatif |

L'interface (`components/admin/media-manager.tsx`) rend le crédit et la licence
obligatoires avant l'envoi ; le serveur les valide aussi et refuse un média qui
en est dépourvu. Ils sont stockés tels quels, jamais inventés.

Validation : 5 Mo maximum par fichier, 8 fichiers par requête, type réel
déterminé par les **magic bytes** (JPEG, PNG, WebP, AVIF) et non par le
`Content-Type` annoncé ; SVG, HTML ou PHP sont rejetés même renommés en `.png`.
Nom de fichier généré (UUID), donc aucune donnée utilisateur dans le chemin.
Avant toute écriture, JPEG/PNG/WebP sont débarrassés des métadonnées EXIF/GPS,
XMP/IPTC, commentaires ou chunks textuels ; les données pixels compressées sont
conservées. Un AVIF portant EXIF/XMP est refusé (HTTP 415,
`UNSTRIPPABLE_METADATA`) car le réécrire sans corrompre ses offsets n'est pas
sûr. Le tag EXIF d'orientation est retiré lui aussi : les images doivent être
réorientées avant l'upload. Quota dédié : 40 envois par 10 minutes et par IP.

Réponse `200` :

```json
{ "ok": true, "data": [{ "id": "…", "url": "/api/media/15065759-….png" }] }
```

### `DELETE /api/admin/media?id=<uuid>`

Rôle : `editor`. Supprime la ligne **et** le fichier, uniquement si l'URL
correspond au schéma généré par l'application.

### `PATCH /api/admin/media`

Rôle : `editor`. Corps `{ entityType, entityId, mediaIds }`. Exige la liste
complète des médias de la galerie, sans doublon ni élément étranger, puis met à
jour tous les ordres dans une transaction.

### `POST /api/admin/media/cleanup`

Rôle : `manager`. Supprime les fichiers physiques orphelins qui respectent le
schéma de nom généré, sans toucher aux médias référencés en base.

---

## Administration — lieux, comptes et réservations

| Route | Rôle minimal | Effet |
| --- | --- | --- |
| `POST /api/admin/places` | editor | Crée un lieu brouillon/publié selon les règles de média et de coordonnées |
| `PATCH /api/admin/places/[id]` | editor | Met à jour les champs bilingues et le point ; toute modification du point invalide sa vérification |
| `DELETE /api/admin/places/[id]` | manager | Supprime lieu, lignes média puis fichiers générés |
| `POST /api/admin/places/[id]/verify` | editor | Corps `{ verified: boolean }` ; action séparée et auditée, impossible sans coordonnées |
| `GET /api/admin/geocode?q=…` | editor | Recherche Nominatim serveur, 30 requêtes/min/IP ; résultats approximatifs non persistés |
| `POST /api/admin/users` | owner | Crée un compte avec mot de passe temporaire à changement forcé et notifications désactivées |
| `PATCH`/`DELETE /api/admin/users/[id]` | owner | Rôle/activation, reset temporaire ou suppression, avec protection du dernier owner |
| `PATCH /api/admin/notifications` | editor | Met à jour ses propres préférences ; email et chaque catégorie restent nécessaires à l'envoi |
| `POST /api/admin/customers` | editor | Crée/retrouve un client normalisé pour une réservation |
| `POST /api/admin/reservations` | editor | Crée client/réservation après dates strictes et contrôle de chevauchement |
| `PATCH /api/admin/reservations/[id]` | editor | Modifie la réservation en excluant son propre identifiant du contrôle de conflit |
| `DELETE /api/admin/reservations/[id]` | manager | Supprime la réservation et journalise l'action |

Les écritures utilisent l'enveloppe et les protections CSRF communes. Les mots de
passe temporaires ne sont retournés qu'à l'owner dans la réponse de création/reset
et ne sont jamais journalisés.

---

## Cartographie et limitation de débit

- `GET /api/*` n'est pas exposé pour les listes publiques : elles sont rendues
  côté serveur (meilleur SEO, aucune API à sécuriser inutilement).
- Limitation : `login` (par IP **et** par compte), `inquiries`, `media`,
  `geocode`, `forgot` et `reset` (par IP). Compteurs persistés dans
  `rate_limits` ; réponse `429`, avec `Retry-After` lorsque disponible.

## Versions et compatibilité

L'API n'est pas versionnée : elle est consommée uniquement par l'interface du
même déploiement. Toute intégration tierce doit passer par une clé d'API dédiée
(non implémentée — voir `docs/OPENCODE_HANDOFF.md`).

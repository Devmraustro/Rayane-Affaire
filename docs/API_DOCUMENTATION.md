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

Rôle requis : **`manager`** minimum. Changer la visibilité de la location de
véhicules retire une page publique : ce n'est pas une décision de rédaction.

```json
{ "vehicleRentalEnabled": false }
```

Réponse `200` :

```json
{ "ok": true, "data": { "vehicleRentalEnabled": false, "changed": true } }
```

| Champ | Règle |
| --- | --- |
| `vehicleRentalEnabled` | booléen strict |
| objet | **strict** : toute clé inconnue est refusée (`422`), aucun réglage inventé n'est accepté |
| corps | au moins une clé, sinon `422` |

- `changed` vaut `false` quand la valeur soumise est identique à la valeur
  stockée : aucune ligne d'audit n'est alors écrite.
- l'audit enregistre `settings.update` avec la valeur **avant** et **après**.
- erreurs : `401`, `403` (`FORBIDDEN` / `CSRF`), `400` (JSON illisible),
  `422` (`admin.validation.invalidSetting`).

Effet public immédiat de `vehicleRentalEnabled: false` — vérifié de bout en bout :

| Surface | Comportement |
| --- | --- |
| Menu (en-tête, tiroir mobile, pied de page) | entrée « Véhicules » retirée |
| `/vehicles` | reste accessible, devient un catalogue de vente (« Véhicules à vendre ») ; les annonces `rent` et `both` sont exclues |
| `/vehicles/[slug]` | `404` pour une annonce `rent` ou `both` |
| Une de la page d'accueil | bloc véhicules et CTA « Louer un véhicule » retirés |
| Bandeau de chiffres | tuile « Véhicules publiés » retirée (pas de zéro trompeur) |
| `/services` | carte « Location de véhicules » retirée |
| `sitemap.xml` | `/vehicles` et les fiches véhicules retirés |
| Back-office | **inchangé** : tout l'inventaire reste visible et modifiable |
| Immobilier | **inchangé** dans les deux états |

---

## Administration — médias

### `POST /api/admin/media`

Rôle : `editor`. `multipart/form-data`.

| Champ | Contenu |
| --- | --- |
| `entityType` | `property` ou `vehicle` |
| `entityId` | identifiant de l'annonce |
| `files` | 1 à 8 fichiers |
| `altFr`, `altAr` | textes alternatifs bilingues (obligatoires) |
| `credit` | auteur ou agence (fortement recommandé ; `NULL` accepté en base) |
| `license` | licence ou mention de propriété (fortement recommandé) |
| `sourceUrl` | facultatif |

L'interface (`components/admin/media-manager.tsx`) rend le crédit et la licence
obligatoires avant l'envoi ; le serveur les stocke tels quels et ne les invente
jamais. Un média sans crédit est signalé comme une attribution manquante dans le
processus éditorial (voir `docs/OPENCODE_HANDOFF.md`, bloc D).

Validation : 5 Mo maximum par fichier, 8 fichiers par requête, type réel
déterminé par les **magic bytes** (JPEG, PNG, WebP, AVIF) et non par le
`Content-Type` annoncé ; SVG, HTML ou PHP sont rejetés même renommés en `.png`.
Nom de fichier généré (UUID), donc aucune donnée utilisateur dans le chemin.
Quota dédié : 40 envois par 10 minutes et par IP.

Réponse `200` :

```json
{ "ok": true, "data": [{ "id": "…", "url": "/api/media/15065759-….png" }] }
```

### `DELETE /api/admin/media?id=<uuid>`

Rôle : `editor`. Supprime la ligne **et** le fichier, uniquement si l'URL
correspond au schéma généré par l'application.

---

## Cartographie et limitation de débit

- `GET /api/*` n'est pas exposé pour les listes publiques : elles sont rendues
  côté serveur (meilleur SEO, aucune API à sécuriser inutilement).
- Limitation : `login` (par IP **et** par compte), `inquiries` (par IP),
  `media` (par IP). Compteurs persistés dans `rate_limits` ; réponse `429` avec
  `Retry-After`.

## Versions et compatibilité

L'API n'est pas versionnée : elle est consommée uniquement par l'interface du
même déploiement. Toute intégration tierce doit passer par une clé d'API dédiée
(non implémentée — voir `docs/OPENCODE_HANDOFF.md`).

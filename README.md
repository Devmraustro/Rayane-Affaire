# RAYANE AFFAIRE

Plateforme immobilière et automobile pour **Béjaïa et les communes environnantes**.
Site public bilingue (français / العربية), back-office authentifié, base de données réelle.

> **État du projet :** l'application est vérifiée par tests, build et parcours
> navigateurs desktop/mobile (voir `docs/TESTING_REPORT.md`). Elle n'est **pas en
> production** et ne contient **aucune annonce réelle**. Une préproduction isolée
> utilise uniquement des données et images synthétiques ; ses identifiants sont
> transmis séparément. Les fiches, photos, positions GPS et contacts réels doivent
> être fournis par le client. Les travaux restants sont dans
> `docs/OPENCODE_HANDOFF.md` et l'état de publication dans `docs/FINAL_REPORT.md`.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Scripts](#scripts)
- [Structure du dépôt](#structure-du-dépôt)
- [Principes de données](#principes-de-données)
- [Intégration continue](#intégration-continue)
- [Documentation](#documentation)

---

## Fonctionnalités

### Site public

| Page | Contenu |
| --- | --- |
| `/` | Héro, panneau de recherche, chiffres réels issus de la base, biens en vedette et véhicules seulement si leur visibilité publique est activée, services, présentation, contact |
| `/properties` | Catalogue filtrable (catégorie, transaction, commune, prix, surface, chambres, ameublement, disponibilité), recherche plein texte FR/AR, tri, pagination |
| `/properties/[slug]` | Galerie, caractéristiques, carte avec niveau de précision, formulaire de contact relié à l'annonce |
| `/vehicles` | Catalogue véhicules (catégorie, marque, carburant, boîte, places, prix), uniquement lorsque la visibilité publique est activée dans les paramètres |
| `/vehicles/[slug]` | Fiche détaillée, équipements, contact (404 tant que la section est masquée) |
| `/places` | Catalogue bilingue des lieux et services locaux : type, commune, adresse, horaires, contact et carte |
| `/places/[slug]` | Fiche lieu avec galerie attribuée, adresse, précision de position et itinéraire adapté |
| `/map` | Carte Leaflet : biens et lieux ; marqueurs de biens uniquement pour positions vérifiées, lieux approximatifs explicitement signalés |
| `/services`, `/about`, `/contact` | Pages éditoriales, coordonnées issues de la configuration |
| `/credits` | Crédits et sources : attribution OpenStreetMap/ODbL, origine des photographies, statut des visuels de marque |

- **Bilingue** : français par défaut (LTR), arabe (RTL) rendu côté serveur via le
  cookie `ra_locale`; la préférence est persistée et s'applique aussi au back-office.
- **SEO** : métadonnées par page, OpenGraph, `sitemap.xml`, `robots.txt`, canonicals,
  JSON-LD `RealEstateListing` **uniquement** pour les annonces réelles publiées.
- **Sécurité** : CSP à nonce, HSTS en production, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, cadre d'intégration limité.

### Réglage : visibilité publique des véhicules

Deux réglages, dans `/admin/settings`, dont **le premier commande le second**.

**1. Interrupteur principal — « Section véhicules sur le site public »**
(`vehicle_public_visible`, défaut **désactivé**). Désactivé, le site public
n'expose **rien** des véhicules :

| Surface | Section masquée |
| --- | --- |
| Menu de navigation | entrée absente |
| `/vehicles` et `/vehicles/<slug>` | **`404`**, aucune donnée, aucune métadonnée |
| Accueil (cartes, chiffres, CTA, sous-titre) | absents |
| Page services, page à propos, pied de page, accroche du logo | aucune mention |
| `sitemap.xml` | aucune URL véhicule |
| `<title>`, description, mots-clés, OpenGraph/Twitter | version « agence immobilière » |
| Statistiques publiques | aucun véhicule compté |
| `POST /api/inquiries` avec `vehicleId` | référence ignorée, type ramené à `general` |

Le back-office **conserve tout** : liste, création, modification, suppression,
photos, caractéristiques, prix, disponibilité, statut, et les enregistrements
existants. **Aucune ligne n'est supprimée ni modifiée** : le masquage est une
projection à la lecture (`lib/db/settings.ts` → `getVehicleVisibility()`,
`lib/settings.ts` → `resolveVehicleVisibility`), donc réafficher la section
demande **un simple basculement**, sans reprise de données.

En cas d'erreur de base, la lecture retombe sur « masquée » : le site peut
sous-afficher, jamais divulguer.

**2. Réglage secondaire — « Location de véhicules »**
(`vehicle_rental_enabled`). Il n'est consulté que si la section est publique. Il
retire alors **la location, jamais la vente** :

| Annonce | Location activée | Location désactivée |
| --- | --- | --- |
| `sale` (vente) | visible | **inchangée** |
| `rent` (location) | visible | **`404`**, hors menu et hors `sitemap` |
| `both` (les deux) | visible, prix/jour + prix de vente | **visible comme une vente** : prix de vente seul, prix/jour retiré |

L'annonce `both` n'est **pas** réécrite en base : seule sa présentation publique
change. Chaque changement est journalisé dans le journal d'audit.

### Back-office (`/admin`)

| Module | Détail |
| --- | --- |
| Connexion | scrypt (N=2¹⁵), jetons de session hachés en base, expiration 8 h, limitation par IP et par compte |
| Vue d'ensemble | 6 indicateurs principaux + 4 secondaires, tous calculés par `COUNT`/`SUM` sur la base |
| Biens | Création, édition, publication (*brouillon / publié / archivé*), suppression (rôle manager+), référence `RA-P-####` générée |
| Véhicules | Idem, référence `RA-V-####` |
| Lieux | Création/édition bilingue, types et communes, publication, prévisualisation privée, adresse, horaires et contact ; géocodage authentifié et/ou point manuel approximatif, vérification exacte explicite |
| Comptes | Propriétaire/manager/éditeur, activation, rôles protégés, changement forcé, réinitialisation par lien à usage unique (30 min), révocation des sessions et préférences de notification |
| Médias | Upload multipart validé par *magic bytes* (JPEG/PNG/WebP/AVIF), 5 Mo max, noms UUID ; EXIF/GPS, XMP, IPTC, commentaires JPEG et texte PNG retirés avant écriture ; crédit, licence et texte alternatif bilingue **exigés par le serveur** ; réordonnancement transactionnel et suppression fichier + ligne |
| Demandes | File de travail avec statuts (nouveau → contacté → qualifié → gagné/perdu/spam) et notes internes |
| Clients | Liste issue des réservations réelles |
| Réservations | Création/édition, client dédupliqué, dates strictes, refus des chevauchements actifs, montants/acomptes, statuts et suppression manager+ ; notifications seulement pour les destinataires ayant opté in |
| Calendrier | Grille mensuelle construite à partir des réservations |
| Finances | Chiffre d'affaires par période, hors données de démonstration |
| Paramètres | Interrupteur principal de **visibilité publique des véhicules** (défaut masqué, fail-closed) + réglage secondaire **location de véhicules**, tous deux persistés ; état de la configuration, communes, environnement, journal d'audit |
| Journal d'audit | Toute écriture est tracée (acteur, action, cible, horodatage) |

Le retrait de métadonnées garde les données pixels compressées intactes. Un AVIF
contenant EXIF/XMP est refusé en fermé (réenregistrer en JPEG/WebP) ; les photos
doivent être correctement orientées **avant** upload, car le tag EXIF
d'orientation est lui aussi supprimé. Détails : `lib/server/image-sanitize.ts`
et `docs/SECURITY_AUDIT.md`.

Chaque écriture exige : session valide **en base**, jeton CSRF, rôle suffisant, et
laisse une ligne d'audit.

---

## Démarrage rapide

Prérequis : **Node.js ≥ 22.5** (le projet utilise `node:sqlite`, sans dépendance native).

```bash
git clone https://github.com/Devmraustro/Rayane-Affaire.git
cd Rayane-Affaire
npm install

cp .env.example .env.local      # renseigner SESSION_SECRET et NEXT_PUBLIC_SITE_URL
openssl rand -base64 48         # valeur à mettre dans SESSION_SECRET

npm run db:migrate              # crée data/rayane.db (15 tables, 11 communes)
npm run db:seed:admin           # crée le premier compte propriétaire
npm run dev                     # http://localhost:3000
```

Le compte administrateur est créé par `db:seed:admin`, qui lit
`ADMIN_EMAIL`, `ADMIN_PASSWORD` et `ADMIN_NAME` (sinon il génère un mot de passe
aléatoire et l'affiche une seule fois).

```bash
ADMIN_EMAIL="direction@example.dz" \
ADMIN_PASSWORD="…" \
ADMIN_NAME="Gérant" \
npm run db:seed:admin
```

### Données de démonstration (facultatif)

```bash
npm run db:seed:demo            # 6 biens + 3 véhicules, marqués is_demo = 1
npm run db:seed:demo -- --purge # tout retirer
```

Ces enregistrements sont **badgés « Démonstration »** dans l'interface, utilisent
les visuels de marque livrés avec le projet (aucune photo réelle), et sont
**exclus** des statistiques publiques, de la une et des totaux financiers.

---

## Variables d'environnement

Liste complète et commentée : [`docs/ENVIRONMENT_VARIABLES.md`](docs/ENVIRONMENT_VARIABLES.md).

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `SESSION_SECRET` | **oui en production** (≥ 32 caractères) | Clé de hachage des jetons de session |
| `NEXT_PUBLIC_SITE_URL` | oui | URL canonique (SEO, sitemap, JSON-LD) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | recommandé | Numéro WhatsApp affiché |
| `NEXT_PUBLIC_PHONE_NUMBER` | recommandé | Téléphone affiché |
| `NEXT_PUBLIC_CONTACT_EMAIL` | recommandé | E-mail de contact |
| `NEXT_PUBLIC_OFFICE_ADDRESS` | recommandé | Adresse du bureau |
| `DATABASE_PATH` | non | Chemin SQLite (défaut `data/rayane.db`) |
| `UPLOAD_DIR` | non | Dossier des photos (défaut `data/uploads`) |

> Aucune coordonnée réelle n'est livrée avec le code : tant qu'une variable de
> contact est vide, l'interface affiche un état « à configurer » au lieu d'un
> faux numéro.

---

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build de production / exécution |
| `npm run lint` | ESLint (aucun avertissement attendu) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `npm run test:watch` | Tests Vitest |
| `npm run verify` | typecheck + lint + tests + build |
| `npm run db:migrate` | Applique le schéma (`-- --reset` repart de zéro) |
| `npm run db:seed:admin` | Crée un administrateur |
| `npm run db:seed:demo` | Données de démonstration (`-- --purge` pour les retirer) |
| `npm run smoke -- https://domaine` | Vérifications post-déploiement (19 contrôles) |
| `npm run test:e2e` | 6 parcours Playwright exécutés sur desktop et mobile (12 tests) contre un build de production |
| `npm run e2e:setup` | Base, comptes, images et uploads E2E isolés (jamais la base client) |
| `npm run prepare:chromium` | Prépare le navigateur compatible avec l'environnement local |
| `npm run audit:gate` | Bloque toute vulnérabilité haute/critique non documentée ; aucune exception active actuellement |

---

## Structure du dépôt

```
app/                 routes App Router (site public, /admin, /api)
components/          ui/ layout/ shared/ home/ properties/ vehicles/ map/ admin/
lib/
  db/                repositories (accès SQLite typé)
  server/            session, authz, audit, upload + sanitisation d'image, rate-limit, env
  i18n/              dictionnaires fr/ar + provider client
db/                  schema.sql, migrations, seeds, client
.github/workflows/   CI qualité + sécurité
scripts/             visuels de marque, smoke test, audit gate
tests/               Vitest (unitaire + intégration)
docs/                documentation technique
data/                base locale + uploads (non versionnés)
```

---

## Principes de données

1. **Rien n'est inventé.** Aucun bien, prix, client, avis ou statistique n'est
   écrit en dur. Une base vide affiche des zéros et des états vides.
2. **Les coordonnées GPS ne sont jamais estimées.** Chaque annonce porte un niveau
   de précision : `exact`, `approximate`, `commune` ou `pending`. Une annonce
   `pending` n'a pas de marqueur et affiche « position non vérifiée ». La base
   interdit (`CHECK`) des coordonnées avec une précision `pending`.
3. **Les photos proviennent du client.** Chaque média stocke son crédit et sa
   licence ; le serveur refuse toute image sans droits documentés (`422`).
4. **Les chiffres affichés viennent de la base**, jamais d'un tableau de bord
   décoratif.

---

## Intégration continue

`.github/workflows/ci.yml` s'exécute à chaque push et chaque pull request :

| Job | Étapes |
| --- | --- |
| `quality` | `npm ci` → `typecheck` → `lint` → `db:migrate` sur une base vide → `test` → `build` |
| `security` | rapport d'audit, puis `node scripts/audit-gate.mjs`, et refus d'un fichier `.env` ou d'une base commitée |

Toutes ces commandes s'exécutent aussi en local (`npm run verify`), donc un
pipeline vert signifie exactement ce qu'un passage local vert signifie. **Le
pipeline ne déploie rien.**

Une vulnérabilité haute ou critique bloque le build, sauf si elle est couverte
par une entrée motivée **et datée** dans `.github/audit-exceptions.json` ; une
entrée expirée fait échouer le build, ce qui interdit d'en faire un silence
permanent.

---

## Documentation

| Document | Contenu |
| --- | --- |
| [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Couches, décisions techniques, flux de données |
| [`DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | Tables, contraintes, index |
| [`API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | Endpoints, charges utiles, erreurs |
| [`SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) | Menaces et mesures, points ouverts |
| [`TESTING_REPORT.md`](docs/TESTING_REPORT.md) | Résultats réels des tests et du build |
| [`DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) | Mise en production, sauvegardes |
| [`ENVIRONMENT_VARIABLES.md`](docs/ENVIRONMENT_VARIABLES.md) | Toutes les variables |
| [`IMPLEMENTATION_REPORT.md`](docs/IMPLEMENTATION_REPORT.md) | Ce qui a été livré, comment, et preuves |
| [`OPENCODE_HANDOFF.md`](docs/OPENCODE_HANDOFF.md) | Travail restant, classé par blocage |

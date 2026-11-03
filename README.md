# RAYANE AFFAIRE

Plateforme immobilière et automobile pour **Béjaïa et les communes environnantes**.
Site public bilingue (français / العربية), back-office authentifié, base de données réelle.

> **État du projet :** l'application est fonctionnelle et testée localement (voir
> `docs/TESTING_REPORT.md`). Elle n'est **pas encore déployée** et **ne contient
> aucune annonce réelle** : les fiches, les photos, les coordonnées GPS et les
> informations de contact doivent être fournies par le client. Tout ce qui est
> encore à faire est listé dans `docs/OPENCODE_HANDOFF.md`.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Scripts](#scripts)
- [Structure du dépôt](#structure-du-dépôt)
- [Principes de données](#principes-de-données)
- [Documentation](#documentation)

---

## Fonctionnalités

### Site public

| Page | Contenu |
| --- | --- |
| `/` | Héro, panneau de recherche, chiffres réels issus de la base, biens et véhicules en vedette, services, présentation, contact |
| `/properties` | Catalogue filtrable (catégorie, transaction, commune, prix, surface, chambres, ameublement, disponibilité), recherche plein texte FR/AR, tri, pagination |
| `/properties/[slug]` | Galerie, caractéristiques, carte avec niveau de précision, formulaire de contact relié à l'annonce |
| `/vehicles` | Catalogue véhicules (catégorie, marque, carburant, boîte, places, prix) |
| `/vehicles/[slug]` | Fiche détaillée, équipements, contact |
| `/map` | Carte Leaflet : marqueurs uniquement pour les positions vérifiées, légende de précision, compteur de biens non localisables |
| `/services`, `/about`, `/contact` | Pages éditoriales, coordonnées issues de la configuration |
| `/credits` | Crédits et sources : attribution OpenStreetMap/ODbL, origine des photographies, statut des visuels de marque |

- **Bilingue** : français par défaut (LTR), arabe (RTL) rendu côté serveur via le
  cookie `ra_locale`; la préférence est persistée et s'applique aussi au back-office.
- **SEO** : métadonnées par page, OpenGraph, `sitemap.xml`, `robots.txt`, canonicals,
  JSON-LD `RealEstateListing` **uniquement** pour les annonces réelles publiées.
- **Sécurité** : CSP à nonce, HSTS en production, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, cadre d'intégration limité.

### Réglage : location de véhicules

L'agence peut déclarer, depuis `/admin/settings`, qu'elle **ne propose pas** la
location de véhicules. Le réglage retire alors **la location, jamais la vente** :

| Annonce | Location activée | Location désactivée |
| --- | --- | --- |
| `sale` (vente) | visible | **inchangée** |
| `rent` (location) | visible | **`404`**, hors menu et hors `sitemap` |
| `both` (les deux) | visible, prix/jour + prix de vente | **visible comme une vente** : prix de vente seul, prix/jour retiré |

Le menu propose « Véhicules à vendre » (et seulement s'il existe du stock à
vendre), le catalogue `/vehicles` reste joignable, la une met en avant
l'inventaire de vente et le `sitemap.xml` conserve les URL de vente. Disparaissent
en revanche les surfaces proprement locatives : CTA « Louer un véhicule », carte
« Location de véhicules », filtre `rent`/`both`, action de réservation, et les
mentions de location dans les métadonnées et les textes de présentation.

L'annonce `both` n'est **pas** réécrite en base : seule sa présentation publique
change, donc réactiver la location restaure l'affichage d'origine. Le back-office
continue d'afficher l'inventaire complet avec le `deal_type` réel. Défaut `true`
(comportement antérieur préservé) et chaque changement est journalisé.

### Back-office (`/admin`)

| Module | Détail |
| --- | --- |
| Connexion | scrypt (N=2¹⁵), jetons de session hachés en base, expiration 8 h, limitation par IP et par compte |
| Vue d'ensemble | 6 indicateurs principaux + 4 secondaires, tous calculés par `COUNT`/`SUM` sur la base |
| Biens | Création, édition, publication (*brouillon / publié / archivé*), suppression (rôle manager+), référence `RA-P-####` générée |
| Véhicules | Idem, référence `RA-V-####` |
| Médias | Upload multipart validé par *magic bytes* (JPEG/PNG/WebP/AVIF), 5 Mo max, noms UUID ; crédit, licence et texte alternatif bilingue **exigés par le serveur** |
| Demandes | File de travail avec statuts (nouveau → contacté → qualifié → gagné/perdu/spam) et notes internes |
| Clients | Liste issue des réservations réelles |
| Réservations | Montants, acomptes, statuts |
| Calendrier | Grille mensuelle construite à partir des réservations |
| Finances | Chiffre d'affaires par période, hors données de démonstration |
| Paramètres | Interrupteur **location de véhicules** (persisté), état de la configuration, communes, environnement, journal d'audit |
| Journal d'audit | Toute écriture est tracée (acteur, action, cible, horodatage) |

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

npm run db:migrate              # crée data/rayane.db (12 tables, 11 communes)
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
| `npm run smoke -- https://domaine` | Vérifications post-déploiement |

---

## Structure du dépôt

```
app/                 routes App Router (site public, /admin, /api)
components/          ui/ layout/ shared/ home/ properties/ vehicles/ map/ admin/
lib/
  db/                repositories (accès SQLite typé)
  server/            session, authz, audit, upload, rate-limit, env
  i18n/              dictionnaires fr/ar + provider client
db/                  schema.sql, migrations, seeds, client
scripts/             visuels de marque, smoke test
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

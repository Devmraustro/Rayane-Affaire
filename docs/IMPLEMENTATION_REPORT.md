# Rapport d'implémentation

Projet : **RAYANE AFFAIRE** — plateforme immobilière et automobile, Béjaïa.
Dépôt : `https://github.com/Devmraustro/Rayane-Affaire`
Branche de travail : `arena/c6e4a623-rayane-affaire`
Commit de référence : `be9c3af` (+ commits de documentation ultérieurs)
Date : 3 novembre 2026

---

## 1. Point de départ

Le dépôt contenait un unique commit (`8f8a982 Initial commit`) : la configuration
Next.js/TypeScript/Tailwind et les dépendances, **sans aucune page ni logique
métier**. Aucun code existant n'a été détruit : les versions des frameworks, la
configuration de build et les dépendances installées ont été conservées telles
quelles.

Le projet de référence (`GW-IMMOBILIER`) a été lu pour **comprendre le
périmètre fonctionnel** (modules du back-office, modèle de données, ton visuel).
Il s'agit d'un prototype dont l'état vit dans `localStorage` (aucune
authentification, aucune base, données de démonstration en dur) : **rien de cette
mécanique n'a été repris**. Seul le vocabulaire fonctionnel et les jetons visuels
(gamme or/sable/encre, typographie éditoriale, cartes arrondies) ont inspiré
l'interface, avec une identité propre.

---

## 2. Ce qui a été construit

### 2.1 Socle technique

| Élément | Détail |
| --- | --- |
| Framework | Next.js 15.5 (App Router), React 19, TypeScript 5.7 strict |
| Style | Tailwind 3.4 + jetons RAYANE (or `#D9A622`, encre `#1B1B1D`, sable 50–300) |
| Base | SQLite via `node:sqlite` (Node ≥ 22.5, aucune compilation native) |
| Validation | Zod (schémas partagés client/serveur) |
| Carte | Leaflet + react-leaflet + markercluster, tuiles OpenStreetMap |
| Tests | Vitest (7 fichiers, 131 tests) |
| Volume produit | 144 fichiers TypeScript/TSX, dont 30 pages, 51 composants, 34 modules `lib/` |

### 2.2 Base de données (12 tables, 21 index)

`communes`, `properties`, `vehicles`, `media`, `customers`, `inquiries`,
`reservations`, `admin_users`, `admin_sessions`, `rate_limits`, `audit_log`,
`settings`, plus `schema_migrations` pour les évolutions.

Points structurants :

- contrainte `CHECK` garantissant `coordinate_precision='pending' ⇒ lat/lng NULL` ;
- clés étrangères actives (`PRAGMA foreign_keys = ON`), `ON DELETE RESTRICT` sur
  `communes`, `CASCADE` sur les sessions ;
- index composites `(status, is_demo, published_at DESC)` pour les listes
  publiques ;
- montants en dinars entiers ; dates ISO-8601 UTC.

Détail complet : `docs/DATABASE_SCHEMA.md`.

### 2.3 Site public

| Page | Contenu réel |
| --- | --- |
| `/` | Héro éditorial, panneau de recherche (commune, catégorie, transaction, budget), chiffres issus d'agrégats SQL, biens et véhicules en vedette, services, présentation, contact |
| `/properties` | Catalogue filtrable + recherche FR/AR + tri + pagination, états vides explicites |
| `/properties/[slug]` | Galerie, tableau de caractéristiques, carte à précision déclarée, formulaire relié à l'annonce, `JSON-LD` si annonce réelle, `noindex` si démonstration |
| `/vehicles`, `/vehicles/[slug]` | Catalogue et fiche véhicule |
| `/map` | Marqueurs uniquement pour les positions vérifiées, légende de précision, compteur d'annonces sans position |
| `/services`, `/about`, `/contact` | Pages éditoriales ; coordonnées lues dans l'environnement, bloc masqué + mention « à configurer » si absent |
| `/robots.txt`, `/sitemap.xml` | Générés dynamiquement, `/admin` et `/api` exclus |

### 2.4 Back-office

Tous les modules du périmètre de référence ont été portés **avec une logique
réelle** :

| Module | Statut | Note |
| --- | --- | --- |
| Authentification | ✅ | scrypt, sessions hachées, CSRF, limitation, audit |
| Vue d'ensemble | ✅ | 10 indicateurs, tous calculés (`COUNT`/`SUM`), aucun chiffre décoratif |
| Biens (liste, création, édition) | ✅ | Filtres statut/recherche/démo/géo, actions de statut en ligne |
| Véhicules (liste, création, édition) | ✅ | Idem |
| Médias (upload, suppression) | ✅ | Magic bytes, quota, crédit + licence + alt bilingue exigés côté serveur et côté interface |
| Demandes de contact | ✅ | File de travail maître/détail, statuts, notes internes |
| Clients | ✅ | Alimenté par les réservations réelles |
| Réservations | ✅ | Montants, acomptes, statuts |
| Calendrier | ✅ | Grille mensuelle construite depuis les réservations |
| Finances | ✅ | Chiffre d'affaires par période, hors démonstration |
| Recherche / filtres | ✅ | Filtres serveur + paramètres d'URL partageables |
| Paramètres | ✅ | État de la configuration, communes, environnement, audit |
| Utilisateurs / permissions | ⚠️ **partiel** | Rôles et matrice d'autorisation complets ; **aucune interface** de création/gestion des comptes (les comptes se créent via `npm run db:seed:admin`) |

### 2.5 Sécurité

Voir `docs/SECURITY_AUDIT.md`. En résumé : scrypt N=2¹⁵, jetons de session
stockés hachés avec un secret serveur, CSRF à double soumission, expiration 8 h,
révocation serveur, limitation de débit persistée, validation Zod systématique,
requêtes 100 % préparées, CSP à nonce, `nosniff`, vérification d'origine,
téléversements validés par magic bytes, aucun secret dans le dépôt.

### 2.6 Internationalisation

FR (défaut, LTR) et AR (RTL) : dictionnaires typés garantissant la parité des
clés à la compilation, locale persistée par cookie et appliquée **côté serveur**
sur `<html lang dir>`, classes CSS logiques (`ps/pe/ms/me/text-start`), erreurs
de validation renvoyées sous forme de clés traduites par le client. Le
back-office est intégralement bilingue.

---

## 3. Données : ce qui existe réellement

### 3.1 Géodonnées (vérifiées)

11 communes de la wilaya de Béjaïa, centroïdes issus d'OpenStreetMap via
Nominatim (données ODbL, attribution affichée sur la carte) :

| Commune | Relation OSM | Latitude | Longitude |
| --- | --- | --- | --- |
| Béjaïa | 2094122 | 36.7511783 | 5.0643687 |
| Akbou | 4069688 | 36.4597538 | 4.5289243 |
| Amizour | 4112937 | 36.6439022 | 4.9036535 |
| Aokas | 4112961 | 36.6376518 | 5.2453122 |
| Tichy | 4112952 | 36.6689510 | 5.1574875 |
| Tala Hamza | 4112949 | 36.7029253 | 5.0394177 |
| El Kseur | 4067937 | 36.6794351 | 4.8523757 |
| Oued Ghir | 4067884 | 36.7106296 | 4.9782915 |
| Sidi-Aïch | 4069476 | 36.6127914 | 4.6913091 |
| Kherrata | 4112854 | 36.4936262 | 5.2771041 |
| Darguina | 4112864 | 36.5643070 | 5.3063118 |

La wilaya compte **53 communes** : les 11 présentes couvrent le cœur de la zone
d'activité présumée. L'extension du référentiel est une tâche de saisie
(bloc B du handoff) — aucune commune supplémentaire n'a été inventée.

Aucune coordonnée d'annonce n'a été créée : les fiches réelles attendent les
informations du client, et chaque annonce doit déclarer explicitement son niveau
de précision.

### 3.2 Annonces, clients, demandes

**Aucune donnée réelle n'existe.** La base livrée est vide (hors communes). Aucun
bien, véhicule, prix, adresse, client ou statistique n'a été inventé.

Un script **optionnel** (`npm run db:seed:demo`) crée 6 biens et 3 véhicules pour
permettre la vérification visuelle :

- titre préfixé `[Démonstration]` / `[تجريبي]` ;
- `is_demo = 1` en base ;
- visuels de marque SVG livrés avec le projet (aucune photographie réelle) ;
- exclus des statistiques publiques, de la une et des finances ;
- supprimables par `npm run db:seed:demo -- --purge`.

### 3.3 Photographies

Aucune photo de bien n'est fournie. L'interface d'upload impose un texte
alternatif bilingue, un crédit et une licence : le client fournira ses propres
photos, ou des photos sous licence avec attribution. Les seuls visuels présents
sont les illustrations de marque (`public/images/fallback/*.svg`), générées par
`scripts/make-placeholders.ts`.

### 3.4 Coordonnées de contact

**Aucune.** Les variables `NEXT_PUBLIC_*` de contact sont vides ; l'interface
masque alors les canaux et affiche une mention « à configurer ». Le numéro factice
`+213 00 00 00 00` du projet de référence **n'existe nulle part** (un test
automatisé et le script `smoke` le vérifient).

---

## 4. Corrections apportées pendant le développement

Problèmes réels rencontrés et corrigés (utiles au prochain intervenant) :

1. **Fuite serveur → client** : un composant client importait `lib/filters.ts`,
   qui importait un dépôt SQLite, qui importait `node:fs` ⇒ build en échec et
   `500` sur toutes les routes. Corrigé en isolant les valeurs par défaut de
   filtre et en ajoutant `lib/server/guard.ts`.
2. **Types générés périmés** : `.next/types/validator.ts` provoquait des erreurs
   `TS2305/TS2344` après ajout de routes. Corrigé par la suppression de
   `.next/types` avant `tsc`.
3. **`transaction` est un mot réservé SQLite** ⇒ colonne renommée
   `transaction_type`.
4. **Séparateurs de milliers** : `Intl.NumberFormat('ar-DZ')` groupe avec un point
   (`45.000`), ce qu'un lecteur algérien interprète comme une décimale. Les prix
   sont donc formatés avec le groupement français dans les deux langues
   (`45 000 DA` / `45 000 دج`), en chiffres latins.
5. **Libellé vide** : `labels.priceUnit.total` était une chaîne vide ; remplacé
   par « au total » / « إجمالاً ».
6. **Sessions non testables** : `createSession` dépendait de `next/headers`.
   Scindé en `issueSession` (logique pure) + `serializeSessionCookies` (transport),
   ce qui permet de tester l'authentification réelle sans simulacre.

---

## 5. Preuves d'exécution

Toutes les commandes ci-dessous ont été exécutées sur ce dépôt, à ce commit.

| Commande | Résultat observé |
| --- | --- |
| `npx tsc --noEmit` | aucune sortie ⇒ 0 erreur |
| `npm run lint` | `✔ No ESLint warnings or errors` |
| `npm test` | `Test Files 7 passed (7)` / `Tests 131 passed (131)` |
| `npm run build` | `✓ Compiled successfully`, `✓ Generating static pages (19/19)`, 36 entrées de route + middleware |
| `npm run smoke -- http://localhost:3000` | `All checks passed.` (13 routes + contrôle des numéros factices) |
| Parcours admin via `curl` | connexion 200, `/admin` 307 sans session, 9 pages admin 200 avec session, création `RA-P-0001`, `422 MEDIA_REQUIRED` sans photo, upload 200, publication 200, fiche publique 200 |

Détail et sorties : `docs/TESTING_REPORT.md`.

---

## 6. Ce qui n'est **pas** fait (honnêtement)

| Élément | Raison |
| --- | --- |
| Déploiement en production | Aucun accès serveur ni domaine fourni |
| Données réelles (biens, photos, clients) | À fournir par le client — aucune invention |
| Coordonnées professionnelles réelles | À fournir par le client |
| Vérification visuelle dans un vrai navigateur | Aucun navigateur disponible dans l'environnement de développement |
| Vérification de parité avec les captures de référence | **Les quatre captures annoncées n'ont jamais été transmises** |
| Interface de gestion des utilisateurs | Rôles et autorisations en place, interface absente |
| 2FA, réinitialisation de mot de passe | Non implémentées |
| Notifications (e-mail/WhatsApp) à la réception d'une demande | Non implémentées |
| Tests de bout en bout navigateur (E2E) | Pas de navigateur disponible |
| Audit d'intrusion externe | Hors périmètre |

La suite est organisée par nature de blocage dans `docs/OPENCODE_HANDOFF.md`.

---

## 7. Conclusion

L'application livrée est **fonctionnelle, typée, testée et construite pour la
production** ; elle n'est **pas déployée** et **ne contient aucune donnée
métier réelle**, par choix délibéré de ne rien inventer. Les prochaines étapes
sont, dans l'ordre : fournir les informations de contact et les photographies,
saisir les premières annonces avec leurs coordonnées vérifiées, puis déployer sur
un hébergeur à disque persistant.

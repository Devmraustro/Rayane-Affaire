# Rapport de tests

**Vérification finale : 5 novembre 2026** — Node.js 22.22.3, Linux,
Next.js 15.5.28. Les résultats ci-dessous proviennent de commandes réellement
exécutées dans le dépôt. Aucun test d'intrusion, de charge ou audit axe-core
n'est revendiqué.

## 1. Résumé

| Vérification | Résultat observé |
| --- | --- |
| Installation reproductible | `npm ci` — succès sur le lockfile final |
| TypeScript | `npm run typecheck` — **0 erreur** |
| ESLint | `npm run lint` — **0 avertissement/erreur ESLint** ; Next signale seulement la future suppression de `next lint` en v16 |
| Vitest | **251/251 tests**, **14 fichiers** |
| Build optimisé | `npm run build` — succès ; **30/30 pages statiques** générées, routes dynamiques à la demande |
| Audit complet | `npm audit --audit-level=low` — **0 vulnérabilité** (570 dépendances totales, 147 prod / 386 dev) |
| Audit production | `npm audit --omit=dev --audit-level=low` — **0 vulnérabilité** |
| Gate de sécurité | `npm run audit:gate` — succès, **0 exception active**, 0 avis bloquant |
| Smoke HTTP de la preview | **19/19** sur le build de production (`APP_ENV=preview`) |
| Playwright desktop | **6/6**, Chromium 1440×1000, build de production |
| Playwright mobile | **6/6**, Chromium 390×844 tactile, build de production |
| Captures | **33 PNG** dans `artifacts/screenshots/`, dont FR, AR/RTL, desktop, mobile et changement forcé du compte client |
| CI checkpoint vérifié | GitHub Actions run `42105969372` — succès sur `2cdb0304408d80b2c57067320ca6a6cfea455aec` |

La commande unique `npm run verify` a été rejouée après le correctif de cohérence
Resend (`/admin/notifications` utilise désormais `emailDeliveryConfigured()`) et
l'ajout des tests de contrat Nominatim v2 / route `/api/admin/geocode` : typecheck,
lint, **251 tests** et build ont tous passé. `npm run test:e2e` lance ensuite desktop et mobile **séquentiellement avec une base et un
serveur isolés frais pour chaque projet**. Cette séparation évite de consommer le
quota réel de connexions d'un projet avec l'autre ; aucune limitation de sécurité
n'a été affaiblie pour les tests.

## 2. Répartition Vitest

| Fichier | Tests | Couverture principale |
| --- | ---: | --- |
| `tests/validation.test.ts` | 20 | Téléphones algériens, texte FR/AR, demandes, connexion, annonces et véhicules |
| `tests/filters.test.ts` | 11 | Recherche, valeurs invalides, pagination, communes et sérialisation |
| `tests/format.test.ts` | 13 | DZD FR/AR, surfaces, dates, durées, références et slugs |
| `tests/i18n.test.ts` | 15 | Parité FR/AR, RTL, énumérations et absence de l'année 2024 non confirmée |
| `tests/security.test.ts` | 22 | scrypt, sessions, CSRF, limitation, magic bytes et quotas |
| `tests/database.test.ts` | 20 | SQLite réel, intégrité, annonces, véhicules, carte, statistiques et médias |
| `tests/api.test.ts` | 41 | Auth, rôles, CSRF, CRUD, demandes, upload, réponses, réglages et audit |
| `tests/vehicle-rental-setting.test.ts` | 52 | Masquage/location véhicules sur toutes les projections publiques et admin |
| `tests/image-sanitize.test.ts` | 22 | JPEG/PNG/WebP/AVIF, EXIF/GPS, XMP, structures et échec fermé |
| `tests/places.test.ts` | 9 | CRUD lieux, publication, projection des coordonnées et vérification explicite |
| `tests/geocoder.test.ts` | 8 | Validation, fixtures Nominatim v2 réelles (FR/AR/communes/wilayas/vide), route `/api/admin/geocode` et non-persistance |
| `tests/accounts.test.ts` | 9 | Comptes, changement forcé, reset à usage unique, révocation, opt-in notifications et vérification stricte de configuration Resend |
| `tests/reservations-media.test.ts` | 7 | Dates/chevauchements, suppression, médias lieux et nettoyage physique |
| `tests/preview.test.ts` | 2 | Bootstrap synthétique, hash/forced change, contacts vides et noindex |
| **Total** | **251** | **14 fichiers** |

Les handlers sont testés avec de vrais `Request`/`FormData` Node et des fichiers
SQLite temporaires. Les services externes sont simulés dans ces tests : aucun
courriel réel n'est envoyé et aucun géocodage n'est déclaré réussi sur cette base.

## 3. Migrations et préservation des données

Trois contrôles distincts ont été exécutés :

1. base neuve : `001`–`003` appliquées, 11 communes OSM, aucune annonce réelle ;
2. seconde exécution : aucune migration rejouée, aucune erreur de colonne ;
3. véritable base pré-003 construite depuis le schéma du commit de base avec un
   compte `legacy-owner` et un média `legacy-media` : la migration 003 s'applique,
   la répétition est un no-op et les deux lignes conservent leurs données.

Sur la base historique recréée après le durcissement opt-in, le compte conserve
`must_change_password=0` et reçoit les deux nouvelles préférences à **0** : une
adresse ne suffit pas à abonner un compte. Le média conserve son ordre 2, son
crédit et sa licence. La contrainte `media.entity_type` accepte désormais `place`.
La seconde migration reste un no-op. Les bases de test sont hors Git dans
`/tmp/rayane-pre003.db` et `/tmp/rayane-pre003-optin.db`.

## 4. Parcours navigateurs exécutés

Chaque projet Chromium exécute les six workflows suivants contre `next start`,
pas contre un mock de navigateur :

1. **Bien + réservation** : création brouillon, upload PNG réel, publication,
   fiche publique, réservation, refus de chevauchement, liste et calendrier,
   changement de statut puis suppression manager/owner ;
2. **Véhicule + médias** : création, publication avec interrupteur public,
   visibilité catalogue, réordonnancement et suppression fichier/ligne ;
3. **Comptes + RBAC** : création par owner, deux notifications initialement
   désactivées, première connexion avec changement imposé, droits éditeur,
   abonnement explicite et préférences persistées ;
4. **Public FR/AR** : catalogue, demande de contact, consentement, bascule arabe
   RTL, navigation responsive et absence de débordement horizontal ;
5. **Lieu complet** : brouillon, placement manuel, deux images, ordre, recherche
   simulée, vérification exacte, publication, aperçu admin et projection publique ;
6. **Géocodeur UI** : chargement, résultat, vide, erreur et limite de débit via
   réponses contrôlées, sans prétendre joindre Nominatim depuis le sandbox.

Résultat final : **6/6 desktop**, puis **6/6 mobile**. Les requêtes de sauvegarde
et d'upload sont validées par leur statut HTTP, pas seulement par un texte toast.
Les coordonnées de biens de démonstration restent absentes ; les lieux géocodés
restent approximatifs tant qu'un éditeur ne vérifie pas un point exact.

### Preuves visuelles

Les 33 captures sont conservées hors Git dans `artifacts/screenshots/`. Points
contrôlés visuellement : accueil FR et AR, catalogue, fiche bien, carte, preview
lieu vérifié/non vérifié, formulaires admin, préférences, réservations/calendrier,
RBAC, véhicules et changement forcé du compte de remise. Exemples :

- `desktop-chromium-home-fr.png` / `mobile-chromium-home-fr.png` ;
- `desktop-chromium-home-ar-rtl.png` / `mobile-chromium-home-ar-rtl.png` ;
- `desktop-chromium-place-admin-preview-verified.png` / variante mobile ;
- `desktop-chromium-reservation-calendar.png` / variante mobile ;
- `desktop-chromium-client-forced-password.png`.

Les pages s'empilent correctement à 390 px et aucun débordement horizontal n'a
été observé. **Les tuiles OSM sont grises dans les captures sandbox** car le
réseau sortant du navigateur est restreint ; Leaflet, les marqueurs, contrôles et
attributions sont visibles. Cela ne constitue pas une preuve de chargement des
tuiles depuis le navigateur du client.

## 5. Smoke et état de remise

Le smoke du serveur de preview vérifie 19 points : routes publiques dont `/places`,
robots, sitemap, admin protégé, login, vraies 404, cohérence du masquage véhicules
et absence du numéro factice. Résultat : **19/19**.

Contrôles supplémentaires réussis :

- `robots.txt` répond `User-Agent: *` / `Disallow: /` en preview ;
- l'année 2024 non confirmée n'apparaît plus sur l'accueil ;
- une vraie connexion Chromium avec le mot de passe de remise aboutit à
  `/admin/password` ;
- la session de ce contrôle est ensuite révoquée ; le compte conserve
  `must_change_password=1` et zéro session active.

## 6. Limites et contrôles non revendiqués

- Le sandbox E2B bloque le TLS direct vers Nominatim (`SSL_ERROR_SYSCALL` hors
  liste blanche SNI). Cinq requêtes externes réelles vers Nominatim v2 (`Rue de la
  Liberté, Béjaïa`, `Béjaïa`, `Tichy`, `Sétif`, `بجاية` et une recherche vide `[]`)
  ont été exécutées puis rejouées dans `searchAddress()` et `GET /api/admin/geocode`,
  mais **l'appel sortant direct depuis un déploiement public reste à valider une
  fois l'hôte public ouvert**.
- Le conteneur Linux minimal de test ne contient pas de police système arabe :
  `lang="ar"`, `dir="rtl"` et la mise en page inversée sont vérifiés, mais le rendu
  typographique arabe doit être relu sur un appareil client disposant des polices
  système standards.
- Aucun email Resend réel n'a été envoyé ; `emailDeliveryConfigured()` exige
  désormais partout (`lib/server/email.ts`, `/api/admin/notifications` et
  `/admin/notifications`) `EMAIL_DELIVERY=resend` ainsi que `RESEND_API_KEY` et
  `EMAIL_FROM` non vides.
- Pas d'audit axe-core, test de charge, pentest externe ou validation par un
  utilisateur client.
- L'orientation EXIF est supprimée, pas appliquée aux pixels : réorienter les
  photos avant upload.
- Les captures et traces Playwright sont des artefacts locaux ignorés par Git.

## 7. Reproduire

```bash
npm ci
export NODE_ENV=test
export DATABASE_PATH=./data/ci.db
npm run db:migrate
npm run verify
npm run audit:gate
npm run test:e2e
```

Pour le smoke, démarrer un build de production sur une base jetable, puis :

```bash
npm run smoke -- http://127.0.0.1:3000
```

Ne jamais utiliser la base client pour les seeds, les migrations de test ou E2E.

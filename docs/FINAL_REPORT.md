# Rapport final — RAYANE AFFAIRE

Format demandé par le client. **Chaque élément ci-dessous a été vérifié** ; ce
qui n'a pas été exécuté est explicitement marqué comme non fait.

---

## 1. Dépôt

**https://github.com/Devmraustro/Rayane-Affaire**

## 2. Branche d'origine → branche finale

- Origine : `main`
- Travail : `arena/c6e4a623-rayane-affaire` → pushé, suivi sur `origin`
- Pull request : **#1** (`OPEN`, `MERGEABLE`), base `main`
- `main` n'a **pas** été modifiée ; aucun force-push, aucune branche supprimée

## 3. Commit

| | |
| --- | --- |
| Point de départ | `8f8a982` — *Initial commit* (scaffold Next.js seul) |
| HEAD avant ce lot | `b42d32e` — `docs: add the final report and correct two build figures` |
| HEAD de ce lot | commit `feat(admin): make vehicle rental visibility a persisted setting` — **SHA exact dans la pull request #1 et `git log -1`** (un commit ne peut pas contenir son propre condensat, il n'est donc pas recopié ici) |
| Commits sur la branche | 5 (`8f8a982` → `be9c3af` → `f3539bb` → `ba1cf6b` → `b42d32e` → ce commit) |
| Branche | `arena/c6e4a623-rayane-affaire`, poussée sur `origin` |

## 4. Pile technique

Next.js 15.5 (App Router) · React 19 · TypeScript 5.7 strict · Tailwind 3.4 ·
Radix UI · Leaflet 1.9 + react-leaflet 5 + markercluster · Zod · SQLite via
`node:sqlite` (Node ≥ 22.5) · Vitest 3. **Aucune dépendance ajoutée n'a été
choisie par confort : la pile existante a été conservée.**

## 5. Fonctionnalités livrées

**Site public** : accueil (héro, recherche, chiffres réels, sélections), catalogue
biens (7 catégories, 4 transactions, filtres prix/surface/chambres/ameublement/
commune, recherche FR+AR, tri, pagination), fiche bien (galerie, carte à
précision, formulaire), catalogue et fiche véhicules, carte, services, à propos,
contact, crédits, RTL, SEO (métadonnées, OpenGraph, canonicals, sitemap, robots,
JSON-LD réel uniquement), pages 404/500/chargement.

**Back-office** : connexion, vue d'ensemble, biens, véhicules, médias, demandes,
clients, réservations, calendrier, finances, paramètres, journal d'audit.

**Réglage de visibilité de la location de véhicules** (dernier lot) : l'agence
déclare depuis `/admin/settings` si elle propose la location. Le choix est
persisté en base, journalisé (valeur avant/après), et appliqué **côté serveur à
toutes les surfaces publiques** — menu, catalogue, une, CTA, chiffres, services,
`sitemap.xml` — tout en laissant **la vente de véhicules et tout l'immobilier
intacts**. Défaut `true` : aucun changement de comportement pour une base
existante. Détail : `docs/ARCHITECTURE.md` §9.

**Non livré** (assumé, voir §9) : interface de gestion des comptes (rôles et
autorisations en place), 2FA, réinitialisation de mot de passe, notifications,
création de réservation depuis l'interface.

## 6. Changements de base de données

Base **créée de zéro** (le dépôt n'en avait aucune) : **12 tables** — `communes`,
`properties`, `vehicles`, `media`, `customers`, `inquiries`, `reservations`,
`admin_users`, `admin_sessions`, `rate_limits`, `audit_log`, `settings` — plus
`schema_migrations` pour les évolutions futures.

- **21 index**, dont composites `(status, is_demo, published_at DESC)` pour les
  listes publiques ;
- **1 migration versionnée** (`db/migrations/001_vehicle_rental_setting.sql`),
  appliquée par `npm run db:migrate` ; idempotente (`ON CONFLICT DO NOTHING`),
  elle n'écrase jamais un réglage déjà choisi ;
- contraintes `CHECK` sur chaque énumération, montants `>= 0`,
  `end_date >= start_date`, et surtout
  **`coordinate_precision='pending' ⇒ lat/lng NULL`** ;
- clés étrangères actives (`RESTRICT` sur `communes`, `CASCADE` sur les sessions) ;
- montants en dinars entiers, dates ISO-8601 UTC, champs bilingues `*_fr`/`*_ar` ;
- mode WAL.

Migration idempotente (`npm run db:migrate`), `db:reset` implémenté et refusé en
production. Détail : `docs/DATABASE_SCHEMA.md`.

## 7. Données vérifiées

**Aucune donnée métier réelle n'existe et aucune n'a été inventée.**

| Type | Statut |
| --- | --- |
| Biens, véhicules, prix, adresses | **Aucun** — à saisir par le client |
| Clients, demandes, réservations | **Aucun** — la base est vide |
| Coordonnées GPS d'annonces | **Aucune** — chaque annonce devra déclarer sa précision |
| Photographies | **Aucune** — visuels de marque SVG uniquement |
| Statistiques | **Toutes calculées** en SQL ; zéro sur base vide |
| Communes | **11 vérifiées** (source ci-dessous) |

Un script **optionnel** (`npm run db:seed:demo`) crée 6 biens + 3 véhicules
marqués `is_demo = 1`, préfixés « [Démonstration] » / « [تجريبي] », exclus des
statistiques publiques, de la une et des finances, supprimables par `-- --purge`.

## 8. Résultats GPS

- **11 communes** de la wilaya de Béjaïa, centroïdes obtenus depuis
  **OpenStreetMap / Nominatim** (relation administrative), **jamais estimés** :

| Commune | Relation OSM | Lat | Lng |
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

- Ces centroïdes servent **uniquement** à situer une commune (filtres, cadrage
  initial de la carte). **Aucun bien n'est placé au centre d'une commune.**
- Niveaux de précision implémentés : `exact`, `approximate` (quartier),
  `commune`, `pending`. Un bien `pending` n'a **pas** de marqueur et affiche
  « position non vérifiée » ; la base interdit des coordonnées avec `pending`.
- Vérifié en direct : publier avec `precision='approximate'` affiche
  « Position approximative (quartier) » / « موقع تقريبي (الحي) ».
- La wilaya compte 53 communes ; les 32 restantes sont une tâche de saisie
  (bloc B du handoff non résolu).

## 9. Sourcing et attribution des images

- **Aucune photographie réelle** n'est incluse. Les 11 visuels de secours sont des
  illustrations SVG créées pour RAYANE AFFAIRE
  (`scripts/make-placeholders.ts`), explicitement « visuels de démonstration ».
- Le téléversement **exige** crédit, licence et texte alternatif bilingue
  (contrôle serveur : `422` sinon) ; ces valeurs sont stockées avec chaque média
  et affichées sur la fiche.
- La carte et les contours sont attribués à OpenStreetMap (ODbL) dans le pied de
  page **et** sur la page `/credits`, avec le lien de copyright requis.
- Les images externes ne sont pas autorisées par la CSP en dehors de deux CDN
  sous licence ; aucun chargement sauvage.

## 10. État du back-office

**Fonctionnel et vérifié en HTTP.** Connexion réelle, 9 pages accessibles avec
session, 307 sans session, CRUD complet, upload, publication avec garde-fou,
audit.

Rappel : `users` (gestion des comptes) n'a **pas** d'interface — les rôles et la
matrice d'autorisation, eux, sont implémentés et testés.

## 11. Améliorations de sécurité

scrypt N=2¹⁵ + sel + normalisation Unicode · jetons de session stockés hachés
avec un secret serveur (une copie de la base ne rejoue rien) · CSRF à double
soumission à temps constant · cookies `HttpOnly`/`SameSite=Lax`/`Secure` en prod ·
expiration 8 h + révocation serveur · limitation de débit persistée par IP **et**
par compte · messages d'erreur non énumérants + vérification factice ·
100 % de requêtes préparées · validation Zod systématique · téléversement validé
par *magic bytes* (SVG/HTML/PHP refusés) + quota + nommage UUID · contrôle
d'existence de l'annonce · **attribution obligatoire** · CSP à nonce +
`strict-dynamic`, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy` ·
audit de chaque mutation · aucun secret dans le dépôt, refus de démarrer en
production sans `SESSION_SECRET`.

Risques résiduels et points ouverts : `docs/SECURITY_AUDIT.md` §9.

## 12. Nombre de tests

| Résultat | Détail |
| --- | --- |
| **161 / 161 réussis** | 8 fichiers, ~4,3 s, exécution réelle |
| 0 désactivé | aucun `skip`, `todo` ou assertion retirée |
| 85 unitaires / 76 intégration | intégration = vraie base SQLite + vrais gestionnaires de route |

Répartition : validation 20 · filtres 11 · formatage 13 · i18n/RTL 14 ·
sécurité 21 · base de données 20 · API 41 · **réglage de la location 21**.

Les 30 tests ajoutés depuis le premier rapport couvrent le réglage de visibilité
de la location de véhicules : 21 tests de comportement (défaut, lecture
défaillante, filtre, visibilité publique dans les deux états, non-régression de
la vente et de l'immobilier) et 9 tests de l'endpoint `PATCH /api/admin/settings`
(autorisation, CSRF, validation stricte, persistance, audit avant/après,
`changed=false` sans écriture).

**Non couvert** (déclaré) : navigateur/E2E, rendu visuel, carte interactive,
envoi d'e-mail, charge, test d'intrusion — voir `docs/TESTING_REPORT.md` §6.

## 13. Résultat du build

`npm run build` → **succès**. **38 entrées de route** (27 routes de page dont
`robots.txt`, désormais 11 routes API) + middleware, **20 pages statiques**,
JS partagé **103 kB**, aucune erreur, aucun avertissement ESLint.
`tsc --noEmit` : **0 erreur**. `npm run smoke` contre un serveur de production
au repos : **17/17**.

Deux évolutions depuis le premier rapport : `+1` route API
(`/api/admin/settings`) et `/sitemap.xml` passé de statique à dynamique (son
contenu dépend du réglage de location ; prégénéré, il servait des URL périmées).

## 14. Statut CI

**Aucune CI n'est configurée** (le dépôt n'avait aucun workflow, et je n'en ai pas
ajouté : ce n'était pas demandé). Les vérifications ont été exécutées localement,
à la main, et leurs sorties sont reproduites dans `docs/TESTING_REPORT.md`.
Aucune coche verte GitHub ne peut être revendiquée.

## 15. Statut du déploiement

**Non déployé.** Aucun accès serveur, aucun nom de domaine. La procédure complète
est écrite et testée localement (build de production réussi) :
`docs/DEPLOYMENT_GUIDE.md`. Avertissement important : un hébergeur à système de
fichiers éphémère (Vercel/Netlify) **perdrait la base et les photos** à chaque
déploiement — un disque persistant ou une migration PostgreSQL est nécessaire.

## 15 bis. Corrections apportées lors de la vérification de production

Trois défauts réels, invisibles en développement, ont été trouvés et corrigés
avant ce commit :

1. **Soft 404** — `/properties/<inexistant>` et `/vehicles/<inexistant>`
   répondaient `200` avec un corps « page introuvable ». Cause : un `loading.tsx`
   racine (puis de segment) crée une frontière Suspense qui envoie le statut avant
   que `notFound()` ne s'exécute. Le squelette ne subsiste que sur `/map` (route
   feuille) ; `smoke` vérifie les deux `404`.
2. **Boucle de redirection sur la connexion** — `/admin/login` redirigeait vers
   `/admin/login` : la connexion était **impossible**. Le layout admin exempte
   désormais la page de connexion (chemin fourni par le middleware).
3. **Sitemap périmé** — `sitemap.xml` était prégénéré alors qu'il dépend du
   réglage en base ; après désactivation il annonçait encore les URL de location.
   Passé en rendu dynamique.

## 16. Limites connues

1. Pas de déploiement ni de CI.
2. Base vide : aucune annonce réelle (par choix de ne rien inventer).
3. Vérification visuelle faite sur HTML rendu, **pas dans un navigateur**
   (aucun navigateur, même sans interface, n'est installable ici) :
   E2E et parité pixel à pixel non vérifiés — **les quatre captures de référence
   annoncées n'ont jamais été transmises**.
4. Pas d'interface de gestion des comptes ; pas de 2FA ; pas de réinitialisation
   de mot de passe en libre-service.
5. Aucune notification à la réception d'une demande : elle reste dans le
   back-office jusqu'à consultation.
6. Interface de création de réservation absente (lecture, calendrier et finances
   sont en place).
7. SQLite : un seul nœud applicatif, pas de réplication.
8. Métadonnées EXIF des photos non retirées ; réordonnancement des médias non
   exposé.
9. 11 communes sur 53 ; 32 à ajouter avec la même méthode OSM.
10. Horaires d'ouverture génériques à confirmer (non inventés, mais non validés).

## 17. Actions restantes côté client

1. Fournir WhatsApp, téléphone, e-mail, adresse, réseaux sociaux, horaires.
2. Fournir l'inventaire réel avec photos **et leurs droits**, textes FR et AR,
   coordonnées GPS avec niveau de précision.
3. Valider la charte, les textes, les mentions légales et la politique de
   confidentialité.
4. Confirmer le périmètre de communes et les traductions arabes.
5. Fournir les captures de référence si une parité visuelle est attendue.
6. Choisir l'hébergeur (disque persistant), le domaine, et fournir les accès.

## 18. Résumé du handoff

`docs/OPENCODE_HANDOFF.md`, classé par blocage :
**A** (dans le dépôt : E2E, EXIF, interface utilisateurs, réservations, tests
complémentaires, accessibilité) · **B** (informations client : contacts,
inventaire, photos et droits, contenus, communes, captures) · **C** (production :
hébergement, secrets, sauvegardes, notifications, audit externe) · **D**
(vérification client : exactitude des données, droits des images, relecture
arabe, conformité, recette finale).

---

## Conclusion honnête

Le site **fonctionne** : il est typé, testé (161 tests réels), construit pour la
production, sécurisé et documenté. Il **n'est pas terminé au sens commercial** —
il n'est pas déployé, ne contient aucune donnée réelle, et plusieurs fonctions
périphériques (gestion des comptes, notifications, E2E) restent à faire.

**Je ne revendique donc pas 100 %.** La part restante dépend d'informations du
client, d'accès à un environnement de production et de validations humaines — pas
de code manquant dans le dépôt.

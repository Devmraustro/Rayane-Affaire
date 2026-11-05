# Rapport final — RAYANE AFFAIRE

**Date : 5 novembre 2026.** Ce rapport distingue les contrôles réellement
exécutés des points non terminés. Il ne revendique ni fusion, ni production,
ni URL publique non vérifiée.

## 1. Branche et commits

- Dépôt : `Devmraustro/Rayane-Affaire`
- Branche de session active : `arena/3f977b0a-rayane-affaire`
  (avancée par fast-forward depuis le checkpoint vérifié `2cdb0304408d80b2c57067320ca6a6cfea455aec`
  de `arena/ae2f313a-rayane-affaire`, lui-même descendant de `arena/c6e4a623-rayane-affaire` @ `9cd516e40cb9a917a709bc7fc75be34254531e1a`)
- Commit applicatif précédent vérifié : `44f355f9899331aa56b6c1479a78d01a18457b64`
- Commit documentaire précédent vérifié : `2cdb0304408d80b2c57067320ca6a6cfea455aec` (CI run `42105969372` réussi)
- Le `HEAD` exact de `arena/3f977b0a-rayane-affaire` après la passe de configuration
  preview, de durcissement Resend et de tests Nominatim se vérifie avec
  `git rev-parse HEAD` et `git ls-remote origin arena/3f977b0a-rayane-affaire`.
- Aucune fusion de PR, aucune modification de `main`, aucune mise en production.

## 2. Fonctionnalités livrées

### Lieux et cartographie

- Catalogue public `/places`, fiches `/places/[slug]`, sitemap et navigation ;
- administration complète : création/édition bilingue, catégories, communes,
  adresse, brouillon/publication/archivage, suppression manager+, aperçu privé ;
- médias attribués, galerie et réordonnancement ;
- géocodeur Nominatim côté serveur, authentifié et limité, placement Leaflet
  manuel et niveau de précision ;
- vérification de localisation uniquement par action éditeur séparée et auditée ;
  toute modification du point l'invalide ;
- projections publiques sans coordonnées non vérifiées ; itinéraire exact
  seulement pour un point vérifié.

### Comptes et sécurité

- Rôles owner/manager/editor, activation, protection du dernier owner actif,
  interdiction de l'auto-suppression owner ;
- mot de passe temporaire à changement forcé, reset owner et reset en libre-service ;
- jetons de reset hachés, à usage unique, expiration 30 minutes, révocation des sessions ;
- préférences par compte : **notifications désactivées par défaut** sur les nouveaux
  comptes, activation explicite par catégorie, email obligatoire ;
- adaptateur Resend sans secret navigateur, état « configuré » seulement avec clé
  et expéditeur réels ; aucune livraison réelle revendiquée.

### Médias, réservations et exploitation

- Médias `place` en plus de `property`/`vehicle`, réordonnancement transactionnel,
  suppression ligne + fichier et nettoyage d'orphelins manager+ ;
- nettoyage des médias/réservations/demandes lors de la suppression d'un parent ;
- création/édition/suppression de réservations, déduplication client, dates ISO
  strictes, refus des chevauchements `pending|confirmed|active`, statuts, liste,
  calendrier et notifications opt-in ;
- migration 003 additive/gardée, bootstrap de preview doublement verrouillé,
  bandeau de préproduction et refus d'indexation.

L'année 2024 non confirmée a été retirée de la marque, de l'accueil et des
paramètres. Les fixtures et le bootstrap n'injectent plus de téléphone, email ou
adresse susceptible d'être pris pour un contact réel.

## 3. Vérifications finales exécutées

| Contrôle | Résultat |
| --- | --- |
| `npm ci` | Succès |
| `npm run typecheck` | 0 erreur |
| `npm run lint` | 0 avertissement/erreur ESLint ; seul l'avis de dépréciation de `next lint` pour Next 16 reste |
| `npm test` | **251/251 tests, 14 fichiers** |
| `npm run build` | Succès, 30/30 pages statiques, build optimisé |
| `npm run test:e2e` | **6/6 desktop + 6/6 mobile**, build `next start` |
| Smoke preview | **19/19** |
| `npm audit` | **0 vulnérabilité**, graphe complet (570 dépendances ; les 10 anciens avis modérés `minimatch` de l'arbre ESLint sont éliminés par override) |
| `npm audit --omit=dev` | **0 vulnérabilité**, production (147 dépendances) |
| `npm run audit:gate` | Succès, 0 exception active |
| `git diff --check` | Succès |
| Staging secrets/DB/artefacts | Exclus et contrôlés avant chaque commit |

Détails et répartition : `docs/TESTING_REPORT.md`. Revue sécurité :
`docs/SECURITY_AUDIT.md`. Schéma/API : `docs/DATABASE_SCHEMA.md` et
`docs/API_DOCUMENTATION.md`.

### Migration historique

Une base pré-003 a été recréée depuis le schéma du commit de base avec un owner
et un média. La migration 001–003 s'applique, sa répétition est un no-op, les
lignes historiques sont conservées, le média garde ordre/crédit/licence et le
compte reçoit les nouvelles notifications à 0. Une base neuve et les migrations
répétées passent également.

### Navigateurs et preuves

Les 12 parcours couvrent CRUD bien/lieu/véhicule, publication, uploads HTTP,
ordre/suppression médias, réservation + chevauchement + calendrier, RBAC,
changement forcé, opt-in initial désactivé, FR/AR RTL, navigation mobile, maps et
frontières UI du géocodeur. **33 captures PNG** sont disponibles hors Git dans
`artifacts/screenshots/`, dont les variantes desktop/mobile et
`desktop-chromium-client-forced-password.png`.

Les captures ont été inspectées : pas de débordement horizontal observé à 390 px,
formulaires et galeries correctement empilés. Les tuiles OSM restent grises dans
le sandbox réseau ; les marqueurs et contrôles Leaflet sont visibles. Le chargement
des tuiles dans le navigateur du client n'est donc pas revendiqué comme vérifié.

## 4. Preview et accès — état honnête

| Cible | État réel |
| --- | --- |
| Arena persistante | **En cours d'exécution** sur le port 3000 (`0.0.0.0`) avec `data/preview.db` et `data/preview-uploads/` |
| URL Arena (session courante) | `https://3000-iay8pn3tiqnl3rqlpl15v.e2b.app` |
| Accès externe Arena | **403 sans `e2b-traffic-access-token`** (vérifié par requête HTTP externe non authentifiée) : utilisable via le Live Preview Arena authentifié, pas comme URL publique autonome |
| Contenu | 6 biens et 3 véhicules de démonstration marqués (`is_demo=1`) ; véhicules masqués publiquement par défaut ; aucune donnée client |
| Compte de remise | `owner.preview@rayane-affaire.invalid`, mot de passe une fois, redirection Chromium vers `/admin/password` vérifiée, notifications 0, sessions 0 |
| Identifiants | Fichier local privé `PREVIEW_ACCESS.txt`, ignoré par Git, mode 600 |
| Vercel (`rayane-affaire-preview`, `prj_Wh0IP89d5muyxMFopgNBMB1aagdS`) | **9 variables d'environnement `preview` configurées** (secrets en mode `sensitive`) ; **0 déploiement publié (`deployments: []`)** — bloqué par l'absence de liaison Git (`link` absent, ce qui force `POST /v13/deployments` en `target: "production"`) et par `ssoProtection: all_except_custom_domains` (401 SSO sur les URL `*.vercel.app`) |
| Railway | Connecteur non supporté dans l'environnement et aucune configuration/clé Railway présente |
| Production | Non déployée, non autorisée par ce rapport (les deux déploiements API que Vercel avait promus en `target: "production"` faute de `link` ont été annulés en phase `INITIALIZING` puis supprimés) |

**Critère « preview publiquement accessible sur une URL non-localhost » : NON
SATISFAIT.** La preview Arena est non-localhost et persistante mais exige le jeton
d'infrastructure E2B. Sur Vercel, le connecteur MCP ne permet ni de lier le dépôt
GitHub au projet existant (`link` absent dans `update_project`), ni de désactiver
`ssoProtection` (`Vercel Authentication`). Dès que le propriétaire effectue ces
deux réglages dans Vercel Dashboard (voir `docs/PREVIEW.md` §2), les 9 variables
`preview` déjà enregistrées permettent un déploiement Preview immédiat sans toucher
à la production. SQLite et `/tmp` sur Vercel restent éphémères : pour une preview
publique avec CRUD durable, utiliser Railway (avec volume `/data`) ou un VPS.

## 5. Données, médias et vérité métier

- Aucune annonce, photo, coordonnée, réservation, demande ou information client
  réelle n'a été ajoutée.
- Les 6 biens/3 véhicules optionnels sont marqués `is_demo=1`, utilisent les visuels
  de marque et n'ont pas de coordonnées de bien inventées.
- Les tests créent leurs propres PNG et données synthétiques puis suppriment leurs
  entités ; ces artefacts ne sont pas publiés comme inventaire réel.
- Les 11 communes conservent leurs centroïdes OSM administratifs, distincts des
  positions d'annonces. 42 communes restent à confirmer/ajouter pour couvrir 53.
- Les droits des photos, textes arabes, coordonnées, horaires, contacts, identité,
  mentions légales et année de création restent à faire valider par le client.

## 6. Limites non résolues

1. **Accès public de preview** : lier `Devmraustro/Rayane-Affaire` (`main` comme
   branche de référence non déployée) et désactiver `Vercel Authentication` sur
   `rayane-affaire-preview` dans Vercel Dashboard, ou déployer le conteneur sur
   Railway (volume `/data`) / VPS pour disposer aussi d'une persistance SQLite réelle.
2. **Géocodeur live** : le pare-feu SNI du sandbox E2B bloque le TLS sortant direct
   vers Nominatim (`SSL_ERROR_SYSCALL`), mais 5 requêtes réelles Nominatim v2
   (`Rue de la Liberté, Béjaïa`, `Béjaïa`, `Tichy`, `Sétif`, `بجاية` + recherche
   vide `[]`) ont été récupérées et validées de bout en bout dans `searchAddress()`
   et `GET /api/admin/geocode` ; l'appel direct depuis l'hôte public reste à
   confirmer à l'ouverture de l'URL publique.
3. **Email live** : aucun compte/domaine Resend configuré (`RESEND_API_KEY` et
   `EMAIL_FROM` absents), aucun email réel envoyé ; `/admin/notifications` et
   `/api/admin/notifications` n'affichent désormais Resend comme configuré que si
   la clé et l'expéditeur sont tous deux renseignés.
4. **Persistance production** : prévoir VPS/disque + sauvegardes, ou PostgreSQL +
   stockage objet avant Vercel. Tester une restauration avant données réelles.
5. **Qualité externe** : pas d'axe-core, charge, pentest ou validation utilisateur.
6. **Images** : orientation EXIF supprimée mais non appliquée aux pixels ;
   réorienter avant upload.
7. **Comptes** : 2FA non implémentée.

## 7. Remise et prochaine action

1. Ouvrir le composant **Live Preview Arena** de cette session (port 3000).
2. Récupérer `PREVIEW_ACCESS.txt` dans l'espace de travail privé, ne pas le committer.
3. Se connecter à `/admin/login`, choisir immédiatement un nouveau mot de passe.
4. Faire valider les parcours et fournir les vraies données/droits listés ci-dessus.
5. Pour une revue publique, terminer explicitement le déploiement preview et
   vérifier l'URL depuis une session externe non authentifiée avant de la transmettre.
6. Ne pas mettre de données client sur Vercel `/tmp` et ne pas lancer la production
   sans stockage durable, sauvegarde/restauration et validation finale.

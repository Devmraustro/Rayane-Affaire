# Rapport final — RAYANE AFFAIRE

**Date : 5 novembre 2026.** Ce rapport distingue les contrôles réellement
exécutés des points non terminés. Il ne revendique ni fusion, ni production,
ni URL publique non vérifiée.

## 1. Branche et commits

- Dépôt : `Devmraustro/Rayane-Affaire`
- Branche fixe : `arena/ae2f313a-rayane-affaire`
- Commit candidate initial : `f5845a3d9bdd739a7dc81192068efc7fc8ec92ec`
- **Commit applicatif/documentaire vérifié : `44f355f9899331aa56b6c1479a78d01a18457b64`**
- Le push de ce commit a été confirmé par `git ls-remote` avec le même SHA.
- Le commit suivant contient uniquement ce rapport final ; le `HEAD` exact est
  à vérifier avec `git rev-parse HEAD` et `git ls-remote origin <branche>`.
- Aucune fusion, aucune modification de `main`, aucune mise en production.

CI : le run GitHub Actions `42094421798` a réussi sur le commit candidate. Les
résultats locaux ci-dessous sont ceux du commit vérifié `44f355f…` ; les checks
du head final doivent être relus avec `gh run list --branch <branche>`.

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
| `npm test` | **247/247 tests, 14 fichiers** |
| `npm run build` | Succès, 30/30 pages statiques, build optimisé |
| `npm run test:e2e` | **6/6 desktop + 6/6 mobile**, build `next start` |
| Smoke preview | **19/19** |
| `npm audit` | **0 vulnérabilité**, graphe complet |
| `npm audit --omit=dev` | **0 vulnérabilité**, production |
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
| Arena persistante | **En cours d'exécution** sur le port 3000 avec `data/preview.db` et `data/preview-uploads/` |
| URL Arena | `https://3000-imfyajv2gktw72glqhpu5.e2b.app` |
| Accès externe Arena | **403 sans `e2b-traffic-access-token`** : utilisable via le Live Preview Arena authentifié, pas comme URL publique autonome |
| Contenu | 6 biens et 3 véhicules de démonstration marqués ; véhicules masqués publiquement par défaut ; aucune donnée client |
| Compte de remise | Mot de passe une fois, redirection Chromium vers `/admin/password` vérifiée, notifications 0, sessions 0 |
| Identifiants | Fichier local privé `PREVIEW_ACCESS.txt`, ignoré par Git, mode 600 |
| Vercel | Projet `rayane-affaire-preview` créé ; **aucun déploiement validé et aucune URL publique active** |
| Production | Non déployée, non autorisée par ce rapport |

**Critère « preview publiquement accessible sur une URL non-localhost » : NON
SATISFAIT.** La preview Arena est non-localhost et persistante mais exige le jeton
d'infrastructure. Aucun texte de ce rapport ne transforme ce 403 en réussite
publique. Le projet Vercel seul ne fournit pas d'URL de déploiement.

Le bootstrap Vercel reste disponible pour une future preview jetable avec
`VERCEL_ENV=preview` + `PREVIEW_EPHEMERAL=1`. Il ne contient aucune donnée client.
SQLite et `/tmp` sur Vercel sont éphémères et non fiablement partagés : cette cible
ne doit jamais être présentée comme stockage durable. Voir `docs/PREVIEW.md` et
`docs/DEPLOYMENT_GUIDE.md`.

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

1. **Accès public de preview** : déploiement externe à terminer ou autorisation de
   trafic Arena à configurer par l'administrateur de l'infrastructure.
2. **Géocodeur live** : accès direct Nominatim depuis le sandbox en échec TLS ;
   les tests simulés passent et un fetch externe a trouvé Béjaïa, mais la route
   authentifiée en ligne n'a pas été validée.
3. **Email live** : aucun compte/domaine Resend configuré, aucun email réel envoyé.
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

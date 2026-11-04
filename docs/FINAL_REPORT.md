# Rapport final — RAYANE AFFAIRE

**Mise à jour : 4 novembre 2026.** Ce rapport distingue les contrôles réellement
exécutés des points qui restent ouverts. Il ne revendique ni fusion, ni mise en
production, ni contrôle visuel en navigateur.

## A. Dépôt, branche et pull request

- Dépôt : <https://github.com/Devmraustro/Rayane-Affaire>
- Branche de travail fixe : `arena/c6e4a623-rayane-affaire`
- Pull request : **#1**, base `main`, état **OPEN** au moment de cette mise à jour.
- `main` n'a pas été modifiée. Pas de force-push, pas de fusion, pas de déploiement.
- Le rapport ne fixe pas un SHA de commit : vérifier le head exact avec `git log -1`
  et la pull request, qui sont la source de vérité après chaque push.

## B. Livraison fonctionnelle

Application bilingue (français LTR / arabe RTL) Next.js App Router, React,
TypeScript, Tailwind et SQLite (`node:sqlite`, Node ≥ 22.5) :

- site immobilier public : accueil, recherche/catalogue/fiche de bien, carte,
  services, à propos, contact, crédits, robots et sitemap ;
- section de véhicules administrable, rendue publique seulement si l'interrupteur
  principal l'autorise ;
- back-office avec authentification, rôles, biens, véhicules, médias, demandes,
  clients, réservations, calendrier, finances, paramètres et journal d'audit ;
- Zod 4 pour les validations et Vitest 5.1.0 pour les tests.

La base n'est pas versionnée. Sur une installation neuve, les migrations créent
11 communes OSM vérifiées et les réglages ; propriétés, véhicules, photos,
clients, demandes et comptes administrateur sont vides. Le script optionnel de
démonstration crée 6 propriétés et 3 véhicules clairement marqués, exclus des
statistiques publiques.

## C. Visibilité publique des véhicules

La migration additive `db/migrations/002_vehicle_public_visibility.sql` ajoute
`vehicle_public_visible`, défaut **false**. C'est le coupe-circuit principal. Le
réglage secondaire `vehicle_rental_enabled` ne peut jamais exposer une section
masquée.

Section masquée :

- `/vehicles` et les fiches répondent **404** ;
- navigation, accueil, services, à propos, footer, logo, métadonnées et sitemap
  n'exposent pas la section ;
- statistiques publiques ne comptent aucun véhicule ; l'API des demandes ne peut
  pas contourner le masquage avec un `vehicleId` ;
- le back-office garde son catalogue et son CRUD.

Le masquage est une projection à la lecture : aucune annonce, photo, disponibilité,
prix ou statut n'est supprimé ni réécrit. Réactiver la visibilité restaure le
catalogue avec un basculement en base, sans redémarrage. Lorsque la section est
publique, le réglage de location continue de retirer `rent` tout en conservant
`sale` et les annonces `both` présentées comme des ventes.

Le comportement a été vérifié sur build de production, dans les deux états :
**17/17 smoke** masqué, puis **17/17 smoke** public avec les 3 fiches de
démonstration ; la bascule n'a pas nécessité de redémarrage.

## D. Confidentialité des photos téléversées

`lib/server/image-sanitize.ts` traite les octets **avant leur écriture disque** :

- JPEG : retrait des blocs EXIF/XMP, IPTC et commentaires, conservation des
  marqueurs de couleur et du flux image ;
- PNG : conservation d'une liste autorisée de chunks de rendu, retrait de
  `eXIf`, chunks textuels, `tIME` et inconnus ;
- WebP : retrait EXIF/XMP, remise à jour des indicateurs VP8X et de la taille RIFF ;
- AVIF avec EXIF/XMP : refus HTTP 415 (échec fermé) plutôt que sauvegarde d'une
  image potentiellement géolocalisable.

22 tests ciblent les formats, GPS, structures malformées, idempotence et
conservation du contenu image. Limite connue : l'orientation EXIF est supprimée,
mais n'est pas appliquée aux pixels ; réorienter les photos avant l'upload.
Aucune bibliothèque image native n'a été ajoutée.

## E. Données et exactitude

- Aucune annonce réelle, photo client, information de contact, donnée client ou
  réservation n'a été inventée ou publiée. Par ailleurs,
  **aucune coordonnée d'annonce réelle** n'a été inventée ou publiée. Les
  positions du seed optionnel sont illustratives, balisées et non attribuées à
  un bien réel.
- Les 11 communes présentes sont issues de relations OpenStreetMap ; leurs
  centroïdes servent à décrire les communes, **jamais à inventer l'emplacement
  d'un bien**. 42 communes restent à confirmer/ajouter sur le référentiel de 53.
- Les positions d'annonces doivent déclarer leur précision (`exact`,
  `approximate`, `commune`, ou `pending` si la position est inconnue).
- Les photos exigent texte alternatif FR/AR, crédit et licence. Les droits et le
  contenu réel restent à fournir et confirmer par le client.
- La date de création, les horaires, les coordonnées professionnelles et les
  mentions légales restent à confirmer. Ne pas déduire ni recopier le numéro
  affiché dans une image sans confirmation écrite.

## F. Vérifications exécutées localement

Environnement : Node 22.22.3, Next.js 15.5.28, installation fraîche `npm ci`.
La migration a été testée sur une base SQLite jetable vide.

| Vérification | Résultat |
| --- | --- |
| TypeScript | `npm run typecheck` — 0 erreur |
| ESLint | `npm run lint` — 0 avertissement/erreur ESLint (Next signale la future suppression de `next lint` en v16) |
| Tests | **215/215**, 9 fichiers ; comprend 52 tests de politique véhicules et 22 tests de sanitisation |
| Production build | `npm run build` — réussite, 19/19 pages statiques générées, routes dynamiques servies à la demande |
| Migrations | `001_vehicle_rental_setting.sql` + `002_vehicle_public_visibility.sql` appliquées sur base vide ; 11 communes |
| Audit gate | 1 high accepté par exception motivée et datée, 0 high/critical non accepté |
| Smoke HTTP | **17/17** section masquée et **17/17** section publique sur un build de production |

Le contrôle HTTP n'est pas un contrôle visuel. Aucun E2E, navigateur, audit
axe-core, test de charge ni test d'intrusion externe n'a été exécuté.

## G. Dépendances, audit et intégration continue

`npm audit` (graphe complet) donne actuellement **20 avis** : 19 modérés,
1 élevé et 0 critique. `npm audit --omit=dev` donne 2 avis : le même PostCSS élevé
et un avis modéré Next. Les deux avis critiques précédemment présents dans le
couple Vitest/Tinypool ont disparu après le passage à **Vitest 5.1.0** ; toute la
suite passe avec cette version.

L'avis high résiduel vient de `postcss@8.4.31` imbriqué dans Next 15.5.28.
L'override npm tenté n'a pas remplacé cette copie imbriquée ; il a été retiré pour
ne pas laisser croire qu'il avait corrigé le problème. Une entrée explicite dans
`.github/audit-exceptions.json` accepte exactement les GHSA constatés jusqu'au
**31 mars 2027**. C'est une exception temporaire, **pas un correctif** ; le
remède planifié est une migration Next 16 vérifiée.

Le workflow `.github/workflows/ci.yml` exécute installation, typecheck, lint,
migration, tests, build, audit du graphe complet et contrôle des fichiers
secrets/DB. Il utilise le runner `ubuntu-24.04`, `actions/checkout@v7` et
`actions/setup-node@v7` avec Node 22 pour le projet. `scripts/audit-gate.mjs`
bloque les avis high/critical sans exception valide ; des essais ont vérifié
qu'une exception expirée, hors package, sans raison, avec mauvais GHSA, ou un
rapport npm incomplet échoue en fermé.

GitHub Actions a confirmé le workflow sur push et pull request : les runs
`41883710180` et `41883722087` ont tous deux réussi sur le commit `59649d7` le
4 novembre 2026 (jobs qualité/build et audit des dépendances). Vérifier les
checks après toute nouvelle mise à jour pour confirmer le head courant.

## H. État du projet

- Pull request ouverte ; changements non fusionnés.
- **Non déployé** : aucun hébergeur, domaine ou environnement de production
  configuré. Ne pas cliquer sur un déploiement depuis cette tâche.
- Pas de navigateur/E2E : installation Chromium indisponible dans cet
  environnement ; le responsive et le RTL n'ont pas été vus visuellement.
- Aucun audit d'intrusion externe.
- L'image d'orientation EXIF reste une limitation opératoire.
- Le postcss high reste soumis à l'exception datée ; Next 16 n'est pas migré.

## I. Travaux encore ouverts

**À faire dans le dépôt :** E2E dans un environnement avec navigateur ; appliquer
l'orientation EXIF aux pixels après décision sur une bibliothèque ; UI de gestion
des comptes ; ergonomie réservations/calendrier/médias ; tests des modules et de
la route `DELETE /api/admin/media` ; audit accessibilité. Planifier la migration
Next 16 avant l'expiration du 31 mars 2027.

**À obtenir du client :** coordonnées exactes, horaires, photos et droits,
inventaire réel et précision GPS, identité éditoriale/année de création,
communes couvertes, validation du texte arabe et captures de référence.

**À obtenir pour la production :** hébergeur à disque persistant (ou migration
DB + objet), domaine, secrets, compte owner, sauvegarde/restauration testée,
supervision, notifications, mentions légales et validation finale par l'agence.
Voir `docs/OPENCODE_HANDOFF.md` pour les éléments classés par blocage et leur
critère d'acceptation.

## J. Suites et garde-fous

1. Garder les changements sur la branche fixe `arena/c6e4a623-rayane-affaire` et
   vérifier la SHA distante ainsi que le corps de la PR #1 après chaque push.
2. Lire les checks GitHub Actions associés au head de la PR ; un résultat local
   ne remplace pas un passage distant. Corriger tout échec avant toute fusion.
3. Garder le véhicule masqué par défaut, conserver les migrations additives et
   vérifier les deux états dans les tests après tout changement aux lectures
   publiques.
4. Ne publier aucune annonce, photo, coordonnée, date ou donnée de contact sans
   validation de sa source et de son droit d'usage.
5. **Aucune fusion ni aucun déploiement n'est autorisé par ce rapport.** Ils
   nécessitent une demande explicite et une relecture.

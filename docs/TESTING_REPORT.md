# Rapport de tests

**Dernière vérification locale : 4 novembre 2026** (Node.js 22.22.3, Linux,
Next.js 15.5.28). Les résultats locaux ci-dessous proviennent de commandes
exécutées dans le dépôt. La ligne GitHub Actions repose sur les runs distants
cités plus bas ; aucun déploiement n'a été effectué.

---

## 1. Résumé du contrôle qualité

| Vérification | Résultat observé |
| --- | --- |
| Installation reproductible | `npm ci` terminé ; lockfile accepté |
| Migrations sur base vide | succès ; migrations `001_vehicle_rental_setting.sql` et `002_vehicle_public_visibility.sql` appliquées ; 11 communes, 0 propriété, 0 véhicule, 0 admin |
| TypeScript | `npm run typecheck` — **0 erreur** |
| ESLint | `npm run lint` — **0 avertissement, 0 erreur** (Next signale que `next lint` est déprécié pour Next 16 ; à migrer séparément) |
| Vitest | **215 tests réussis / 215**, 9 fichiers, durée observée 3,92 s avec Vitest 5.1.0 |
| Build | `npm run build` — **succès**, Next.js 15.5.28 ; 19/19 pages statiques générées, le reste servi dynamiquement |
| Audit de toutes les dépendances | `npm audit` — **20 avis** : 19 modérés, 1 élevé, 0 critique. `npm run audit:gate` accepte uniquement l'avis high postcss, avec exception datée au 31 mars 2027 ; 0 high/critical non accepté. `npm audit --omit=dev` rapporte 2 avis (postcss high, Next moderate). Voir `docs/SECURITY_AUDIT.md` §10. |
| Smoke HTTP sur build de production | **17/17** section véhicules masquée, puis **17/17** section publique après bascule en base, sans redémarrer le serveur |
| Navigateur/E2E | **Non exécutés** : aucun navigateur installé, donc aucun contrôle visuel, responsive ou E2E revendiqué |
| GitHub Actions | Les exécutions `push` et `pull_request` ont passé sur la branche : jobs `quality` et `security` réussis ; voir les checks de la PR #1 pour l'état du head courant. |
| Déploiement | **Non effectué** ; aucune publication ni déploiement lancé depuis cette tâche. |

La commande `npm run lint` affiche également l'avertissement de maintenance de
Next : `next lint` sera retiré en Next.js 16. Cela ne produit actuellement aucune
erreur ou alerte ESLint. Vitest 5.1.0 affiche un avertissement Vite non bloquant
sur le chargement de `vitest.config.ts` en mode natif (comportement annoncé pour
une future version majeure) ; la suite complète passe néanmoins.

---

## 2. Répartition Vitest

| Fichier | Tests | Couverture principale |
| --- | ---: | --- |
| `tests/validation.test.ts` | 20 | Téléphones algériens, assainissement de texte FR/AR, demandes, connexion, annonces et véhicules |
| `tests/filters.test.ts` | 11 | Paramètres de recherche, valeurs invalides, pagination, communes, sérialisation |
| `tests/format.test.ts` | 13 | DZD FR/AR, surfaces, dates, durées, références et slugs |
| `tests/i18n.test.ts` | 14 | Parité des dictionnaires, arabe, marque, locale, directions et énumérations |
| `tests/security.test.ts` | 22 | scrypt, sessions, CSRF, limitation, magic bytes, refus des fichiers malveillants et déguisés, quota et suppressions limitées |
| `tests/database.test.ts` | 20 | SQLite réel temporaire, communes, intégrité, propriétés, véhicules, carte, statistiques et médias |
| `tests/api.test.ts` | 41 | Authentification, rôles, CSRF, CRUD, demandes, upload, réponses HTTP, settings et audit |
| `tests/vehicle-rental-setting.test.ts` | 52 | Réglage secondaire de location, masquage global, toutes les lectures publiques, admin, restauration, API, FR/AR et intégrité des lignes |
| `tests/image-sanitize.test.ts` | 22 | JPEG/PNG/WebP/AVIF, EXIF/GPS, XMP, commentaires, structure, idempotence et refus fail-closed |
| **Total** | **215** | **9 fichiers** |

Les tests d'images utilisent des conteneurs construits à la main avec des
marqueurs GPS, dont un JPEG avec en-têtes DQT/SOF0/DHT réalistes, un PNG avec
`eXIf`/`tEXt` et un WebP dont les bits VP8X annoncent les chunks supprimés.
Ils vérifient que les octets de données image conservés ne sont pas modifiés,
que les coordonnées ne survivent pas et que les entrées malformées échouent au
lieu d'être stockées.

Les tests de base utilisent des fichiers SQLite temporaires et les gestionnaires
d'API sont appelés avec de vrais objets `Request` et `FormData` Node. Les tests
ne dépendent pas d'un navigateur ni d'un service externe.

---

## 3. Smoke HTTP de la build

Le script `scripts/smoke.ts` effectue 17 contrôles : routes publiques, robots,
sitemap, garde de l'administration, page de connexion, pages 404, cohérence de
la section véhicules, et absence de numéro téléphonique factice. Le contrôle
véhicules accepte les deux états métier légitimes mais exige que toutes les
surfaces publiques concordent.

Vérification faite sur un build Next de production, base jetable migrée et
chargée avec les 6 propriétés / 3 véhicules de démonstration. Le serveur est
resté démarré pendant le changement du réglage :

| État | Résultats clés | Smoke |
| --- | --- | --- |
| `vehicle_public_visible = false` (valeur par défaut) | `/vehicles` et fiches → 404 ; aucune mention sur l'accueil ; menu masqué ; sitemap sans URL véhicule | **17/17** |
| `vehicle_public_visible = true` | `/vehicles` → 200 ; catalogue avec 3 fiches ; menu visible ; sitemap inclus | **17/17** |

La bascule n'a nécessité ni redémarrage ni modification des lignes véhicules.
Cette base de démonstration a été supprimée après le contrôle. Elle n'est pas une
base de production. Le test HTTP n'est pas un test visuel : aucun navigateur n'a
été utilisé.

---

## 4. Autres contrôles et limites

- Les migrations ont été exécutées sur une base vide : elles créent le réglage
  principal avec le défaut masqué. L'application ne supprime pas ni ne modifie
  les véhicules lors d'une bascule ; les tests de politique vérifient aussi la
  restauration et les lectures d'administration.
- Les tests couvrent le retrait des métadonnées **avant l'écriture**. Une image
  AVIF contenant EXIF/XMP est refusée (l'application ne peut pas la sanitiser
  sûrement sans réécrire la structure ISO-BMFF). Les images JPEG/PNG/WebP sont
  débarrassées des blocs non visuels connus.
- L'orientation EXIF est supprimée avec les autres métadonnées. Une photo prise
  de travers doit être réorientée avant l'envoi ; la rotation des pixels à
  l'upload n'est pas encore implémentée.
- Pas de test E2E, de vérification visuelle, d'audit axe-core, de test de charge,
  ni de test d'intrusion externe.
- Les photographies, coordonnées, horaires, coordonnées professionnelles et
  inventaire réels restent à confirmer/fournir par le client.
- Le pipeline `.github/workflows/ci.yml` a passé les jobs `quality` et
  `security` sur push et sur pull request (4 novembre 2026). Un passage local ne
  remplace pas le contrôle du head courant : vérifier `gh run list` et les checks
  de la PR avant toute déclaration ultérieure.

---

## 5. Reproduire le contrôle local

Le pipeline démarre avec une base vide. Reproduire ses étapes principales :

```bash
npm ci
export NODE_ENV=test
export DATABASE_PATH=./data/ci.db
npm run db:migrate
npm run typecheck
npm run lint
npm run test
npm run build
npm run audit:gate
```

Pour le smoke HTTP, semer uniquement la base jetable, lancer le serveur de
production sur le build, puis exécuter le script ; inverser le réglage en base
pour vérifier l'autre état. **Ne pas employer `data/rayane.db` pour ce contrôle**
si elle contient des données à conserver.

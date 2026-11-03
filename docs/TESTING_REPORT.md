# Rapport de tests

**Toutes les valeurs de ce document proviennent d'exécutions réelles** sur la
machine de développement (Node 22.22.3, Linux, base SQLite temporaire par fichier
de test). Aucun résultat n'est estimé.

Dernière exécution : 3 novembre 2026.

---

## 1. Résumé

| Vérification | Commande | Résultat |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | ✅ **0 erreur** |
| Lint | `npm run lint` (`next lint`) | ✅ **0 avertissement, 0 erreur** |
| Tests | `npm test` (`vitest run`) | ✅ **175 tests / 175 réussis**, 8 fichiers, ~5 s |
| Build de production | `npm run build` | ✅ **compilé, 20 pages générées**, 37 entrées de route + middleware, aucune erreur |
| Vérifications HTTP | `npm run smoke` | ✅ **17/17** (15 contrôles de route : 8 pages publiques, `robots.txt`, `sitemap.xml`, garde admin, connexion admin, 3 contrôles `404` ; + 2 assertions sur le HTML servi : cohérence menu ↔ sitemap, absence de numéro factice) |
| Parcours admin réel | `curl` (connexion → CRUD → upload → publication) | ✅ voir §6 |

Aucun test n'est désactivé, ignoré (`skip`) ou marqué `todo`. Aucune couverture
n'a été réduite. Aucune assertion n'a été retirée pour faire passer la suite.

---

## 2. Répartition des tests

| Fichier | Tests | Ce qui est couvert |
| --- | --- | --- |
| `tests/validation.test.ts` | 20 | Normalisation des téléphones (`0X`, `+213`, `00213`), assainissement du texte (caractères de contrôle, accents, arabe), schéma de demande (nom/phone/message/consentement/e-mail/langue/piège), schéma de connexion, schéma bien (titres bilingues, coordonnées par paires, plages, prix négatif), schéma véhicule (prix obligatoires selon `dealType`, année plausible) |
| `tests/filters.test.ts` | 11 | Analyse des paramètres d'URL, valeurs d'énumération inconnues ignorées, bornage de page, slug de commune hostile rejeté, troncature de la recherche, aller-retour de sérialisation, comptage des filtres actifs |
| `tests/format.test.ts` | 13 | Prix DZD par langue, chiffres latins en arabe, absence de décimales, surfaces, dates (valide/invalide/nulle), durée en jours, références `RA-P-####`, slugs (accents, arabe, collisions, tentative de traversée) |
| `tests/i18n.test.ts` | 14 | Parité stricte des clés FR/AR, aucune valeur vide, aucune chaîne arabe restée en français, écriture arabe sur les libellés critiques, marque cohérente, absence du nom du projet de référence, absence de numéro factice, helpers de locale/direction, couverture de toutes les énumérations |
| `tests/security.test.ts` | 21 | scrypt (sel, vérification, hash malformé, Unicode, politique), jeton de session haché en base, comparaison CSRF, limitation de débit, détection MIME par magic bytes, refus SVG/HTML/PHP, taille, fichier déguisé, suppression limitée, entrées hostiles stockées en texte |
| `tests/database.test.ts` | 20 | 11 communes OSM dans la boîte englobante de la wilaya, clés étrangères, contrainte `pending ⇒ coordonnées NULL`, cycle création/publication, refus de publier sans photo, invisibilité des brouillons, règle des marqueurs de carte, filtres/recherche FR+AR/tri/pagination, cycle véhicule, exclusion des données de démonstration des statistiques, zéros sur base vide, suppression transactionnelle des médias |
| `tests/api.test.ts` | 41 | Connexion (succès, échec générique, compte inconnu, origine croisée, validation), cookies (HttpOnly pour la session, CSRF lisible, `SameSite`, `Expires`), déconnexion révoquant la session, CSRF (absent/faux), rôles (éditeur, manager, propriétaire), compte désactivé, session expirée, session révoquée, jeton forgé, CRUD bien complet, `422` avec codes i18n, `422 MEDIA_REQUIRED`, `404`, audit, suppression, demandes publiques (valide, invalide, piège, quota `429`), **réglage de location** : persistance, `changed=false` sans écriture d'audit, détail d'audit avant/après, éditeur refusé (`403`), CSRF absent (`403`), non authentifié (`401`), trois `422` (type faux, clé inconnue, objet vide), JSON illisible (`400`) |
| `tests/vehicle-rental-setting.test.ts` | 35 | Défaut `true` et préservation du comportement ; lecture d'une valeur absente, vide ou illisible ⇒ défaut ; analyse/sérialisation des booléens ; `RENTABLE_DEAL_TYPES`, `isRentableDealType`, `projectVehicleForPublic`. **Catalogue** : les trois annonces en location activée, `rent` exclue et `sale`+`both` conservées en location désactivée, filtres et recherche toujours appliqués. **Fiches** : `rent` ⇒ `null`, `sale` et `both` ⇒ résolues ; `both` projetée en vente (prix/jour `null`, prix de vente conservé) ; **la ligne en base n'est pas modifiée** (vérifié en SQL et via le lecteur admin) ; une annonce `both` sans prix de vente ne peut pas exister (contrainte `CHECK`), et la requête la refuserait quand même. **Une** : mise en avant de l'inventaire de vente. **Statistiques** : le total égale exactement ce que le catalogue sert. **Navigation** : entrée « Véhicules à vendre » conservée, retirée seulement sans stock. **Sitemap** : `/vehicles` et fiches de vente inclus, URL de location exclues. **Projection** : identité si location activée, `both` → `sale` sinon, aucun prix inventé. **Surfaces de location** : filtres, carte service, CTA du héros et action de réservation restent conditionnels. **Immobilier identique** dans les deux états |

**Total : 175 tests.** Répartition par nature : 92 tests unitaires purs, 83 tests
d'intégration (base SQLite réelle et/ou gestionnaires de route réels).

---

## 3. Ce que les tests d'intégration utilisent réellement

- **Base de données** : un fichier SQLite temporaire par fichier de test
  (`tests/helpers/temp-db.ts`), schéma appliqué, 11 communes semées, supprimé
  après exécution. Aucune base en mémoire factice.
- **Gestionnaires de route** : les fonctions `POST`/`PATCH`/`DELETE` exportées par
  `app/api/**/route.ts` sont appelées directement avec de vrais objets `Request`
  (en-têtes `host`, `origin`, `cookie`, `x-ra-csrf`, corps JSON ou `FormData`).
  Aucun `fetch` simulé, aucun serveur externe requis.
- **Sessions** : émises par la fonction de production `issueSession()` puis
  résolues par `resolveSessionToken()` : le chemin de code est celui de
  l'application.
- **Mots de passe** : hachage scrypt réel (lent par construction : ~370 ms pour
  la vérification la plus coûteuse, d'où la durée de `security.test.ts`).
- **Téléversements** : écriture réelle sur disque dans un dossier temporaire,
  puis suppression.

Aucune dépendance n'est moquée. La seule chose qui n'est pas exercée en test est
la couche `next/headers` (cookies de réponse Next.js), parce qu'elle exige un
contexte de requête Next ; c'est précisément pour cela que la logique a été
extraite dans `issueSession` / `serializeSessionCookies` / `credentialsFromRequest`
et que les attributs de cookie sont vérifiés sur les en-têtes `Set-Cookie` réels.

---

## 4. Vérifications manuelles (serveur de développement)

Exécutées avec `curl` contre `npx next dev` sur le port 3000.

### Routes publiques

```
/                    200      /map        200      /robots.txt    200
/properties          200      /services   200      /sitemap.xml   200
/vehicles            200      /about      200      /inconnue      404
                              /contact    200      /credits       200
```

### RTL et contenu

- `GET /` avec le cookie `ra_locale=ar` ⇒ `<html lang="ar" dir="rtl">` ;
- `GET /properties/<slug>` en arabe ⇒ titre arabe et mention de précision
  « موقع تقريبي (الحي) » ; en français « Position approximative (quartier) ».

### Back-office

| Étape | Résultat |
| --- | --- |
| `POST /api/auth/login` (identifiants corrects) | `200`, `Set-Cookie` avec `ra_session` (`HttpOnly`) et `ra_csrf` |
| `POST /api/auth/login` (mot de passe faux) | `401 INVALID_CREDENTIALS` |
| `GET /admin` sans session | `307` → `/admin/login` |
| `GET /admin`, `/admin/properties`, `/vehicles`, `/inquiries`, `/customers`, `/reservations`, `/calendar`, `/finances`, `/settings` avec session | `200` pour les 9 pages |
| `POST /api/admin/properties` sans `x-ra-csrf` | `403 CSRF` |
| `POST /api/admin/properties` avec jeton | `200`, référence `RA-P-0001`, slug `test-appartement-f3-bejaia` |
| `PATCH … {statusOnly:"published"}` sans photo | `422 MEDIA_REQUIRED` |
| `POST /api/admin/media` (PNG réel) | `200`, URL `/api/media/<uuid>.png` |
| `PATCH … {statusOnly:"published"}` avec photo | `200` |
| `PATCH …` avec coordonnées + précision `approximate` | `200`, la fiche publique affiche « Position approximative » |
| `PATCH /api/admin/inquiries/<id>` | statut et notes internes persistés |

### Politique de données

- La page d'accueil, avec 1 annonce réelle + 6 annonces de démonstration, affiche
  **1** bien publié, **0** véhicule publié : les démonstrations sont exclues des
  statistiques.
- Les annonces de démonstration n'apparaissent pas dans la sélection « en
  vedette » de la page d'accueil, mais restent visibles dans le catalogue avec le
  badge « Démonstration ».

### Deux régressions trouvées en vérifiant le build de production

Les deux ont été **corrigées** et sont désormais couvertes, mais elles méritent
d'être consignées : elles ne se voyaient ni dans les tests, ni dans `next dev`.

| Symptôme | Cause | Correctif | Preuve |
| --- | --- | --- | --- |
| `/vehicles/<inexistant>` et `/properties/<inexistant>` répondaient `200` avec le corps « page introuvable » (*soft 404*) | Un `loading.tsx` crée une frontière Suspense : la réponse est diffusée (statut déjà envoyé `200`) avant que `notFound()` ne puisse fixer `404`. Le problème venait de `app/loading.tsx` **et**, après suppression, du `loading.tsx` des segments `/vehicles` et `/properties` | Suppression du squelette racine et des squelettes de ces deux segments ; conservé uniquement sur `/map` (route feuille) | `curl -o /dev/null -w '%{http_code}'` ⇒ `404` sur build de production ; **2 contrôles ajoutés à `smoke`** |
| `/admin/login` répondait `307` vers `/admin/login` : **connexion impossible** | `app/admin/layout.tsx` gardait toutes les URL `/admin`, y compris la page de connexion | Le layout exempte `/admin/login`, dont le chemin est transmis par le middleware dans `x-pathname` (les en-têtes ne l'exposent pas) | `/admin/login` → `200`, `/admin` → `307` vers `/admin/login?next=%2Fadmin`, connexion puis **9 pages admin en `200`** ; `/admin` reste protégé. **Échappement impossible** : comparaison exacte (`===`, pas `startsWith`) et `x-pathname` réécrit par le middleware avec `Headers.set` ; un en-tête forgé `x-pathname: /admin/login` (seul ou avec `x-invoke-path`) sur `/admin` et `/admin/settings` renvoie **`307`** et **aucun contenu d'administration** (vérifié par `curl` sur le build de production) |

Un troisième défaut, plus discret, a été corrigé dans la même passe : le
`sitemap.xml` était **prégénéré** alors qu'il dépend d'un réglage en base ; il
continuait donc à annoncer les URL de location après désactivation
(`x-nextjs-cache: HIT`). Il est passé en `force-dynamic` et `smoke` vérifie
désormais la cohérence menu ↔ sitemap.

### Remarque sur la fiabilité du script `smoke`

Le serveur de développement et `next build` écrivent tous deux dans `.next`. Si
le script `smoke` est lancé **pendant** un build de production, une requête peut
échouer transitoirement (le serveur de développement recompile). Observé une
fois, puis reproduction impossible : 3 exécutions consécutives sans échec, et un
contrôle direct des routes publiques (`/` → 200 … `/admin` → 307).
**Conclusion : lancer `smoke` contre un serveur au repos** (ou contre la
production, où aucun build ne tourne). Ce n'est pas un défaut applicatif.

### En-têtes de sécurité observés

```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; …
  object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors …
permissions-policy: camera=(), microphone=(), geolocation=(self), payment=(), usb=()
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
```

(`'unsafe-inline' 'unsafe-eval'` pour `script-src` correspond au mode
développement ; en production le middleware émet `'nonce-…' 'strict-dynamic'`.)

---

## 4 bis. Réglage de la location de véhicules — matrice vérifiée de bout en bout

Le réglage est couvert par 44 tests automatisés (35 + 9), et son effet public a
aussi été vérifié à la main **sur un build de production**, dans les deux états,
en FR et en AR.

**Base de vérification** : 6 biens et 3 véhicules de démonstration (`rent`,
`rent`, `both`) — le jeu de démonstration ne contient **aucun véhicule en
vente**. Les lignes concernant la vente ont donc été vérifiées avec deux
annonces réelles créées pour l'occasion (une `sale`, une `both`) puis
**supprimées** ; la base est revenue à son état d'origine (3 véhicules, location
`true`). Aucune donnée inventée ne subsiste.

| Surface | Location activée (défaut) | Location désactivée |
| --- | --- | --- |
| Menu (en-tête, pied de page) | « Véhicules » | **« Véhicules à vendre »**, même lien `/vehicles` |
| `/vehicles` | 3 véhicules | **accessible**, titre « Véhicules à vendre » |
| Fiche `sale` | `200` | **`200`** (inchangée) |
| Fiche `rent` | `200` | **`404`** |
| Fiche `both` | `200`, prix/jour + prix de vente | **`200`** présentée en vente : prix de vente seul, prix/jour retiré |
| Une — bloc véhicules | « Véhicules à la une » | **« Véhicules à vendre à la une »** |
| Une — CTA du héros | « Louer un véhicule » | **« Véhicules à vendre »** |
| Bandeau de chiffres — tuile véhicules | présente | **présente**, comptant l'inventaire de vente |
| `/services` — carte location | présente | **absente** |
| Carte du catalogue — filtre location | options `rent` + `both` | **absentes**, option `sale` seule |
| Fiche détail — action de réservation | présente | **absente** (intent `vehicle`, pas `reservation`) |
| Métadonnées (description, mots-clés) | « location de véhicules » | **« vente de véhicules »** |
| `sitemap.xml` | `/vehicles` + fiches | **`/vehicles` + fiches de vente**, aucune URL de location |
| `/admin/vehicles` | 3 véhicules | **inventaire complet**, `deal_type` réel visible |
| `/properties`, `/map` | référence | **identique** (aucune régression) |

Ces valeurs ont été obtenues par `curl` sur le HTML servi, pas par lecture du
code. Le script `smoke` les contrôle partiellement (catalogue joignable, fiches
résolues, cohérence menu ↔ sitemap, présence des fiches réelles au sitemap).

### Ce que cette matrice a corrigé

Une version antérieure retirait **toute** la surface véhicules quand la location
était désactivée : entrée de menu supprimée, bloc de la une supprimé, URL du
sitemap supprimées. Les annonces de vente restaient en base et accessibles par
URL directe, mais devenaient **introuvables** — le réglage masquait donc la
vente, à l'inverse de l'exigence. Trois conséquences corrigées dans ce lot :

1. le menu propose désormais « Véhicules à vendre » au lieu de disparaître ;
2. la une et le sitemap exposent l'inventaire de vente ;
3. une annonce `both` reste publique, projetée en vente (prix de location retiré),
   sans modification de la ligne en base.

**Limite honnête** : cette matrice a été établie sur du HTML et des codes de
statut, pas sur un rendu visuel. Aucun navigateur n'était disponible (voir §6).

## 5. Build de production

Sortie réelle (`npm run build`) :

```
 ✓ Compiled successfully
  Linting and checking validity of types ...
 ✓ Generating static pages (19/19)

Route (app)                                 Size  First Load JS
┌ ƒ /                                    12.1 kB         159 kB
├ ƒ /_not-found                            175 B         104 kB
├ ƒ /about                               3.37 kB         148 kB
├ ƒ /admin                                 504 B         107 kB
├ ƒ /admin/calendar                        175 B         104 kB
├ ƒ /admin/customers                       175 B         104 kB
├ ƒ /admin/finances                        504 B         107 kB
├ ƒ /admin/inquiries                      4.62 kB         145 kB
├ ƒ /admin/login                            5 kB         136 kB
├ ƒ /admin/properties                      3.2 kB         144 kB
├ ƒ /admin/properties/[id]/edit            147 B         169 kB
├ ƒ /admin/properties/new                  147 B         169 kB
├ ƒ /admin/reservations                    175 B         104 kB
├ ƒ /admin/settings                      2.08 kB         140 kB
├ ƒ /admin/vehicles                        3.2 kB         144 kB
├ ƒ /admin/vehicles/[id]/edit              148 B         169 kB
├ ƒ /admin/vehicles/new                    147 B         169 kB
├ ƒ /api/admin/inquiries/[id]              175 B         104 kB
├ ƒ /api/admin/media                       175 B         104 kB
├ ƒ /api/admin/properties                  175 B         104 kB
├ ƒ /api/admin/properties/[id]             175 B         104 kB
├ ƒ /api/admin/settings                    175 B         104 kB
├ ƒ /api/admin/vehicles                    175 B         104 kB
├ ƒ /api/admin/vehicles/[id]               175 B         104 kB
├ ƒ /api/auth/login                        175 B         104 kB
├ ƒ /api/auth/logout                       175 B         104 kB
├ ƒ /api/inquiries                         175 B         104 kB
├ ƒ /api/media/[file]                      175 B         104 kB
├ ƒ /contact                             1.77 kB         158 kB
├ ƒ /credits                              203 B         139 kB
├ ƒ /map                                 5.19 kB         144 kB
├ ƒ /properties                          4.17 kB         151 kB
├ ƒ /properties/[slug]                   7.52 kB         195 kB
├ ○ /robots.txt                            175 B         104 kB
├ ƒ /services                            2.55 kB         141 kB
├ ƒ /sitemap.xml                           175 B         104 kB
├ ƒ /vehicles                            5.72 kB         150 kB
└ ƒ /vehicles/[slug]                     6.28 kB         181 kB

+ First Load JS shared by all             103 kB
ƒ Middleware                                           34.5 kB
```

**38 entrées de route** (27 pages, dont `robots.txt` généré, + 11 routes API) et
le middleware. JS partagé : **103 kB**. Aucune erreur, aucun avertissement ESLint,
et **20 pages statiques générées**

Trois écarts avec l'exécution précédente, chacun expliqué :

- **+1 route API** : `/api/admin/settings` (réglage de la location de véhicules).
- **`/sitemap.xml` passe de `○` (statique) à `ƒ` (dynamique)** : son contenu dépend
  désormais du réglage en base. Prégénéré, il continuait d'annoncer les URL de
  location après la désactivation (`x-nextjs-cache: HIT` constaté sur le serveur
  de production). `robots.txt` reste statique.
- **`app/loading.tsx` supprimé**, remplacé par `app/map/loading.tsx` : le
  squelette racine provoquait des *soft 404* (cf. §6).

## 6. Ce qui n'est **pas** testé automatiquement

| Domaine | Raison | Comment c'est vérifié aujourd'hui |
| --- | --- | --- |
| Rendu visuel et responsive (mobile, tablette, RTL) | Aucun navigateur sans interface disponible dans l'environnement de développement (installation Chromium impossible) | Vérification manuelle du HTML rendu, classes logiques, `curl` en FR et AR ; **à refaire dans un vrai navigateur** (bloc D du handoff) |
| Carte Leaflet (tuiles, clustering, popups) | Nécessite un navigateur et un accès réseau aux tuiles OSM | Vérification que la page rend le conteneur et que `listPropertyMapPoints` applique la règle de précision (test d'intégration) |
| Téléversement depuis un vrai navigateur (`FormData`) | Pas de navigateur | Gestionnaire de route testé avec `FormData` construit en Node |
| Envoi d'e-mails / WhatsApp | Aucun service configuré | Non implémenté (voir handoff) |
| Charge et performance sous trafic | Pas d'outil de charge | À faire avant lancement (bloc C du handoff) |
| Test d'intrusion | Hors périmètre de cette mission | Liste des risques résiduels dans `SECURITY_AUDIT.md` |
| Déploiement en production | Aucun accès serveur | Non revendiqué : voir `DEPLOYMENT_GUIDE.md` |

**Aucun de ces points n'est revendiqué comme testé.**

---

## 7. Reproduire ces résultats

```bash
npm install
npm run typecheck     # 0 erreur
npm run lint          # 0 avertissement
npm test              # 175 tests
npm run build         # build de production
npm run dev &         # puis, dans un autre terminal :
npm run smoke -- http://localhost:3000
```

Les tests créent leurs propres bases temporaires : ils n'écrasent jamais
`data/rayane.db`.

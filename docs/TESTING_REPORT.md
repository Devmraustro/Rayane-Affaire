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
| Tests | `npm test` (`vitest run`) | ✅ **131 tests / 131 réussis**, 7 fichiers, ~4 s |
| Build de production | `npm run build` | ✅ **compilé, 19 pages générées**, 36 entrées de route + middleware, aucune erreur |
| Vérifications HTTP | `npm run smoke` | ✅ **14/14** (13 routes + absence de numéro factice) |
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
| `tests/api.test.ts` | 32 | Connexion (succès, échec générique, compte inconnu, origine croisée, validation), cookies (HttpOnly pour la session, CSRF lisible, `SameSite`, `Expires`), déconnexion révoquant la session, CSRF (absent/faux), rôles (éditeur, manager, propriétaire), compte désactivé, session expirée, session révoquée, jeton forgé, CRUD bien complet, `422` avec codes i18n, `422 MEDIA_REQUIRED`, `404`, audit, suppression, demandes publiques (valide, invalide, piège, quota `429`) |

**Total : 131 tests.** Répartition par nature : 68 tests unitaires purs, 63 tests
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

### Remarque sur la fiabilité du script `smoke`

Le serveur de développement et `next build` écrivent tous deux dans `.next`. Si
le script `smoke` est lancé **pendant** un build de production, une requête peut
échouer transitoirement (le serveur de développement recompile). Observé une
fois, puis reproduction impossible : 3 exécutions consécutives sans échec, et un
contrôle direct des 13 routes (`/` → 200 … `/admin` → 307, 17–199 ms chacune).
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

## 5. Build de production

Sortie réelle (`npm run build`, extrait ; les lignes API sont regroupées) :

```
✓ Compiled successfully
  Linting and checking validity of types ...
✓ Generating static pages (19/19)

Route (app)                                 Size  First Load JS
┌ ƒ /                                     14.6 kB         158 kB
├ ƒ /_not-found                             175 B         104 kB
├ ƒ /about                                   6 kB         147 kB
├ ƒ /admin                                 504 B         107 kB
├ ƒ /admin/calendar                         175 B         104 kB
├ ƒ /admin/customers                        175 B         104 kB
├ ƒ /admin/finances                        504 B         107 kB
├ ƒ /admin/inquiries                      4.36 kB         145 kB
├ ƒ /admin/login                          4.78 kB         136 kB
├ ƒ /admin/properties                     2.93 kB         143 kB
├ ƒ /admin/properties/[id]/edit             144 B         169 kB
├ ƒ /admin/properties/new                   144 B         169 kB
├ ƒ /admin/reservations                     175 B         104 kB
├ ƒ /admin/settings                         175 B         104 kB
├ ƒ /admin/vehicles                       2.93 kB         143 kB
├ ƒ /admin/vehicles/[id]/edit               144 B         169 kB
├ ƒ /admin/vehicles/new                     144 B         169 kB
├ ƒ /api/admin/… (5 routes)                 175 B         104 kB
├ ƒ /api/auth/login|logout                  175 B         104 kB
├ ƒ /api/inquiries                          175 B         104 kB
├ ƒ /api/media/[file]                       175 B         104 kB
├ ƒ /contact                              2.49 kB         157 kB
├ ƒ /credits                              2.84 kB         138 kB
├ ƒ /map                                  5.02 kB         143 kB
├ ƒ /properties                           4.01 kB         151 kB
├ ƒ /properties/[slug]                    7.52 kB         194 kB
├ ○ /robots.txt                             175 B         104 kB
├ ƒ /services                             5.13 kB         141 kB
├ ○ /sitemap.xml                            175 B         104 kB
├ ƒ /vehicles                             5.55 kB         149 kB
└ ƒ /vehicles/[slug]                      6.27 kB         180 kB

+ First Load JS shared by all                             103 kB
ƒ Middleware                                           34.5 kB
```

**36 entrées de route** (26 pages, dont `robots.txt` et `sitemap.xml` générés,
+ 10 routes API) et le middleware. JS partagé : **103 kB**. Aucune erreur, aucun
avertissement ESLint.

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
npm test              # 131 tests
npm run build         # build de production
npm run dev &         # puis, dans un autre terminal :
npm run smoke -- http://localhost:3000
```

Les tests créent leurs propres bases temporaires : ils n'écrasent jamais
`data/rayane.db`.

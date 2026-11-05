# Audit de sécurité

Périmètre : site public, back-office, API, SQLite, médias et previews isolées.
**Revue finale : 5 novembre 2026.** Méthode : revue de code, tests automatisés,
smoke HTTP et parcours Chromium réels détaillés dans `docs/TESTING_REPORT.md`.
**Aucun test d'intrusion externe n'a été réalisé.**

Légende : **Mis en œuvre** (code + contrôle), **Partiel** (limite connue),
**Absent** (travail restant).

## 1. Authentification et cycle de vie des comptes

| Mesure | État | Détail |
| --- | --- | --- |
| Hachage | **Mis en œuvre** | scrypt N=2¹⁵, r=8, p=1, sel 16 octets, format auto-descriptif, comparaison à temps constant |
| Robustesse | **Mis en œuvre** | 12 caractères minimum, majuscule, minuscule et chiffre ; normalisation Unicode NFKC |
| Énumération | **Mis en œuvre** | Message de connexion générique et vérification scrypt factice pour compte inconnu |
| Force brute | **Mis en œuvre** | 8 essais / 15 min par IP **et** par compte, compteurs persistés ; le budget est resté actif pendant E2E |
| Session | **Mis en œuvre** | Jeton 256 bits, seulement `sha256(jeton + "." + SESSION_SECRET)` en base ; expiration absolue 8 h |
| Révocation | **Mis en œuvre** | Logout, désactivation, reset et changements administrateur suppriment les sessions concernées |
| Rôles | **Mis en œuvre** | `editor < manager < owner`, contrôlé dans chaque handler ; suppression d'annonces manager+ ; gestion des comptes owner uniquement |
| Dernier owner | **Mis en œuvre** | Refus de rétrograder, désactiver ou supprimer le dernier propriétaire actif ; pas d'auto-suppression owner |
| Premier mot de passe | **Mis en œuvre** | Changement forcé avant API admin ; le compte Arena de remise a été contrôlé dans Chromium puis ses sessions de test révoquées |
| Reset en libre-service | **Mis en œuvre** | Jeton aléatoire à usage unique, seulement son empreinte keyed-hash en base, expiration 30 min, révocation des sessions après consommation |
| Email | **Partiel** | Adaptateur Resend testé avec fetch simulé ; aucune livraison réelle configurée ou revendiquée |
| 2FA | **Absent** | À ajouter avant une exposition multi-administrateurs sensible |

La réinitialisation ne révèle pas si un compte existe. Les notifications de
demandes/réservations ne partent que vers les comptes actifs ayant opté in ;
les nouveaux comptes ont les deux catégories à 0 et doivent les activer
explicitement (renseigner un email ne suffit pas). Un échec du fournisseur ne
supprime pas la demande métier déjà créée.

## 2. Autorisation et mutations

- Chaque `/api/admin/*` refait l'authentification en base et contrôle le rôle ;
  le middleware de cookie n'est qu'une commodité UX, jamais l'autorité.
- Les mutations exigent le double cookie/en-tête CSRF `ra_csrf` / `x-ra-csrf`.
- `ra_session` est `HttpOnly`, `SameSite=Lax`, `Path=/` et `Secure` en production.
- Les routes d'authentification vérifient aussi l'origine ; aucune mutation GET.
- Les identifiants de médias et d'entités sont validés ; un upload doit cibler une
  annonce ou un lieu existant. Il n'y a pas de modèle de propriété par utilisateur :
  tout rôle habilité peut modifier le catalogue commun.
- La suppression complète d'un bien/véhicule nettoie aussi ses réservations,
  demandes liées et médias ; la suppression média retire ligne et fichier.

## 3. Validation, injection et sortie

| Menace | État | Mesure |
| --- | --- | --- |
| SQL | **Mis en œuvre** | Requêtes préparées et paramètres liés ; tris/filtres par listes blanches |
| XSS stocké/réfléchi | **Mis en œuvre** | Rendu React échappé, aucun HTML utilisateur brut ; CSP nonce + `strict-dynamic` en production |
| Corps abusifs | **Mis en œuvre** | Zod borne champs, tailles, dates, énumérations et coordonnées ; JSON invalide → 400 |
| Traversée de répertoire | **Mis en œuvre** | Noms média `UUID.(jpg|png|webp|avif)` strictement validés |
| Secrets navigateur | **Mis en œuvre** | Modules serveur gardés ; aucune clé Resend, session ou mot de passe exposé |
| Géocodeur | **Mis en œuvre** | Appel serveur authentifié, timeout, réponse JSON/coordonnées validées, quota et erreurs génériques |

Les résultats Nominatim restent **approximatifs et non vérifiés** et ne sont pas
persistés automatiquement. Les projections publiques de biens ne divulguent pas
de coordonnées non vérifiées ; un itinéraire exact exige une vérification explicite.

## 4. Upload et confidentialité des images

- Magic bytes JPEG/PNG/WebP/AVIF, 5 Mo/fichier, 8 fichiers/requête, 40 uploads /
  10 min / IP ; SVG/HTML/PHP déguisés refusés.
- UUID serveur, crédit, licence et textes alternatifs FR/AR obligatoires.
- JPEG : EXIF/XMP/IPTC/commentaires retirés avant écriture ; PNG : liste blanche
  de chunks ; WebP : EXIF/XMP retirés et structure RIFF/VP8X mise à jour.
- AVIF avec EXIF/XMP : refus 415 fermé plutôt que stockage d'un original sensible.
- Réordonnancement transactionnel de l'ensemble des médias et nettoyage des
  orphelins réservé manager+.

**Limite :** l'orientation EXIF est supprimée sans rotation des pixels. Les photos
doivent arriver correctement orientées. Aucun antivirus n'est intégré.

## 5. En-têtes HTTP

Contrôlés sur le serveur de production local : CSP `default-src 'self'`, scripts
nonce + `strict-dynamic`, `object-src 'none'`, `base-uri 'self'`,
`form-action 'self'`, `frame-ancestors` limité à l'application, Arena et Vercel,
HSTS en production, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
COOP `same-origin` et Permissions Policy restrictive.

`img-src` est limité à soi, data/blob, tuiles OSM et deux CDN d'images explicitement
autorisés. Les liens sortants utilisent `noopener noreferrer`.

## 6. Secrets, données et previews

- `.env*`, `.preview-env`, `PREVIEW_ACCESS.txt`, bases, WAL/SHM, uploads et
  artefacts Playwright sont ignorés ; la vérification du staging exclut ces fichiers.
- `SESSION_SECRET` ≥32 caractères obligatoire en production. Les secrets Resend
  restent serveur uniquement.
- Aucun secret GitHub/Vercel n'est écrit dans le dépôt. Les identifiants de remise
  sont dans le fichier local ignoré `PREVIEW_ACCESS.txt`, mode 600.
- Le bootstrap Vercel exige **à la fois** `VERCEL_ENV=preview` et
  `PREVIEW_EPHEMERAL=1`, échoue sur une base contenant des données métier et ne
  crée aucune annonce/client. Les comptes synthétiques ont un changement forcé.
- `APP_ENV=preview` affiche un bandeau et refuse toute indexation. Les contacts
  synthétiques sont vides ; l'année de création non confirmée n'est plus publiée.
- Arena conserve la base et les uploads dans la session mais son URL externe
  exige le jeton de trafic E2B. Vercel `/tmp` est éphémère et non fiablement
  partagé : aucune persistance production n'est revendiquée.

## 7. Journalisation et disponibilité

Le journal `audit_log` conserve acteur, action, cible, date et détails JSON sans
contenu de demande ni mot de passe. Les identifiants de limitation sont hachés ;
les IP ne sont pas stockées en clair. Les erreurs 500 restent génériques côté
client. Il n'y a pas encore d'alerting, sauvegarde automatique ou supervision de
production.

## 8. Dépendances

Résultats finaux après installation fraîche :

```text
npm audit --audit-level=low             → 0 vulnerability
npm audit --omit=dev --audit-level=low  → 0 vulnerability
npm run audit:gate                      → 0 exception, 0 blocking advisory
```

PostCSS est fixé à 8.5.32 directement et sous Next via l'override `$postcss`.
Une override ciblée place minimatch 11.0.3 dans le parseur TypeScript-ESLint.
L'ancienne exception PostCSS a été supprimée : elle n'est plus nécessaire et ne
doit pas être présentée comme un correctif. Next reste en 15.5.28 ; aucune
migration majeure n'a été nécessaire pour obtenir ce résultat.

## 9. Risques résiduels et actions avant production

| Risque | Niveau | Action requise |
| --- | --- | --- |
| Pas de 2FA | Moyen | Ajouter avant comptes administrateurs multiples sensibles |
| SQLite + uploads sur un seul disque | Moyen | VPS à volume persistant, sauvegarde/restauration testée ; ou PostgreSQL + objet |
| Vercel `/tmp` éphémère/non partagé | Bloquant production | Ne pas y stocker de données client ; migrer le stockage |
| Email réel non configuré | Moyen fonctionnel | Vérifier domaine Resend, secrets et livraison avant d'annoncer les resets |
| Tuiles/géocodage externes | Moyen disponibilité | Respecter les politiques OSM, configurer un service adapté et tester depuis l'hôte réel |
| Orientation pixels EXIF | Faible | Réorienter avant upload ou ajouter un décodeur validé |
| Pas de pentest/axe-core/charge | — | Planifier avant lancement public |
| Pas de sauvegarde automatisée | Élevé exploitation | Mettre en place et tester une restauration avant données réelles |

Aucun résultat de ce rapport ne doit être interprété comme une certification de
sécurité. C'est une revue de l'état du code et des contrôles effectivement joués.

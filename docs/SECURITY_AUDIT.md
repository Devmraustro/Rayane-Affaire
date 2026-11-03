# Audit de sécurité

Périmètre : application RAYANE AFFAIRE (site public, back-office, API, base).
Date de l'audit : novembre 2026. Auteur : équipe de développement.
Méthode : revue de code ligne à ligne, tests automatisés (voir
`docs/TESTING_REPORT.md`), requêtes HTTP manuelles contre le serveur de
développement. **Aucun test d'intrusion externe n'a été réalisé** — voir §9.

Légende : **Mis en œuvre** (code + test), **Partiel** (présent, limite connue),
**Absent** (à faire, listé dans `docs/OPENCODE_HANDOFF.md`).

---

## 1. Authentification

| Mesure | État | Détail |
| --- | --- | --- |
| Hachage des mots de passe | **Mis en œuvre** | scrypt, N=2¹⁵, r=8, p=1, sel aléatoire de 16 octets, format auto-descriptif `scrypt$N$r$p$sel$hash`. Comparaison à temps constant. |
| Politique de robustesse | **Mis en œuvre** | 12 caractères minimum, minuscule + majuscule + chiffre ; refus des mots de passe trop simples (`validatePasswordStrength`). |
| Normalisation Unicode | **Mis en œuvre** | NFKC avant hachage : un même mot de passe saisi en NFC ou NFD s'authentifie (test dédié). |
| Absence d'énumération de comptes | **Mis en œuvre** | Message unique `INVALID_CREDENTIALS`, et vérification factice (scrypt sur un hash bidon) quand l'e-mail est inconnu, pour égaliser le temps de réponse. |
| Force brute | **Mis en œuvre** | Limitation par IP (8 essais / 15 min) **et** par compte (même fenêtre), compteurs persistés en base. |
| Session fixe / vol de session | **Mis en œuvre** | Jeton de 256 bits, jamais réutilisé ; ligne `admin_sessions` créée à chaque connexion. |
| Déconnexion | **Mis en œuvre** | Suppression de la ligne en base (un cookie copié cesse immédiatement de fonctionner). |
| Expiration | **Mis en œuvre** | 8 h absolues, purge des lignes expirées à la connexion. |
| Comptes désactivés | **Mis en œuvre** | `active = 0` ⇒ session refusée au prochain appel (test dédié). |
| 2FA | **Absent** | Non implémenté. Recommandé si plusieurs administrateurs. |
| Réinitialisation de mot de passe | **Absent** | Aucun envoi de courriel configuré. Procédure actuelle : régénération via `npm run db:seed:admin`. |

**Stockage de session.** La base contient
`sha256(jeton + "." + SESSION_SECRET)`, jamais le jeton. Une copie de la base ne
permet donc pas de rejouer une session sans le secret serveur.

---

## 2. Autorisation

| Mesure | État | Détail |
| --- | --- | --- |
| Autorisation côté serveur | **Mis en œuvre** | Chaque route `/api/admin/*` appelle `requireAdmin(minRole, credentials)`. L'interface n'est jamais l'autorité. |
| Hiérarchie de rôles | **Mis en œuvre** | `editor` (1) < `manager` (2) < `owner` (3). Écritures d'annonces : `editor` ; suppressions : `manager`. |
| Vérification du compte à chaque requête | **Mis en œuvre** | `app/admin/layout.tsx` et chaque handler résolvent la session **en base** (pas seulement la présence d'un cookie). |
| Contournement du middleware | **Atténué** | Le middleware ne fait qu'un contrôle de présence de cookie (redirection UX). Toute l'autorisation réelle est refaite côté serveur : supprimer le cookie ne donne aucun accès. |
| Vérification d'association des médias | **Mis en œuvre** | `entityId` est validé syntaxiquement (UUID) **et** l'annonce cible doit exister (`404` sinon), ce qui empêche d'utiliser le téléversement comme stockage de fichiers orphelins. **Ce n'est pas un contrôle de propriété par utilisateur** : il n'existe aucun modèle de propriété (aucune annonce n'appartient à un compte), et tout administrateur habilité peut attacher un média à n'importe quelle annonce. Un modèle de propriété par utilisateur serait une évolution distincte, non implémentée. |

---

## 3. CSRF et protection des requêtes

| Mesure | État | Détail |
| --- | --- | --- |
| Double soumission | **Mis en œuvre** | Jeton par session, cookie `ra_csrf` (lisible) + en-tête `x-ra-csrf` exigé sur toute mutation. Comparaison à temps constant. |
| Cookies | **Mis en œuvre** | `ra_session` : `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` en production. |
| Vérification d'origine | **Mis en œuvre** | `isSameOrigin` compare `Origin` et `Host` sur les routes d'authentification ; les mutations sont de toute façon protégées par le jeton CSRF. |
| Méthodes sûres | **Mis en œuvre** | Aucune mutation via `GET` ; les lectures publiques sont des Server Components. |

---

## 4. Validation et injection

| Menace | État | Mesure |
| --- | --- | --- |
| Injection SQL | **Mis en œuvre** | 100 % de requêtes préparées avec paramètres liés (`db.prepare(...).run/get/all`). Aucune concaténation de valeur utilisateur dans du SQL. Les tris/filtres passent par des listes blanches (`lib/filters.ts`). |
| XSS stocké | **Mis en œuvre** | Rendu React (échappement automatique) ; aucun `dangerouslySetInnerHTML`. Les textes saisis restent des données, même s'ils contiennent `<script>` (test dédié). |
| XSS réfléchi | **Mis en œuvre** | Aucune injection de paramètre d'URL dans du HTML ; CSP à nonce + `strict-dynamic` en production. |
| Injection d'en-têtes / de logs | **Mis en œuvre** | Les caractères de contrôle sont retirés des valeurs (`sanitiseText`). |
| Charge utile abusive | **Mis en œuvre** | Zod borne chaque champ (longueurs, énumérations, plages numériques) ; corps JSON illisible ⇒ `400`. |
| Traversée de répertoire | **Mis en œuvre** | La route média n'accepte qu'un nom `UUID.(jpg|png|webp|avif)` par expression régulière stricte ; la suppression n'opère que sur des URL conformes au schéma généré. |
| Pollution de prototype | **Mis en œuvre** | Aucune fusion d'objet utilisateur ; Zod ne renvoie que les clés déclarées. |

---

## 5. Téléversement de fichiers

| Mesure | État | Détail |
| --- | --- | --- |
| Type réel | **Mis en œuvre** | Détection par **magic bytes** (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF…WEBP`, AVIF `ftypavif`). Le `Content-Type` déclaré est ignoré. |
| Retypage malveillant | **Mis en œuvre** | Un SVG/HTML/PHP renommé `.png` est rejeté (test dédié). |
| Taille | **Mis en œuvre** | 5 Mo par fichier (lecture bornée avant écriture), 8 fichiers par requête. |
| Nommage | **Mis en œuvre** | UUID v4 généré côté serveur ; aucune donnée utilisateur dans le chemin. |
| Exposition | **Mis en œuvre** | Servi avec `X-Content-Type-Options: nosniff` et `Content-Type` issu d'une liste blanche ; SVG interdit (pas de script embarqué possible). |
| Quota | **Mis en œuvre** | 40 envois / 10 min / IP. |
| Attribution obligatoire | **Mis en œuvre** | Le serveur exige un crédit, une licence et un texte alternatif bilingue (`422` avec codes i18n). Une photographie sans droits documentés ne peut pas être enregistrée, ce qui répond à l'interdiction explicite de publier des images non attribuées. |
| Analyse antivirus | **Absent** | Aucune analyse de contenu. Recommandé si des tiers déposent des fichiers. |
| Ré-encodage des images | **Absent** | Pas de retrait des métadonnées EXIF. À prévoir (confidentialité : coordonnées GPS dans les photos client). |

---

## 6. En-têtes et configuration HTTP

| En-tête | Valeur | État |
| --- | --- | --- |
| `Content-Security-Policy` | `default-src 'self'` ; `script-src 'self' 'nonce-…' 'strict-dynamic'` (prod) ; `object-src 'none'` ; `base-uri 'self'` ; `form-action 'self'` ; `frame-ancestors` limité | **Mis en œuvre** |
| `Strict-Transport-Security` | Production uniquement | **Mis en œuvre** (vérifié en développement côté condition) |
| `X-Content-Type-Options` | `nosniff` | **Mis en œuvre** |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | **Mis en œuvre** |
| `Permissions-Policy` | `camera=(), microphone=(), payment=(), usb=(), geolocation=(self)` | **Mis en œuvre** |
| `X-Frame-Options` | Remplacé par `frame-ancestors` (norme actuelle) | **Mis en œuvre** |
| Clics sortants | `rel="noopener noreferrer"` sur les liens externes | **Mis en œuvre** |

Bandeau CSP : `img-src` autorise uniquement `'self'`, `data:`, `blob:`, les tuiles
OSM et deux CDN d'images sous licence. Aucun script tiers n'est autorisé.

---

## 7. Gestion des secrets

| Mesure | État | Détail |
| --- | --- | --- |
| Aucun secret versionné | **Mis en œuvre** | `.env`, `.env.local`, `data/*.db` et `data/uploads/` sont dans `.gitignore` ; `.env.example` ne contient que des clés vides. |
| Secret obligatoire en production | **Mis en œuvre** | `lib/server/env.ts` lève une erreur au démarrage si `SESSION_SECRET` est absent ou < 32 caractères en `NODE_ENV=production`. |
| Valeur de développement | **Documentée** | Repli explicite et avertissement console ; jamais utilisable en production. |
| Fuite vers le navigateur | **Mis en œuvre** | Seules les variables `NEXT_PUBLIC_*` atteignent le client ; `lib/server/guard.ts` fait échouer le build si un module serveur est importé par un composant client. |
| Mots de passe par défaut | **Aucun** | Pas de compte `admin/admin` : le premier administrateur est créé par un script qui exige un mot de passe ou en génère un aléatoire. |

---

## 8. Journalisation et supervision

| Mesure | État | Détail |
| --- | --- | --- |
| Journal d'audit | **Mis en œuvre** | `audit_log` : acteur, action, cible, horodatage, détails JSON ; visible dans `/admin/settings`. |
| Données personnelles dans les journaux | **Atténué** | Les IP ne sont jamais stockées en clair (`ip_hash` FNV-1a) ; aucun contenu de demande n'est journalisé. |
| Erreurs 500 | **Mis en œuvre** | Message générique au client, détail côté serveur uniquement. |
| Détection d'intrusion / alerting | **Absent** | Aucune alerte automatique. |

---

## 9. Risques résiduels connus

| Risque | Gravité | Statut |
| --- | --- | --- |
| Pas de 2FA pour les comptes administrateurs | Moyenne | Accepté tant qu'il y a un seul utilisateur ; à traiter avant multi-utilisateurs. |
| Pas de réinitialisation de mot de passe en libre-service | Faible | Procédure manuelle documentée. |
| Métadonnées EXIF des photos non retirées | Faible | À implémenter avant l'ouverture au public (bloc D du handoff). |
| SQLite : un seul nœud, sauvegarde à organiser | Moyenne (exploitation) | Procédure de sauvegarde documentée dans `DEPLOYMENT_GUIDE.md`. |
| Aucun test d'intrusion externe | — | À planifier avant lancement public. |
| Sauvegarde des uploads non automatisée | Moyenne | À mettre en place en production (bloc C du handoff). |

**Aucun secret, clé privée ou identifiant n'est présent dans le dépôt.** Aucun
mot de passe en clair n'est stocké. Aucune donnée personnelle réelle n'est
présente : la base livrée est vide, hors référentiel géographique public (OSM,
ODbL).

---

## 10. Ce qui a été vérifié par des tests

Exécutés par `npm test` (voir `docs/TESTING_REPORT.md` pour les résultats) :

- hachage scrypt : sel unique, vérification correcte/incorrecte, hash malformé,
  normalisation Unicode, politique de robustesse ;
- jetons de session stockés hachés (le jeton brut n'apparaît jamais en base) ;
- comparaison CSRF à temps constant, refus des valeurs différentes ;
- limitation de débit : autorisation jusqu'au quota, blocage ensuite, isolation
  des compteurs, hachage irréversible des identifiants ;
- téléversement : détection JPEG/PNG/WebP, refus SVG/HTML/PHP, refus de taille,
  refus d'un fichier déguisé, suppression limitée au schéma généré ;
- API : `401` sans session, `401` session expirée, `401` session révoquée, `401`
  jeton forgé, `403` CSRF absent/faux, `403` rôle insuffisant, `403` origine
  différente, `422` validation, `404` identifiant inconnu, `429` limitation ;
- échappement des entrées hostiles (balises conservées comme texte).

# Variables d'environnement

Copier `.env.example` vers `.env.local` (développement) ou définir ces variables
dans l'interface de l'hébergeur (production). `.env.local` est ignoré par Git.

> **Aucune valeur de contact réelle n'est livrée avec le code.** Tant qu'une
> variable `NEXT_PUBLIC_*` de contact est vide, l'interface masque le bloc
> correspondant et affiche une mention « à configurer » (voir
> `components/pages/contact-content.tsx`, `components/layout/site-header.tsx` et `/admin/settings`). C'est
> intentionnel : aucun faux numéro n'est affiché.

---

## 1. Coordonnées professionnelles (publiques)

Ces valeurs sont **visibles par tous les visiteurs** : elles sont intégrées au
HTML rendu. Ne jamais y placer d'information confidentielle.

| Variable | Obligatoire | Format | Effet si vide |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Recommandé | Chiffres uniquement, format international sans `+` ni espace (ex. `213550123456`) | Bouton WhatsApp masqué |
| `NEXT_PUBLIC_PHONE_NUMBER` | Recommandé | Format lisible (ex. `+213 550 12 34 56`) | Lien `tel:` masqué |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Recommandé | Adresse valide | Lien `mailto:` masqué |
| `NEXT_PUBLIC_OFFICE_ADDRESS` | Facultatif | Texte libre | Bloc adresse masqué |
| `NEXT_PUBLIC_FACEBOOK_URL` | Facultatif | URL `https://` | Icône masquée |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Facultatif | URL `https://` | Icône masquée |
| `NEXT_PUBLIC_TIKTOK_URL` | Facultatif | URL `https://` | Icône masquée |

**Statut actuel : toutes vides.** Le client doit fournir ces informations
(bloc B de `docs/OPENCODE_HANDOFF.md`). Le numéro factice `+213 00 00 00 00` du
projet de référence n'apparaît nulle part : un test automatisé le vérifie
(`tests/i18n.test.ts`) et le script `npm run smoke` le contrôle sur le site en
ligne.

## 2. Site

| Variable | Obligatoire | Défaut | Rôle |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | **Oui en production** | `http://localhost:3000` | URL canonique : `sitemap.xml`, `robots.txt`, balises `canonical`, OpenGraph, JSON-LD |
| `NEXT_PUBLIC_HERO_IMAGE` | Facultatif | Visuel de marque | Photographie du héros. Voir §2.1 : une URL externe n'est acceptée que depuis un hôte autorisé par la CSP. |

Sans `NEXT_PUBLIC_SITE_URL` correct, le sitemap et les URL canoniques pointeront
vers `localhost` — le référencement serait cassé.

### 2.1 `NEXT_PUBLIC_HERO_IMAGE` — sources d'image acceptées

La valeur est lue par `components/home/hero.tsx` et remplace le visuel de marque
`/images/fallback/hero.svg`. Deux formes sont acceptées :

| Forme | Exemple | Condition |
| --- | --- | --- |
| Chemin local | `/images/hero-bejaia.jpg` (fichier déposé dans `public/images/`) | **Recommandé.** Aucune configuration CSP à modifier. |
| URL absolue `https://` | `https://upload.wikimedia.org/…` | L'hôte doit figurer dans la directive `img-src` de la CSP (`middleware.ts`). |

La CSP n'autorise aujourd'hui que : `'self'`, `data:`, `blob:`, les tuiles
OpenStreetMap, `images.unsplash.com` et `upload.wikimedia.org`. **Une URL vers
tout autre hôte sera bloquée par le navigateur** (image absente, sans erreur
serveur). Trois options, dans l'ordre de préférence :

1. déposer la photo dans `public/images/` et utiliser un chemin local ;
2. héberger la photo sur le même domaine (chemin local ou URL du site) ;
3. ajouter explicitement l'hôte à `img-src` **et** à `images.remotePatterns`
   dans `next.config.mjs`, en s'assurant que la source est bien sous licence.

Le fichier doit être une photographie dont l'agence détient les droits ;
voir la page `/credits` et `docs/ENVIRONMENT_VARIABLES.md` §1.

## 3. Secrets serveur

| Variable | Obligatoire | Contrainte | Rôle |
| --- | --- | --- | --- |
| `SESSION_SECRET` | **Oui, en production** | ≥ 32 caractères, aléatoire | Clé de hachage des jetons de session (`sha256(jeton + "." + secret)`) |

Génération :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Comportement :

- absent ou trop court **en production** ⇒ l'application refuse de démarrer avec
  un message explicite (`lib/server/env.ts`) ;
- absent **en développement** ⇒ valeur de repli locale + avertissement console.

**Changer `SESSION_SECRET` invalide toutes les sessions existantes** (les
administrateurs doivent se reconnecter). C'est sans effet sur les données.

Cette valeur ne doit **jamais** être commitée, ni placée dans une variable
`NEXT_PUBLIC_*`.

## 4. Stockage

| Variable | Obligatoire | Défaut | Rôle |
| --- | --- | --- | --- |
| `DATABASE_PATH` | Non | `./data/rayane.db` | Fichier SQLite. Le dossier doit exister ou être créable, et être **inscriptible** par le processus. |
| `UPLOAD_DIR` | Non | `./data/uploads` | Dossier des photographies téléversées. À sauvegarder avec la base. |

Sur un hébergeur à système de fichiers éphémère, un chemin local ne constitue
**pas** un stockage durable. Vercel isole en outre les fonctions et ne garantit
pas le partage de `/tmp` : ni SQLite ni les uploads locaux n'y conviennent pour
des données client. Utiliser un disque réellement persistant sur un serveur
unique, ou migrer vers PostgreSQL + stockage objet. Le bootstrap Vercel limité à
`PREVIEW_EPHEMERAL=1` sert uniquement aux contrôles jetables, jamais à la
production. Voir `docs/DEPLOYMENT_GUIDE.md`.

## 5. Scripts de maintenance

Lues uniquement par `npm run db:seed:admin` :

| Variable | Effet |
| --- | --- |
| `ADMIN_EMAIL` | E-mail du compte à créer |
| `ADMIN_PASSWORD` | Mot de passe (doit respecter la politique : 12 caractères, majuscule, minuscule, chiffre). Si absent, un mot de passe aléatoire est généré et affiché **une seule fois**. |
| `ADMIN_NAME` | Nom affiché (défaut : `Administrateur`) |

Ces variables ne doivent pas être stockées dans un fichier `.env` de production
permanent : les passer sur la ligne de commande, puis les oublier.

## 6. E-mail transactionnel

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `EMAIL_DELIVERY` | vide = désactivé | `resend` pour le fournisseur réel ; `console` uniquement hors production |
| `RESEND_API_KEY` | vide | Secret Resend, obligatoire avec `EMAIL_DELIVERY=resend` |
| `EMAIL_FROM` | vide | Expéditeur vérifié, obligatoire avec Resend |
| `EMAIL_REPLY_TO` | vide | Adresse de réponse facultative |

Le backend Resend n'est considéré configuré que si la clé et l'expéditeur sont
présents. Les liens de réinitialisation sont à usage unique, hachés en base et
expirent après 30 minutes. Les notifications de demandes/réservations ne sont
envoyées qu'aux comptes actifs ayant activé la catégorie correspondante. Un échec
d'e-mail ne fait pas échouer la création d'une demande ; il est journalisé côté
serveur. **Aucune livraison réelle n'a été configurée dans la préproduction.**

## 7. Géocodage

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `GEOCODER_BASE_URL` | `https://nominatim.openstreetmap.org/search` | Endpoint compatible Nominatim, appelé côté serveur |
| `GEOCODER_USER_AGENT` | identifiant de préproduction | Identification de l'application ; à personnaliser en production |
| `GEOCODER_EMAIL` | vide | Contact recommandé/requis selon la politique du service |
| `GEOCODER_COUNTRY_CODES` | `dz` | Limite pays de la recherche |

La route `/api/admin/geocode` exige une session, applique une limitation de débit,
valide la réponse et ne persiste rien automatiquement. Tout résultat reste
**approximatif et non vérifié** ; une navigation exacte exige la vérification
explicite d'un point manuel.

## 8. Prévisualisation isolée

| Variable | Valeur | Effet |
| --- | --- | --- |
| `APP_ENV` | `preview` | Bandeau visible et refus d'indexation ; ne pas utiliser en production |
| `VERCEL_ENV` + `PREVIEW_EPHEMERAL` | `preview` + `1` | Autorisent ensemble le bootstrap jetable Vercel |
| `PREVIEW_ADMIN_EMAIL` / `PREVIEW_ADMIN_PASSWORD` | secrets synthétiques | Compte owner temporaire avec changement de mot de passe forcé |
| `PREVIEW_ADMIN_NAME` | facultatif | Nom affiché du compte jetable |

Le bootstrap échoue fermé hors Vercel preview, si `PREVIEW_EPHEMERAL` manque ou
si des annonces, lieux ou clients existent. Il ne crée aucune donnée client et ne
résout pas la persistance. Ne jamais renseigner `PREVIEW_EPHEMERAL=1` sur une
base de production.

## 9. Variables fournies par la plateforme

| Variable | Fournie par | Usage |
| --- | --- | --- |
| `NODE_ENV` | Next.js / hébergeur | `production` active HSTS, cookies `Secure`, CSP à nonce, refus de `db:reset` |
| `PORT` | Hébergeur | Port d'écoute de `next start` |
| `VERCEL_ENV` | Vercel | Avec le garde-fou explicite ci-dessus, identifie une preview jetable |

Il n'y a ni paiement ni carte payante. Les tuiles et le géocodage utilisent par
défaut OpenStreetMap/Nominatim, dont les politiques d'usage et limites doivent
être respectées ; un service dédié peut être configuré pour la production.

## 7. Récapitulatif minimal pour démarrer en production

```dotenv
NEXT_PUBLIC_SITE_URL=https://rayane-affaire.dz
SESSION_SECRET=<48 octets aléatoires encodés>
NEXT_PUBLIC_WHATSAPP_NUMBER=213XXXXXXXXX   # à fournir par le client
NEXT_PUBLIC_PHONE_NUMBER=+213 XX XX XX XX  # à fournir par le client
NEXT_PUBLIC_CONTACT_EMAIL=contact@…        # à fournir par le client
DATABASE_PATH=/var/lib/rayane/rayane.db
UPLOAD_DIR=/var/lib/rayane/uploads
```

## 8. Vérification

```bash
# le secret est-il pris en compte ?
npm run build && NODE_ENV=production npm start
# puis, avec un SESSION_SECRET valide, la connexion admin doit fonctionner ;
# sans lui, le démarrage doit échouer avec un message explicite.
```

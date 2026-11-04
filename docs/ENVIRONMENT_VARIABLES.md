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

Sur un hébergeur à système de fichiers éphémère (Vercel, par exemple), ces deux
chemins doivent pointer vers un volume persistant — sinon **toutes les données
sont perdues au redéploiement**. Voir `docs/DEPLOYMENT_GUIDE.md` §2.

## 5. Scripts de maintenance

Lues uniquement par `npm run db:seed:admin` :

| Variable | Effet |
| --- | --- |
| `ADMIN_EMAIL` | E-mail du compte à créer |
| `ADMIN_PASSWORD` | Mot de passe (doit respecter la politique : 12 caractères, majuscule, minuscule, chiffre). Si absent, un mot de passe aléatoire est généré et affiché **une seule fois**. |
| `ADMIN_NAME` | Nom affiché (défaut : `Administrateur`) |

Ces variables ne doivent pas être stockées dans un fichier `.env` de production
permanent : les passer sur la ligne de commande, puis les oublier.

## 6. Variables fournies par la plateforme

| Variable | Fournie par | Usage |
| --- | --- | --- |
| `NODE_ENV` | Next.js / hébergeur | `production` active HSTS, cookies `Secure`, CSP à nonce, refus de `db:reset` |
| `PORT` | Hébergeur | Port d'écoute de `next start` |

L'application n'utilise **aucune** autre variable et **aucune** clé d'API tierce :
pas de service de paiement, pas de service de carte payant (tuiles
OpenStreetMap), pas de service d'e-mail (à ajouter si les notifications sont
souhaitées).

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

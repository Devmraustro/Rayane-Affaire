# Préproduction isolée

Deux environnements de revue sont distincts de la production. Aucun ne contient de
données client. Les mots de passe sont générés localement et ne sont jamais commités.

## 1. Preview Arena persistante

- URL de la session courante (`arena/3f977b0a-rayane-affaire`) : `https://3000-iay8pn3tiqnl3rqlpl15v.e2b.app`
- Application : build Next.js de production (`APP_ENV=preview`), port `3000`, écoute `0.0.0.0`.
- Base : `data/preview.db` ; uploads : `data/preview-uploads/`.
- Contenu : 6 biens et 3 véhicules `is_demo=1`, sans coordonnées de biens ; les
  véhicules restent masqués publiquement par défaut. Les tests navigateur créent
  puis suppriment leurs propres biens/lieux/comptes avec images PNG générées.
- Variables et identifiants : `.preview-env` et `PREVIEW_ACCESS.txt`, tous deux
  ignorés par Git et créés avec des droits locaux restrictifs (`0600`).

Le compte owner utilisé par l'automatisation est réinitialisé après les contrôles
avec un mot de passe à usage initial, `must_change_password=1`, `notify_new_inquiry=0`,
`notify_reservation=0` et zéro session active. Le client doit choisir son propre
mot de passe à la première connexion.

**Accès :** l'infrastructure E2B de cette session exige un jeton d'accès au trafic
(`e2b-traffic-access-token`). L'URL fonctionne dans le composant Live Preview
authentifié d'Arena, mais une requête externe non authentifiée répond `403 Missing
traffic access token`. Elle n'est donc pas présentée comme une URL publique autonome.

Commandes de reconstruction locales (à exécuter avec les variables du fichier ignoré) :

```bash
npm run db:migrate
npm run db:seed:admin
npm run db:seed:demo
APP_ENV=preview npm run build
npm start -- --hostname 0.0.0.0 --port 3000
```

Ne jamais utiliser `data/rayane.db` ou des données client pour cette procédure.

## 2. Preview Vercel jetable (`rayane-affaire-preview`)

Le projet Vercel `rayane-affaire-preview` (`prj_Wh0IP89d5muyxMFopgNBMB1aagdS`,
équipe `team_iubQ9zIhIVUMqAj1vvq59Dk9`) est séparé de toute production. Son
bootstrap n'est actif que si `VERCEL_ENV=preview` **et** `PREVIEW_EPHEMERAL=1`.
Il crée les communes, les réglages vides de contacts et des comptes synthétiques
avec changement de mot de passe obligatoire (`must_change_password=1`) et
notifications désactivées (`0`) ; il ne crée aucune annonce, aucun lieu et aucun client.

`APP_ENV=preview` ajoute un bandeau visible et fait répondre `Disallow: /` à
`robots.txt`.

**État vérifié au 5 novembre 2026 :**

1. Les 9 variables d'environnement requises (`APP_ENV`, `PREVIEW_EPHEMERAL`,
   `DATABASE_PATH`, `UPLOAD_DIR`, `PREVIEW_ADMIN_NAME`, `GEOCODER_USER_AGENT`, et
   les secrets chiffrés `sensitive` `SESSION_SECRET`, `PREVIEW_ADMIN_EMAIL`,
   `PREVIEW_ADMIN_PASSWORD`) sont désormais configurées sur
   `prj_Wh0IP89d5muyxMFopgNBMB1aagdS` uniquement pour la cible `preview` (aucune
   variable `production`).
2. **Aucun déploiement actif n'est publié (`deployments: []`)** en raison de deux
   blocages côté projet Vercel non modifiables via le connecteur API actuel :
   - **Dépôt Git non lié (`link` absent, `gitProviderOptions.createDeployments = "disabled"`)** :
     sans `productionBranch` (`main`) reliée au projet, l'API Vercel
     `POST /v13/deployments` promeut tout déploiement `gitSource` en
     `target: "production"` (`environment: "production"`), même lorsque `target`
     est omis ou vaut `"staging"`. Les deux tentatives initiales ont été annulées
     pendant `INITIALIZING` puis supprimées afin de respecter strictement
     l'interdiction de déployer en production.
   - **Vercel Authentication active (`ssoProtection.deploymentType = "all_except_custom_domains"`)** :
     toute URL de preview `*.vercel.app` renvoie `401` (SSO Vercel) à un navigateur
     client non connecté à l'équipe Vercel tant que l'owner ne désactive pas
     **Vercel Authentication** dans **Project Settings → Deployment Protection** sur
     ce projet synthétique.

**Action minimale propriétaire (Vercel Dashboard, ~2 minutes) :**

1. Ouvrir `rayane-affaire-preview` → **Settings → Git**, lier
   `Devmraustro/Rayane-Affaire` avec **Production Branch = `main`** (sans déployer `main`).
2. Ouvrir **Settings → Deployment Protection** et désactiver **Vercel Authentication**
   uniquement sur ce projet de préproduction synthétique.
3. Déclencher un déploiement **Preview** depuis la branche
   `arena/3f977b0a-rayane-affaire` : Vercel injectera `VERCEL_ENV=preview` et les
   9 variables déjà enregistrées sans toucher à la production.

**SQLite et `/tmp` sur Vercel sont éphémères et non fiablement partagés entre les
fonctions.** Cette cible permet seulement des smoke checks et des contrôles
techniques limités. Pour une preview client publique **et** persistante (CRUD,
médias, réservations), déployer le conteneur Node 22 sur **Railway avec volume
persistant** (`/data`) ou sur un **VPS** (`docs/DEPLOYMENT_GUIDE.md` §§3–4).

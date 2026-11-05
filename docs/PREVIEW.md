# Préproduction isolée

Deux environnements de revue sont distincts de la production. Aucun ne contient de
données client. Les mots de passe sont générés localement et ne sont jamais commités.

## 1. Preview Arena persistante

- URL de la session : `https://3000-imfyajv2gktw72glqhpu5.e2b.app`
- Application : build Next.js de production, port `3000`, écoute `0.0.0.0`.
- Base : `data/preview.db` ; uploads : `data/preview-uploads/`.
- Contenu : 6 biens et 3 véhicules `is_demo=1`, sans coordonnées de biens ; les
  véhicules restent masqués publiquement par défaut. Les tests navigateur créent
  puis suppriment leurs propres biens/lieux/comptes avec images PNG générées.
- Variables et identifiants : `.preview-env` et `PREVIEW_ACCESS.txt`, tous deux
  ignorés par Git et créés avec des droits locaux restrictifs.

Le compte owner utilisé par l'automatisation est réinitialisé après les contrôles
avec un mot de passe à usage initial et `must_change_password=1`. Le client doit
choisir son propre mot de passe à la première connexion.

**Accès :** l'infrastructure E2B de cette session exige un jeton d'accès au trafic.
L'URL fonctionne dans le composant Live Preview authentifié d'Arena, mais une
requête externe sans jeton répond 403. Elle n'est donc pas présentée comme une URL
publique autonome. Cette restriction appartient à l'infrastructure, pas à l'application.

Commandes de reconstruction locales (à exécuter avec les variables du fichier ignoré) :

```bash
npm run db:migrate
npm run db:seed:admin
npm run db:seed:demo
APP_ENV=preview npm run build
npm start -- --hostname 0.0.0.0 --port 3000
```

Ne jamais utiliser `data/rayane.db` ou des données client pour cette procédure.

## 2. Preview Vercel jetable

Le projet Vercel `rayane-affaire-preview` est séparé. Son bootstrap n'est actif que
si `VERCEL_ENV=preview` **et** `PREVIEW_EPHEMERAL=1`. Il crée les communes, les
réglages vides de contacts et des comptes synthétiques avec changement de mot de
passe obligatoire ; il ne crée aucune annonce, aucun lieu et aucun client.

`APP_ENV=preview` ajoute un bandeau visible et fait répondre `Disallow: /` à
`robots.txt`. Les secrets et mots de passe initiaux sont des variables chiffrées
Vercel, jamais des valeurs Git.

**SQLite et `/tmp` sur Vercel sont éphémères et non fiablement partagés entre les
fonctions.** Cette cible permet seulement des smoke checks et des contrôles
techniques limités. Elle ne garantit pas la conservation d'un CRUD entre requêtes,
instances ou déploiements. Elle ne doit jamais recevoir de données client et ne
constitue pas une solution d'hébergement de production.

L'URL, le statut d'accès public et les contrôles réellement réussis sont consignés
dans `docs/FINAL_REPORT.md`. Si Vercel Authentication est active, une requête
externe non authentifiée ne doit pas être déclarée publique.

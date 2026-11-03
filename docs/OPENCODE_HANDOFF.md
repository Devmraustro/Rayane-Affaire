# Handoff — travail restant

Ce document ne liste **que ce qui reste à faire**. Tout ce qui est décrit comme
livré ailleurs (`README.md`, `docs/IMPLEMENTATION_REPORT.md`,
`docs/TESTING_REPORT.md`) est terminé et vérifié : ne pas le refaire.

Les tâches sont classées selon **ce qui les débloque**. Une tâche ne peut pas
passer dans une catégorie inférieure sans que le blocage soit levé.

Dernière mise à jour : 3 novembre 2026.

---

## Bloc A — Faisable dès maintenant dans le dépôt

Aucune information externe requise. Peut être traité sans le client.

### A1. Tests de bout en bout dans un navigateur (E2E)

- Installer Playwright dans un environnement disposant d'un navigateur
  (`npx playwright install chromium` échoue dans l'environnement de développement
  actuel).
- Couvrir : bascule FR→AR et direction RTL, parcours de contact public, connexion
  admin, création d'annonce avec upload, publication, affichage sur la carte,
  absence de débordement horizontal (mobile 360 px, tablette, bureau).
- Aucun test E2E n'existe à ce jour ; ne pas prétendre le contraire.

### A2. Durcissement média (partiellement fait)

Déjà en place : contrôle d'existence de l'annonce avant insertion (404 sinon) —
il s'agit bien d'une **vérification d'existence, pas d'un contrôle de propriété
par utilisateur** (aucune notion de propriétaire n'existe dans le modèle) —,
crédit/licence obligatoires côté serveur **et** côté interface, texte alternatif
bilingue obligatoire, magie-bytes, quota, nommage UUID.

Reste à faire :

- Retirer les métadonnées EXIF des images importées (une photo de client peut
  contenir les coordonnées GPS du domicile) et forcer la réorientation.
- Réordonnancement des photos par glisser-déposer (l'ordre existe en base).

### A3. Interface de gestion des utilisateurs

Le modèle (`admin_users`, rôles `owner/manager/editor`) et la matrice
d'autorisation sont en place, mais **il n'existe aucune page** pour créer,
désactiver ou changer le rôle d'un compte. À construire dans
`app/admin/users/` + `app/api/admin/users/*` :
- liste des comptes (owner uniquement) ;
- création (mot de passe généré affiché une fois, jamais envoyé par courriel) ;
- désactivation (révoque immédiatement les sessions) ;
- changement de rôle, avec interdiction de se retirer soi-même le rôle `owner`.

### A4. Détails d'ergonomie du back-office

- Réservation : aucune interface de création (le modèle et les lectures
  existent, l'écriture n'est pas exposée).
- Calendrier : vue mensuelle seulement ; ajouter une vue liste par semaine.
- Médias : pas de réordonnancement par glisser-déposer (l'ordre est géré en base
  mais l'interface ne l'expose pas).

### A5. Couverture de tests à compléter

Déjà couvert : le réglage de location de véhicules
(`tests/vehicle-rental-setting.test.ts`, 35 tests — politique par `deal_type`,
projection de `both` en vente, navigation, sitemap, statistiques, surfaces de
location masquées) et l'endpoint `PATCH /api/admin/settings` (9 tests dans
`tests/api.test.ts`), soit **175 tests au total**.

- Tests de `lib/db/inquiries`, `reservations`, `customers` (création, mises à
  jour, filtres de période).
- Test de la route `DELETE /api/admin/media` (suppression du fichier).
- Test des composants de formulaire (rendu et soumission) si un environnement
  DOM est ajouté à Vitest.

### A6. Accessibilité

- Audit axe-core automatisé (à ajouter au pipeline une fois A1 en place).
- Vérifier le piège de focus des modales Radix et l'ordre de tabulation en RTL.

### A7. Nettoyage de configuration

- `next.config.mjs` : `serverExternalPackages: []` est vide et inutile ;
  supprimer ou documenter.
- `NEXT_PUBLIC_HERO_IMAGE` est bien consommé par `components/home/hero.tsx`
  (vérifié) ; vérifier seulement qu'il est documenté dans le guide de déploiement.

---

## Bloc B — Nécessite des informations du client

Sans ces éléments, aucune donnée métier crédible ne peut être publiée.
**Ne jamais inventer de valeur de remplacement.**

### B1. Coordonnées professionnelles

À obtenir et à placer dans les variables `NEXT_PUBLIC_*`
(voir `docs/ENVIRONMENT_VARIABLES.md`) :

- numéro WhatsApp (format international sans `+`, ex. `213XXXXXXXXX`) ;
- numéro de téléphone affiché ;
- adresse e-mail de contact ;
- adresse postale du bureau (facultative) ;
- réseaux sociaux (facultatifs) ;
- horaires d'ouverture réels (aujourd'hui génériques dans les dictionnaires :
  `contact.hoursValue` — **à confirmer**, ce n'est pas une donnée inventée mais
  une formulation par défaut).

### B2. Inventaire réel

Pour chaque bien : titre FR et AR, catégorie, transaction, prix et unité,
commune, quartier, surface, chambres, salles de bain, ameublement, équipements,
disponibilité, **coordonnées GPS avec niveau de précision** (`exact`,
`approximate` ou `commune` — `pending` si inconnues), photos.

Pour chaque véhicule : marque, modèle, année, catégorie, carburant, boîte,
places, tarif journalier et/ou prix de vente, commune, kilométrage, photos.

**Ne jamais saisir une coordonnée « au centre de la commune » pour faire
apparaître un marqueur.** Si la position est inconnue, choisir `pending`.

### B3. Photographies

- Photos fournies par le client (droits à confirmer par écrit), **ou** photos sous
  licence libre avec auteur et licence exacts.
- Pour chaque photo : texte alternatif FR et AR, crédit, licence, éventuelle URL
  de source.

### B4. Identité et contenus éditoriaux

- Confirmer le nom exact, le logo et la charte (aujourd'hui : nom « RAYANE
  AFFAIRE », palette or/sable/encre).
- Valider les textes de présentation (`/about`), la liste des services et leurs
  descriptions.
- Confirmer l'année de création de l'agence et toute mention légale (RC, NIF)
  destinée au pied de page.
- Valider les horaires, les langues affichées et la politique de confidentialité.

### B5. Périmètre géographique

- Confirmer que la zone couverte est bien Béjaïa et ses environs, et **quelles
  communes** doivent figurer dans le référentiel (11 sur 53 sont présentes).
- Fournir les centroïdes OSM des communes manquantes (même méthode que
  `db/communes.ts` : relation OpenStreetMap, jamais une estimation).

### B6. Référence visuelle

- **Les quatre captures d'écran annoncées comme référence n'ont jamais été
  transmises.** Les fournir si une parité visuelle précise avec le projet de
  référence est attendue. En leur absence, l'interface suit une identité propre :
  aucune conformité pixel à pixel ne peut être revendiquée.

---

## Bloc C — Nécessite un accès à l'environnement de production

### C1. Hébergement et domaine

- Choisir un hébergeur **à disque persistant** (voir `docs/DEPLOYMENT_GUIDE.md`
  §1 : Vercel/Netlify ne conviennent pas sans migration PostgreSQL + stockage
  objet).
- Réserver le nom de domaine, configurer le DNS, obtenir le certificat TLS.

### C2. Déploiement et secrets

- Générer un `SESSION_SECRET` de 48 octets **différent** de celui de
  développement.
- Renseigner `NEXT_PUBLIC_SITE_URL` avec l'URL HTTPS définitive **avant** le
  build (ces variables sont figées à la compilation).
- Créer le compte propriétaire en production avec un mot de passe fort.
- Exécuter `npm run smoke -- https://<domaine>` et consigner le résultat.

### C3. Sauvegardes et supervision

- Mettre en place la sauvegarde quotidienne (base + uploads) et **tester une
  restauration** avant l'ouverture au public.
- Brancher une supervision HTTP et une alerte sur l'espace disque.
- Configurer la rotation des journaux.

### C4. Envoi de notifications

Aucun service d'e-mail n'est configuré : une nouvelle demande reste silencieuse
jusqu'à ce qu'un administrateur ouvre `/admin/inquiries`. Choisir un fournisseur
(SMTP ou API), ajouter les variables d'environnement correspondantes et un envoi
à la création d'une demande. **Non implémenté à ce jour.**

### C5. Audit externe

Un test d'intrusion et une revue de configuration serveur sont recommandés avant
lancement. Aucun n'a été réalisé (voir risques résiduels dans
`docs/SECURITY_AUDIT.md`).

---

## Bloc D — Nécessite une vérification par le client

À faire valider explicitement, par écrit, avant d'annoncer le site comme terminé.

### D1. Exactitude des données publiées

- Chaque annonce, prix et coordonnée doit être confirmé par l'agence.
- Vérifier au minimum un échantillon de positions sur la carte en comparant avec
  la réalité terrain.
- Confirmer le niveau de précision déclaré pour chaque annonce.

### D2. Droits sur les images

- Confirmation écrite que l'agence détient les droits sur chaque photographie
  publiée, et que les crédits/licences saisis sont exacts.

### D3. Contenus bilingues

- Relecture des textes arabes par un locuteur natif (les traductions actuelles
  sont fonctionnelles mais doivent être validées par l'agence).
- Vérification du rendu RTL sur les appareils réellement utilisés par la clientèle
  (Android d'entrée de gamme notamment).
- Vérification que les libellés métier correspondent au vocabulaire local
  (ex. « location saisonnière » vs « location courte durée »).

### D4. Conformité et mentions légales

- Valider la politique de confidentialité et la durée de conservation des
  demandes.
- Confirmer les mentions légales à afficher (agrément, immatriculation).
- Valider que la collecte du consentement dans les formulaires suffit au regard
  de la réglementation applicable.

### D5. Validation fonctionnelle finale

- Parcours complet réalisé par l'agence elle-même : connexion, création d'une
  annonce avec photos, publication, réception d'une demande, réponse.
- Confirmation que le tableau de bord correspond à la façon dont l'agence suit son
  activité (statuts, périodes financières).

---

## Rappel des règles à conserver

1. **Ne rien inventer** : ni bien, ni prix, ni coordonnée, ni client, ni
   statistique, ni numéro de téléphone.
2. **Toujours déclarer la précision géographique** d'une annonce ; `pending` si
   inconnue. La base refuse des coordonnées avec `pending`.
3. **Ne pas désactiver un test** ni réduire la couverture pour faire passer une
   suite.
4. **Ne pas revendiquer** un déploiement, un push ou un test qui n'a pas été
   exécuté et vérifié.
5. **Ne pas committer** de secret ; `SESSION_SECRET` et `.env.local` restent hors
   du dépôt.
6. **Ne pas modifier** une migration déjà appliquée en production ; en ajouter une
   nouvelle.

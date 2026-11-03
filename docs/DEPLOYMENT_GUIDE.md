# Guide de déploiement

> **Statut : aucun déploiement n'a été effectué.** Ce guide décrit la procédure
> validée localement (build de production réussi) mais **non exécutée en
> production**, faute d'accès serveur et de nom de domaine. Rien dans ce document
> ne doit être lu comme une confirmation de mise en ligne.

---

## 1. Contraintes à connaître avant de choisir un hébergeur

L'application a besoin de **deux éléments persistants** :

1. un fichier SQLite (`DATABASE_PATH`) ;
2. un dossier de photographies (`UPLOAD_DIR`).

Sur une plateforme à système de fichiers éphémère (Vercel, Netlify, Cloudflare
Pages), ces deux chemins sont **effacés à chaque déploiement**. Il faut donc :

- soit un hébergeur avec disque persistant (VPS, Railway avec volume, Fly.io avec
  volume, Render avec disque, Docker auto-hébergé) ;
- soit une migration du stockage (PostgreSQL + stockage objet) avant tout
  déploiement sur une plateforme *serverless* — voir
  `docs/ARCHITECTURE.md` §8.

**Recommandation pour une agence locale** : un VPS (2 vCPU, 2 Go de RAM)
avec disque SSD, Node 22, Nginx en frontal, sauvegardes quotidiennes. Coût et
complexité maîtrisés, données en Europe/Algérie selon l'hébergeur choisi.

---

## 2. Prérequis

| Élément | Version / valeur |
| --- | --- |
| Node.js | ≥ 22.5 (utilise `node:sqlite`) |
| npm | ≥ 10 |
| Système | Linux (testé), macOS |
| Domaine | ex. `rayane-affaire.dz` avec DNS pointant vers le serveur |
| Certificat TLS | Let's Encrypt (Certbot) ou certificat de l'hébergeur |

---

## 3. Déploiement sur un VPS (procédure complète)

### 3.1 Préparation du serveur

```bash
# Node 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx sqlite3 git

# Utilisateur de service sans shell de connexion
sudo useradd --system --create-home --shell /usr/sbin/nologin rayane
sudo mkdir -p /var/lib/rayane/uploads
sudo chown -R rayane:rayane /var/lib/rayane
```

### 3.2 Récupération du code

```bash
sudo -u rayane git clone https://github.com/Devmraustro/Rayane-Affaire.git /var/www/rayane-affaire
cd /var/www/rayane-affaire
sudo -u rayane npm ci
```

### 3.3 Variables d'environnement

```bash
sudo -u rayane tee /var/www/rayane-affaire/.env.production >/dev/null <<'EOF'
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://rayane-affaire.dz
SESSION_SECRET=REMPLACER_PAR_UN_SECRET_DE_48_OCTETS
DATABASE_PATH=/var/lib/rayane/rayane.db
UPLOAD_DIR=/var/lib/rayane/uploads
NEXT_PUBLIC_WHATSAPP_NUMBER=
NEXT_PUBLIC_PHONE_NUMBER=
NEXT_PUBLIC_CONTACT_EMAIL=
NEXT_PUBLIC_OFFICE_ADDRESS=
EOF
sudo -u rayane chmod 600 /var/www/rayane-affaire/.env.production
```

Générer le secret :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> **Les variables `NEXT_PUBLIC_*` sont figées au moment du build.** Il faut donc
> les renseigner **avant** `npm run build`, puis reconstruire après tout
> changement de numéro, d'e-mail ou d'adresse.

### 3.4 Base de données et compte administrateur

```bash
cd /var/www/rayane-affaire
sudo -u rayane env $(cat .env.production | xargs) npm run db:migrate
sudo -u rayane env $(cat .env.production | xargs) \
  ADMIN_EMAIL="direction@rayane-affaire.dz" \
  ADMIN_PASSWORD="<mot de passe fort, 12+ caractères>" \
  ADMIN_NAME="Gérant" \
  npm run db:seed:admin
```

Vérifier : la commande affiche le nombre de communes (11) et d'administrateurs (1).

### 3.5 Build et démarrage

```bash
sudo -u rayane npm run build          # avec les NEXT_PUBLIC_* déjà renseignées
sudo -u rayane npm run smoke -- http://127.0.0.1:3000   # après démarrage
```

Service systemd :

```ini
# /etc/systemd/system/rayane.service
[Unit]
Description=RAYANE AFFAIRE
After=network.target

[Service]
Type=simple
User=rayane
WorkingDirectory=/var/www/rayane-affaire
EnvironmentFile=/var/www/rayane-affaire/.env.production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now rayane
sudo systemctl status rayane
```

### 3.6 Nginx et TLS

```nginx
# /etc/nginx/sites-available/rayane-affaire
server {
  listen 80;
  server_name rayane-affaire.dz www.rayane-affaire.dz;

  client_max_body_size 10M;   # photos jusqu'à 5 Mo + marge

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/rayane-affaire /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d rayane-affaire.dz -d www.rayane-affaire.dz
```

Après activation de TLS, **reconstruire** avec
`NEXT_PUBLIC_SITE_URL=https://rayane-affaire.dz` (les URL canoniques changent).

---

## 4. Déploiement par conteneur (alternative)

```dockerfile
# Dockerfile
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_PHONE_NUMBER
ARG NEXT_PUBLIC_CONTACT_EMAIL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER \
    NEXT_PUBLIC_PHONE_NUMBER=$NEXT_PUBLIC_PHONE_NUMBER \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t rayane-affaire \
  --build-arg NEXT_PUBLIC_SITE_URL=https://rayane-affaire.dz .
docker run -d --name rayane -p 3000:3000 \
  -e SESSION_SECRET="$(openssl rand -base64 48)" \
  -e DATABASE_PATH=/data/rayane.db \
  -e UPLOAD_DIR=/data/uploads \
  -v rayane-data:/data \
  rayane-affaire
docker exec rayane npm run db:migrate
```

Le volume `rayane-data` est **indispensable** : sans lui, la base disparaît au
prochain conteneur.

---

## 5. Après déploiement — liste de vérification

À exécuter dans l'ordre, et à documenter (date, résultat) :

1. `npm run smoke -- https://rayane-affaire.dz` ⇒ 14/14.
2. Ouvrir `/` en français puis basculer en arabe : la direction passe bien en RTL.
3. Se connecter à `/admin` avec le compte créé, puis se déconnecter.
4. Créer une annonce **de test**, téléverser une photo, publier, vérifier la
   fiche publique, puis la supprimer.
5. Vérifier que `/admin` renvoie `307` vers la connexion en navigation privée.
6. Envoyer une demande depuis `/contact` et la retrouver dans `/admin/inquiries`.
7. Vérifier `https://rayane-affaire.dz/sitemap.xml` et `/robots.txt`.
8. Contrôler les en-têtes (`curl -I`) : CSP, HSTS, `nosniff`.
9. Vérifier qu'aucun numéro factice n'apparaît (le script `smoke` le fait).
10. **Supprimer les données de démonstration** si elles ont été utilisées :
    `npm run db:seed:demo -- --purge`.

---

## 6. Sauvegardes

```bash
# /usr/local/bin/rayane-backup.sh
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%F-%H%M)
DEST=/var/backups/rayane
mkdir -p "$DEST"
sqlite3 /var/lib/rayane/rayane.db ".backup '$DEST/db-$STAMP.sqlite'"
tar -czf "$DEST/uploads-$STAMP.tar.gz" -C /var/lib/rayane uploads
find "$DEST" -type f -mtime +30 -delete
```

```bash
sudo chmod +x /usr/local/bin/rayane-backup.sh
# tous les jours à 3 h
echo "0 3 * * * root /usr/local/bin/rayane-backup.sh" | sudo tee /etc/cron.d/rayane-backup
```

**Restaurer** :

```bash
sudo systemctl stop rayane
sudo -u rayane cp /var/backups/rayane/db-2026-11-03-0300.sqlite /var/lib/rayane/rayane.db
sudo -u rayane tar -xzf /var/backups/rayane/uploads-2026-11-03-0300.tar.gz -C /var/lib/rayane
sudo systemctl start rayane
```

Tester une restauration **avant** la mise en production : une sauvegarde jamais
restaurée n'est pas une sauvegarde.

---

## 7. Mise à jour de l'application

```bash
cd /var/www/rayane-affaire
sudo -u rayane git fetch origin && sudo -u rayane git checkout <tag-ou-commit>
sudo -u rayane npm ci
sudo -u rayane npm run db:migrate     # applique les nouvelles migrations
sudo -u rayane npm run build
sudo systemctl restart rayane
npm run smoke -- https://rayane-affaire.dz
```

Sauvegarder **avant** chaque migration. Ne jamais modifier un fichier de
migration déjà appliqué.

---

## 8. Supervision minimale

| Point | Commande / outil |
| --- | --- |
| Processus vivant | `systemctl status rayane`, `Restart=always` |
| Erreurs applicatives | `journalctl -u rayane -n 200` |
| Espace disque (uploads) | `df -h /var/lib/rayane` |
| Taille de la base | `ls -lh /var/lib/rayane/rayane.db` |
| Sauvegarde récente | `ls -lt /var/backups/rayane | head` |
| Disponibilité externe | Moniteur HTTP (UptimeRobot, BetterStack…) sur `/` |

Aucune alerte automatique n'est configurée par le code : c'est une tâche
d'exploitation (bloc C du handoff).

---

## 9. Ce qui n'est pas couvert ici

- Achat du nom de domaine et configuration DNS (client) ;
- choix de l'hébergeur et souscription (client) ;
- stratégie de conformité des données personnelles (déclaration, durée de
  conservation des demandes) — à valider juridiquement ;
- migration vers PostgreSQL si le trafic l'exige.

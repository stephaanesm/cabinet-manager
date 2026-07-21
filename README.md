# Cabinet Manager

Application mobile de gestion de cabinet d'avocats — Expo (React Native) + NestJS + PostgreSQL + MinIO.

---

## Architecture globale

```
cabinet_manager/
├── src/                        # Frontend — Application mobile Expo (React Native)
│   ├── app/                    # Écrans (file-based routing Expo Router)
│   ├── components/             # Composants réutilisables
│   ├── hooks/                  # useAuth, useTheme, …
│   ├── lib/                    # api.ts (client HTTP), constants.ts, secureStorage.ts
│   └── services/               # Appels API typés (dossiers, clients, …)
│
├── backend/                    # Backend — API REST NestJS
│   ├── src/
│   │   ├── main.ts             # Entrée Bootstrap
│   │   ├── app.module.ts       # Module racine (TypeORM, CORS, guards globaux)
│   │   ├── health.controller.ts# GET /api/v1/health
│   │   ├── modules/
│   │   │   ├── auth/           # 3.1 Authentification & RBAC (JWT + 2FA TOTP)
│   │   │   ├── users/          # Gestion des utilisateurs
│   │   │   ├── dossiers/       # 3.x Gestion des dossiers / affaires
│   │   │   ├── clients/        # Gestion des clients
│   │   │   └── journal/        # Journal d'activité (audit trail)
│   │   └── common/
│   │       ├── guards/         # JwtAuthGuard, RolesGuard, PermissionsGuard
│   │       ├── decorators/     # @Public, @CurrentUser, @Roles, @Permissions
│   │       ├── filters/        # HttpExceptionFilter
│   │       ├── interfaces/     # jwt-payload.interface.ts
│   │       └── rbac/           # permission.util.ts, password-policy.util.ts
│   ├── migrations/             # Scripts SQL (à appliquer dans l'ordre)
│   ├── Dockerfile              # Image Docker production (build multi-étapes)
│   ├── docker-compose.yml      # Compose backend (se connecte aux réseaux d'infra)
│   ├── .env.example            # Variables d'env backend
│   ├── package.json
│   └── tsconfig.json
│
└── infrastructure/             # Infrastructure de production (Phase 2)
    ├── docker-compose.yml      # Traefik + PostgreSQL + MinIO
    ├── .env.example            # Variables d'env infrastructure
    ├── traefik/
    │   ├── traefik.yml         # Config statique Traefik v3.1
    │   └── dynamic_conf.yml    # Middlewares sécurité, routers, rate-limit
    ├── postgres/
    │   ├── postgresql.conf     # Config PostgreSQL 16 (réplication, WAL, SSL)
    │   ├── pg_hba.conf         # Règles d'accès réseau
    │   ├── init-replication.sh # Init rôles (cm_app_user, replicator, cm_backup_user)
    │   ├── init-replica.sh     # Bootstrap réplique via pg_basebackup
    │   └── grants_app_role.sql # Grants de sécurité (moindre privilège)
    ├── minio/
    │   ├── bucket-policy.json  # Politique d'accès S3
    │   └── lifecycle-policy.json # Cycle de vie des objets
    └── scripts/
        ├── backup_postgres.sh  # Sauvegarde quotidienne vers MinIO
        ├── restore_postgres.sh # Restauration depuis MinIO
        ├── init_minio.sh       # Init buckets, SSE, clé applicative
        └── generate_admin_htpasswd.sh # Génération du htpasswd Traefik
```

---

## Démarrage rapide — Développement local

### 1. Infrastructure (PostgreSQL + MinIO)

```bash
cd infrastructure
cp .env.example .env    # Renseigner les mots de passe

# Créer le réseau Docker (une seule fois)
docker network create web

# Démarrer l'infrastructure
docker compose up -d postgres-primary minio
```

### 2. Backend NestJS

```bash
cd backend
cp .env.example .env    # Renseigner DB_PASSWORD, JWT_ACCESS_SECRET, etc.

# Installer les dépendances
npm install

# Appliquer les migrations SQL (après le premier démarrage de PostgreSQL)
# psql -h localhost -U cm_admin -d cabinet_manager -f migrations/migration_002_auth_module.sql
# psql -h localhost -U cm_admin -d cabinet_manager -f infrastructure/postgres/grants_app_role.sql

# Démarrer en mode développement (hot-reload)
npm run start:dev
```

Le serveur écoute sur `http://localhost:8080` et expose `http://localhost:8080/api/v1/health`.

### 3. Application mobile (Expo)

```bash
# À la racine du projet
npm install

# Variables d'environnement Expo
# EXPO_PUBLIC_API_URL=http://<IP_DU_PC>:8080/api/v1

npm start       # ou : npx expo start
```

---

## Déploiement production

### Étape 1 — Infrastructure

```bash
cd infrastructure
cp .env.example .env   # Renseigner TOUS les secrets

# Générer le htpasswd pour le dashboard Traefik
./scripts/generate_admin_htpasswd.sh admin <MOT_DE_PASSE_ADMIN>

# Réseau Docker public (une seule fois sur le serveur)
docker network create web

docker compose up -d
```

### Étape 2 — Backend

```bash
cd backend
cp .env.example .env   # Pointer vers postgres-primary (réseau backend Docker)

# En production, utiliser cm_app_user et non cm_admin
# DB_USER=cm_app_user

docker compose up -d
```

### Étape 3 — Application mobile (EAS Build)

```bash
# Configurer EXPO_PUBLIC_API_URL dans eas.json ou le tableau de bord EAS
# EXPO_PUBLIC_API_URL=https://api.cabinetmanager.cm/api/v1

npx eas build --platform all
```

---

## Variables d'environnement clés

| Variable | Où | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Frontend (EAS) | URL de l'API en production |
| `DB_HOST`, `DB_PASSWORD` | Backend `.env` | Connexion PostgreSQL |
| `JWT_ACCESS_SECRET` | Backend `.env` | Secret JWT (64 octets hex) |
| `TOTP_ENCRYPTION_KEY` | Backend `.env` | Clé chiffrement secrets 2FA |
| `POSTGRES_PASSWORD` | Infra `.env` | Mot de passe PostgreSQL admin |
| `MINIO_ROOT_PASSWORD` | Infra `.env` | Mot de passe MinIO root |
| `MINIO_KMS_SECRET_KEY` | Infra `.env` | Clé SSE-KMS MinIO |
| `DOMAIN` | Infra `.env` | Domaine de déploiement |

> **⚠️ SÉCURITÉ** : Ne jamais committer les fichiers `.env` réels. Seuls les `.env.example` sont versionnés.

---

## Ordre des migrations SQL

```bash
# 1. Schéma de base (à créer — migration_001)
# psql ... -f migrations/migration_001_schema.sql

# 2. Module Authentification
psql ... -f migrations/migration_002_auth_module.sql

# 3. Grants de sécurité (à appliquer en dernier, après toutes les tables)
psql ... -f infrastructure/postgres/grants_app_role.sql
```

---

## Compte administrateur initial

> **⚠️ SÉCURITÉ** : Les credentials ci-dessous sont pour le **premier démarrage uniquement**. Changez le mot de passe immédiatement après la première connexion.

| Champ | Valeur |
|-------|--------|
| Email | `admin@cabinetmanager.cm` |
| Mot de passe | `Admin@2025!` |
| Rôle | Administrateur (accès complet) |

### Génération du hash réel (obligatoire avant déploiement)

```bash
cd backend
npm install
node scripts/seed-admin.js
# Copier-coller le SQL généré dans votre base PostgreSQL
```

Ou avec un mot de passe personnalisé :

```bash
ADMIN_PASSWORD="VotreMotDePasseSecurise!" node scripts/seed-admin.js
```

---

## Ressources

- [Documentation Expo](https://docs.expo.dev/versions/v57.0.0/)
- [NestJS](https://docs.nestjs.com/)
- [Traefik v3](https://doc.traefik.io/traefik/v3.1/)
- [MinIO](https://min.io/docs/)

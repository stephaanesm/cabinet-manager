# ==============================================================================
# CABINET MANAGER — Dockerfile backend (NestJS API)
# Build multi-étapes : builder → runner (image minimale de production)
# ==============================================================================
# Étape 1 : construction du bundle JavaScript
FROM node:22-alpine AS builder

WORKDIR /app

# Copier d'abord les manifests pour bénéficier du cache Docker
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ==============================================================================
# Étape 2 : image de production (sans les devDependencies ni le code source TypeScript)
FROM node:22-alpine AS runner

WORKDIR /app

# Utilisateur non-root (sécurité)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Dépendances de production uniquement
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile --omit=dev && \
    npm cache clean --force

# Bundle produit par l'étape builder
COPY --from=builder /app/dist ./dist

USER nestjs

EXPOSE 8080

# Healthcheck (utilisé par Docker Compose et Traefik)
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/v1/health || exit 1

CMD ["node", "dist/main"]

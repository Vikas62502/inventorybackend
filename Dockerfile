# syntax=docker/dockerfile:1

# ---------------------------
# 1. Build Stage
# ---------------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package manifests first for better layer caching
COPY package.json package-lock.json ./

# Skip bundled Chromium in build — runner uses Alpine chromium package
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Cache npm downloads across CI builds (BuildKit)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

COPY . .

# Ensure .env exists in the image (placeholder only; runtime uses --env-file)
RUN if [ -f .env ]; then echo ".env found"; else touch .env; fi

# Raise heap — tsc can OOM on default ~2GB in buildx
ENV NODE_OPTIONS=--max-old-space-size=6144
RUN npm run build

# Keep runtime deps + sequelize-cli (used by npm run migrate in deploy)
RUN npm prune --omit=dev \
 && npm install sequelize-cli@6.6.2 --no-save --legacy-peer-deps

# ---------------------------
# 2. Production Runtime Stage
# ---------------------------
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Chromium for Puppeteer PDF generation (avoids re-downloading during npm install)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/.env ./
COPY --from=builder /app/.sequelizerc ./.sequelizerc

# sequelize-cli migrations live outside dist
COPY --from=builder /app/database ./database
COPY --from=builder /app/config ./config

RUN mkdir -p uploads secrets

EXPOSE 3000

CMD ["npm", "start"]

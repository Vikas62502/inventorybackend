# ---------------------------
# 1. Build Stage
# ---------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies (lockfile must be present — do not ignore package-lock.json)
RUN npm ci --legacy-peer-deps

# Copy all project files
COPY . .

# Ensure .env exists in the image (prevents COPY error when .env is absent locally)
RUN if [ -f .env ]; then echo ".env found"; else touch .env; fi

# Build the TypeScript application (raise heap — tsc OOMs on default ~2GB in buildx)
ENV NODE_OPTIONS=--max-old-space-size=6144
RUN npm run build

# ---------------------------
# 2. Production Runtime Stage
# ---------------------------
FROM node:18-alpine AS runner
 
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/.env ./

# Create uploads and secrets mount points
RUN mkdir -p uploads secrets

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
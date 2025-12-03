# ---------------------------
# 1. Build Stage
# ---------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all project files
COPY . .

# Build the Next.js app
RUN npm run build

# ---------------------------
# 2. Production Runtime Stage
# ---------------------------
FROM node:18-alpine AS runner
 
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Expose Next.js port
EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]
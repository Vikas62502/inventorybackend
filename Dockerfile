# ---------------------------
# 1. Build Stage
# ---------------------------
    FROM node:18-alpine AS builder

    # Set working directory
    WORKDIR /app
    
    # Copy package + lockfile first (cache optimization)
    COPY package*.json ./
    
    # Install all dependencies (including devDependencies)
    RUN npm ci --legacy-peer-deps
    
    # Copy rest of the source code
    COPY . .
    
    # Build TypeScript
    RUN npm run build
    
    
    # ---------------------------
    # 2. Production Runtime Stage
    # ---------------------------
    FROM node:18-alpine AS runner
    
    WORKDIR /app
    
    ENV NODE_ENV=production
    
    # Create non-root user
    RUN addgroup -g 1001 -S nodejs && \
        adduser -S nodejs -u 1001
    
    # Copy only package + lockfile
    COPY package*.json ./
    
    # Install only production deps
    RUN npm ci --only=production --legacy-peer-deps && \
        npm cache clean --force
    
    # Copy compiled dist from builder
    COPY --from=builder /app/dist ./dist
    
    # If you need additional files (like config), copy whole folder
    COPY --from=builder /app/config ./config
    COPY --from=builder /app/.sequelizerc ./.sequelizerc
    COPY --from=builder /app/database ./database
    
    # Create uploads directory
    RUN mkdir -p uploads && \
        chown -R nodejs:nodejs /app
    
    USER nodejs
    
    EXPOSE 3000
    
    # Health check
    HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
      CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
    
    # Start the application
    CMD ["node", "dist/server.js"]
    
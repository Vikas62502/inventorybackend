# Multi-stage build for production optimization

# ---------------------------
# 1. Build Stage
# ---------------------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci --legacy-peer-deps

# Copy source code and configuration files
COPY tsconfig.json ./
COPY .sequelizerc ./
COPY config/ ./config/
COPY controllers/ ./controllers/
COPY middleware/ ./middleware/
COPY models/ ./models/
COPY routes/ ./routes/
COPY types/ ./types/
COPY utils/ ./utils/
COPY validations/ ./validations/
COPY database/ ./database/
COPY server.ts ./

# Build TypeScript to JavaScript
RUN npm run build

# ---------------------------
# 2. Production Runtime Stage
# ---------------------------
FROM node:18-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config/database.js ./config/database.js
COPY --from=builder /app/.sequelizerc ./.sequelizerc
COPY --from=builder /app/database ./database

# Create uploads directory and set permissions
RUN mkdir -p uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/server.js"]

# Docker Setup Guide

This guide explains how to build and run the Chairbord Solar Inventory Backend using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+ (optional, for docker-compose setup)

## Quick Start with Docker Compose

1. **Create a `.env` file** in the project root with your configuration:

```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=chairbord_solar
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Application Configuration
PORT=3000
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your-very-secure-secret-key
JWT_EXPIRE=7d

# Loki Logging (optional)
LOKI_HOST_IP=http://your-loki-instance:3100
LOKI_JOB_NAME=Solar_Inventory
LOG_LEVEL=info

# Production URL
PROD_URL=https://api.chairbord.com
```

2. **Start the services:**

```bash
docker-compose up -d
```

This will:
- Build the API image
- Start PostgreSQL database
- Run database migrations
- Start the API server

3. **View logs:**

```bash
docker-compose logs -f api
```

4. **Stop the services:**

```bash
docker-compose down
```

## Building the Docker Image

### Build the image:

```bash
docker build -t chairbord-api:latest .
```

### Run the container:

```bash
docker run -d \
  --name chairbord-api \
  -p 3000:3000 \
  -e DB_HOST=your-db-host \
  -e DB_NAME=chairbord_solar \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your-password \
  -e JWT_SECRET=your-secret \
  -v $(pwd)/uploads:/app/uploads \
  chairbord-api:latest
```

## Dockerfile Details

The Dockerfile uses a **multi-stage build** for optimization:

### Stage 1: Builder
- Uses `node:18-alpine` as base image
- Installs all dependencies (including devDependencies)
- Compiles TypeScript to JavaScript
- Outputs to `dist/` directory

### Stage 2: Runner (Production)
- Uses `node:18-alpine` as base image
- Installs only production dependencies
- Copies built application from builder stage
- Runs as non-root user for security
- Includes health check endpoint

## Environment Variables

Required environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `chairbord_solar` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `PORT` | Application port | `3000` |

Optional environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `NODE_ENV` | Node environment | `production` |
| `DB_SSL` | Enable SSL for database | `false` |
| `LOKI_HOST_IP` | Loki logging endpoint | - |
| `LOKI_JOB_NAME` | Loki job name | `Solar_Inventory` |
| `LOG_LEVEL` | Logging level | `info` |
| `PROD_URL` | Production URL | - |

## Volumes

The container uses volumes for:

- **`/app/uploads`**: File uploads directory (mounted from host)

## Health Checks

The container includes a health check that monitors the `/health` endpoint:

```bash
# Check container health
docker ps
```

## Running Migrations

Migrations run automatically when using `docker-compose`. For manual execution:

```bash
# Using docker-compose
docker-compose exec api npm run migrate

# Using docker run
docker exec chairbord-api npm run migrate
```

## Troubleshooting

### Container won't start

1. Check logs:
```bash
docker-compose logs api
```

2. Verify environment variables are set correctly

3. Ensure database is accessible

### Database connection errors

1. Verify database credentials in `.env`
2. Check if PostgreSQL container is running:
```bash
docker-compose ps postgres
```

3. Test database connection:
```bash
docker-compose exec postgres psql -U postgres -d chairbord_solar
```

### Build fails

1. Clear Docker cache:
```bash
docker builder prune
```

2. Rebuild without cache:
```bash
docker-compose build --no-cache
```

## Production Deployment

For production deployment:

1. **Use secrets management** (Docker secrets, Kubernetes secrets, etc.) instead of `.env` files
2. **Enable SSL** for database connections (`DB_SSL=true`)
3. **Set strong JWT_SECRET** (use a secure random string)
4. **Configure proper logging** with Loki or your logging service
5. **Use reverse proxy** (nginx, Traefik) in front of the API
6. **Set resource limits** in docker-compose or Kubernetes

### Example production docker-compose:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    restart: always
```

## Development with Docker

For development, you can mount the source code:

```yaml
volumes:
  - .:/app
  - /app/node_modules
```

This allows hot-reloading during development.




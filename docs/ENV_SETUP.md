# Environment Variables Setup Guide

## Quick Setup

### Local Development

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** with your values

3. **Start the application:**
   ```bash
   npm run dev
   ```

## GitHub Actions Deployment

### How .env Files are Created

The GitHub Actions workflows **automatically create** `.env` files on the deployment server using GitHub Secrets. You don't need to manually create them.

### Required GitHub Secrets

#### For Staging Environment

Add these secrets in GitHub: **Settings → Secrets and variables → Actions**

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `STAGING_DB_NAME` | Database name | `chairbord_solar_staging` |
| `STAGING_DB_USER` | Database user | `postgres` |
| `STAGING_DB_PASSWORD` | Database password | `secure_password` |
| `STAGING_JWT_SECRET` | JWT secret key | `your-secret-key` |
| `STAGING_HOST` | Server hostname/IP | `staging.example.com` |
| `STAGING_USER` | SSH username | `deploy` |
| `STAGING_SSH_KEY` | SSH private key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `STAGING_URL` | Staging URL | `https://staging-api.example.com` |

**Optional Staging Secrets:**
- `STAGING_DB_SSL` (default: `false`)
- `STAGING_APP_PORT` (default: `3000`)
- `STAGING_JWT_EXPIRE` (default: `7d`)
- `STAGING_LOKI_HOST_IP`
- `STAGING_LOKI_JOB_NAME` (default: `Solar_Inventory`)
- `STAGING_LOG_LEVEL` (default: `info`)

#### For Production Environment

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `PROD_DB_NAME` | Database name | `chairbord_solar` |
| `PROD_DB_USER` | Database user | `postgres` |
| `PROD_DB_PASSWORD` | Database password | `secure_password` |
| `PROD_JWT_SECRET` | JWT secret key | `your-secret-key` |
| `PROD_HOST` | Server hostname/IP | `api.example.com` |
| `PROD_USER` | SSH username | `deploy` |
| `PROD_SSH_KEY` | SSH private key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `PROD_URL` | Production URL | `https://api.example.com` |

**Optional Production Secrets:**
- `PROD_DB_SSL` (default: `false`)
- `PROD_APP_PORT` (default: `3000`)
- `PROD_JWT_EXPIRE` (default: `7d`)
- `PROD_LOKI_HOST_IP`
- `PROD_LOKI_JOB_NAME` (default: `Solar_Inventory`)
- `PROD_LOG_LEVEL` (default: `info`)

### Workflow Process

1. **Workflow triggers** (push to branch or manual)
2. **Builds Docker image** and pushes to registry
3. **SSH to server** and creates `.env` file from secrets
4. **Sets permissions** (`chmod 600 .env`)
5. **Pulls image** and starts container
6. **Runs migrations**
7. **Health check** verifies deployment

### What Gets Created

The workflow creates a `.env` file on the server like this:

```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=chairbord_solar
DB_USER=postgres
DB_PASSWORD=secure_password_from_secret
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true

# Application Configuration
PORT=3000
NODE_ENV=production

# JWT Configuration
JWT_SECRET=secret_from_github
JWT_EXPIRE=7d

# Loki Logging Configuration
LOKI_HOST_IP=http://loki:3100
LOKI_JOB_NAME=Solar_Inventory
LOG_LEVEL=info

# Production URL
PROD_URL=https://api.example.com
```

## Manual Server Setup

If you need to manually create `.env` on the server:

1. **SSH to server:**
   ```bash
   ssh user@your-server
   ```

2. **Navigate to deployment directory:**
   ```bash
   cd /opt/chairbord-api
   ```

3. **Create .env file:**
   ```bash
   nano .env
   ```

4. **Add configuration** (copy from `.env.example` and update values)

5. **Set permissions:**
   ```bash
   chmod 600 .env
   ```

6. **Verify:**
   ```bash
   ls -la .env
   # Should show: -rw------- (600 permissions)
   ```

## Docker Compose Usage

The `docker-compose.yml` files use `env_file` to automatically load `.env`:

```yaml
services:
  api:
    env_file:
      - .env
```

This means:
- ✅ Variables from `.env` are automatically loaded
- ✅ No need to specify each variable individually
- ✅ Easy to manage and update

## Security Best Practices

1. **Never commit `.env` files**
   - Already in `.gitignore`
   - Use `.env.example` as template

2. **Use strong secrets:**
   ```bash
   # Generate strong JWT secret
   openssl rand -base64 32
   
   # Generate strong password
   openssl rand -base64 24
   ```

3. **Restrict file permissions:**
   ```bash
   chmod 600 .env  # Only owner can read/write
   ```

4. **Rotate secrets regularly:**
   - Update in GitHub Secrets
   - Redeploy to apply changes

5. **Use different secrets per environment:**
   - Development: Local `.env`
   - Staging: `STAGING_*` secrets
   - Production: `PROD_*` secrets

## Troubleshooting

### .env file not found

**Error:** `Error: Cannot find module './.env'`

**Solution:**
1. Ensure `.env` file exists in project root
2. Check file permissions: `chmod 600 .env`
3. Verify docker-compose.yml has `env_file: - .env`

### Variables not loading

**Check:**
1. File format (no spaces around `=`)
2. Variable names match exactly
3. Restart container: `docker-compose restart api`

### GitHub Actions can't create .env

**Check:**
1. SSH key has write permissions
2. Deployment path exists
3. All required secrets are set

## Example .env File

See `.env.example` for a complete template with all available variables.




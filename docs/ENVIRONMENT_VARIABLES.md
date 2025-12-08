# Environment Variables Management

This document explains how environment variables and `.env` files are handled across different deployment scenarios.

## Overview

The application uses environment variables for configuration. The `.env` file is **never committed to git** and is handled differently in each environment.

## Local Development

### Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** with your local configuration:
   ```env
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASSWORD=your_local_password
   # ... other variables
   ```

3. **The `.env` file is automatically loaded** by `dotenv` in `server.ts`

### File Location
- Location: Project root (`.env`)
- Status: Ignored by git (in `.gitignore`)
- Usage: Loaded automatically by the application

## Docker Development

### Using docker-compose.yml

The `docker-compose.yml` file uses `env_file` to load environment variables:

```yaml
services:
  api:
    env_file:
      - .env
```

**Setup:**
1. Create `.env` file in project root
2. Run `docker-compose up`
3. Variables are automatically loaded

## Production Deployment

### Option 1: Using .env File (Recommended for GitHub Actions)

The GitHub Actions workflows automatically create `.env` files on the deployment server using GitHub Secrets.

**How it works:**
1. Workflow reads secrets from GitHub
2. Creates `.env` file on server via SSH
3. Sets proper permissions (600 - read/write for owner only)
4. Docker Compose loads the file

**Required GitHub Secrets:**

#### Staging Secrets
- `STAGING_DB_NAME`
- `STAGING_DB_USER`
- `STAGING_DB_PASSWORD`
- `STAGING_JWT_SECRET`
- `STAGING_LOKI_HOST_IP` (optional)
- `STAGING_URL`

#### Production Secrets
- `PROD_DB_NAME`
- `PROD_DB_USER`
- `PROD_DB_PASSWORD`
- `PROD_JWT_SECRET`
- `PROD_LOKI_HOST_IP` (optional)
- `PROD_URL`

### Option 2: Direct Environment Variables

You can also pass environment variables directly to Docker without using `.env` file:

```yaml
services:
  api:
    environment:
      DB_HOST: ${DB_HOST}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      # ... etc
```

**Setup on server:**
1. Export variables in shell:
   ```bash
   export DB_HOST=postgres
   export DB_USER=myuser
   # ... etc
   ```

2. Or use Docker secrets (for Docker Swarm)

### Option 3: Using Docker Secrets (Docker Swarm)

For Docker Swarm deployments:

```yaml
services:
  api:
    secrets:
      - db_password
      - jwt_secret
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
```

## GitHub Actions Workflow

### How .env is Created

The deployment workflows create `.env` files on the server using a heredoc:

```bash
cat > .env << EOF
DB_HOST=postgres
DB_NAME=${secrets.PROD_DB_NAME}
# ... etc
EOF
chmod 600 .env
```

### Security

- ✅ `.env` files are **never committed** to git
- ✅ Created with restricted permissions (600)
- ✅ Values come from GitHub Secrets (encrypted)
- ✅ Only accessible on the deployment server

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `postgres` or `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `chairbord_solar` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | `3000` |
| `NODE_ENV` | Node environment | `development` |
| `JWT_EXPIRE` | JWT expiration | `7d` |
| `DB_SSL` | Enable SSL | `false` |
| `DB_SSL_REJECT_UNAUTHORIZED` | Reject unauthorized SSL | `true` |
| `LOKI_HOST_IP` | Loki endpoint | - |
| `LOKI_JOB_NAME` | Loki job name | `Solar_Inventory` |
| `LOG_LEVEL` | Logging level | `info` |
| `PROD_URL` | Production URL | - |

## Manual Server Setup

If deploying manually (without GitHub Actions):

### 1. Create .env file on server

```bash
cd /opt/chairbord-api
nano .env
```

### 2. Add configuration

```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=chairbord_solar
DB_USER=postgres
DB_PASSWORD=your_secure_password
JWT_SECRET=your_very_secure_secret
# ... etc
```

### 3. Set permissions

```bash
chmod 600 .env
```

### 4. Verify docker-compose.yml uses it

Ensure your `docker-compose.yml` has:

```yaml
services:
  api:
    env_file:
      - .env
```

## Best Practices

### 1. Never Commit .env Files

✅ **Do:**
- Use `.env.example` as template
- Add `.env` to `.gitignore`
- Use GitHub Secrets for CI/CD

❌ **Don't:**
- Commit `.env` files
- Share `.env` files in chat/email
- Hardcode secrets in code

### 2. Use Different Secrets per Environment

- **Development**: Local `.env` file
- **Staging**: GitHub Secrets with `STAGING_` prefix
- **Production**: GitHub Secrets with `PROD_` prefix

### 3. Rotate Secrets Regularly

- Change `JWT_SECRET` periodically
- Rotate database passwords
- Update secrets in GitHub

### 4. Use Strong Secrets

- **JWT_SECRET**: At least 32 random characters
- **DB_PASSWORD**: Strong password (16+ characters, mixed case, numbers, symbols)

### 5. Restrict File Permissions

```bash
chmod 600 .env  # Only owner can read/write
```

## Troubleshooting

### .env file not loading

1. **Check file exists:**
   ```bash
   ls -la .env
   ```

2. **Check permissions:**
   ```bash
   chmod 600 .env
   ```

3. **Verify docker-compose.yml:**
   ```yaml
   env_file:
     - .env
   ```

4. **Check variable names:**
   - Must match exactly (case-sensitive)
   - No spaces around `=`

### Variables not available in container

1. **Restart container:**
   ```bash
   docker-compose restart api
   ```

2. **Check environment:**
   ```bash
   docker-compose exec api env | grep DB_
   ```

3. **Verify .env file format:**
   ```bash
   cat .env
   ```

### GitHub Actions deployment fails

1. **Check secrets are set:**
   - Go to Settings → Secrets and variables → Actions
   - Verify all required secrets exist

2. **Check SSH access:**
   - Verify SSH key is correct
   - Test SSH connection manually

3. **Check file creation:**
   ```bash
   ssh user@host "cat /opt/chairbord-api/.env"
   ```

## Migration from .env to Secrets

If you're currently using `.env` files and want to migrate to GitHub Secrets:

1. **Export current values:**
   ```bash
   cat .env
   ```

2. **Add to GitHub Secrets:**
   - Go to repository Settings → Secrets
   - Add each variable with appropriate prefix

3. **Update workflows:**
   - Workflows already support this
   - No code changes needed

4. **Remove .env from server:**
   ```bash
   rm .env  # After verifying deployment works
   ```

## Security Considerations

1. **File Permissions:**
   - Always use `chmod 600 .env`
   - Restrict access to deployment user only

2. **Secret Management:**
   - Use GitHub Secrets for CI/CD
   - Consider using secret management tools (HashiCorp Vault, AWS Secrets Manager) for production

3. **Rotation:**
   - Rotate secrets regularly
   - Have a process for updating secrets

4. **Audit:**
   - Log access to secrets
   - Monitor for unauthorized access

5. **Backup:**
   - Keep encrypted backups of secrets
   - Store in secure location



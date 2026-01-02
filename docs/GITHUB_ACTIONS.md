# GitHub Actions Workflows

This document describes the GitHub Actions workflows configured for CI/CD of the Chairbord Solar Inventory Backend.

## Workflows Overview

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**
- **Type Check**: Validates TypeScript code
- **Build**: Builds Docker image and pushes to GitHub Container Registry
- **Security Scan**: Scans Docker image for vulnerabilities using Trivy

**Output:**
- Docker image pushed to `ghcr.io/<owner>/<repo>`

### 2. Test Workflow (`.github/workflows/test.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**
- **Test**: Runs type checking, linting, build, and tests
- Uses PostgreSQL service container for database testing

### 3. Deploy to Staging (`.github/workflows/deploy-staging.yml`)

**Triggers:**
- Push to `develop` branch
- Manual workflow dispatch

**Jobs:**
- **Deploy**: Builds and deploys to staging environment
- Runs database migrations
- Performs health checks
- Sends Slack notifications (optional)

### 4. Deploy to Production (`.github/workflows/deploy-production.yml`)

**Triggers:**
- Push to `main` branch
- Tags matching `v*.*.*` pattern
- Manual workflow dispatch

**Jobs:**
- **Deploy**: Builds and deploys to production environment
- Runs database migrations separately
- Performs health checks with retries
- Automatic rollback on failure
- Creates GitHub releases for tags
- Sends Slack notifications (optional)

### 5. Docker Hub Workflow (`.github/workflows/docker-hub.yml`)

**Triggers:**
- Push to `main` branch
- Tags matching `v*.*.*` pattern
- Manual workflow dispatch

**Jobs:**
- **Build and Push**: Builds and pushes Docker image to Docker Hub

## Required Secrets

Configure the following secrets in your GitHub repository settings:

### For Staging Deployment

| Secret Name | Description |
|-------------|-------------|
| `STAGING_HOST` | Staging server hostname or IP |
| `STAGING_USER` | SSH username for staging server |
| `STAGING_SSH_KEY` | SSH private key for staging server |
| `STAGING_PORT` | SSH port (default: 22) |
| `STAGING_DEPLOY_PATH` | Deployment path on staging server |
| `STAGING_URL` | Staging environment URL |

### For Production Deployment

| Secret Name | Description |
|-------------|-------------|
| `PROD_HOST` | Production server hostname or IP |
| `PROD_USER` | SSH username for production server |
| `PROD_SSH_KEY` | SSH private key for production server |
| `PROD_PORT` | SSH port (default: 22) |
| `PROD_DEPLOY_PATH` | Deployment path on production server |
| `PROD_URL` | Production environment URL |

### For Docker Hub

| Secret Name | Description |
|-------------|-------------|
| `DOCKER_HUB_USERNAME` | Docker Hub username |
| `DOCKER_HUB_TOKEN` | Docker Hub access token |

### Optional Secrets

| Secret Name | Description |
|-------------|-------------|
| `SLACK_WEBHOOK_URL` | Slack webhook URL for notifications |

## Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its corresponding value

## Environment Protection Rules

For production deployments, configure environment protection rules:

1. Go to **Settings** → **Environments**
2. Create `production` and `staging` environments
3. Configure:
   - **Required reviewers**: Require approval for production deployments
   - **Wait timer**: Optional delay before deployment
   - **Deployment branches**: Restrict to `main` branch only

## Deployment Server Setup

### Prerequisites on Deployment Server

1. **Docker and Docker Compose** installed
2. **SSH access** configured
3. **Deployment directory** created:
   ```bash
   mkdir -p /opt/chairbord-api
   ```

### Required Files on Server

Create `docker-compose.yml` on the deployment server:

```yaml
version: '3.8'

services:
  api:
    image: ghcr.io/<owner>/<repo>:latest
    container_name: chairbord-api
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      # ... other environment variables
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
      - ./.env:/app/.env:ro
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    # ... postgres configuration
```

Create `.env` file with production secrets.

## Workflow Usage

### Automatic Deployment

- **Staging**: Push to `develop` branch → Auto-deploys to staging
- **Production**: Push to `main` branch → Auto-deploys to production

### Manual Deployment

1. Go to **Actions** tab in GitHub
2. Select the workflow (e.g., "Deploy to Production")
3. Click **Run workflow**
4. Select branch and click **Run workflow**

### Tagged Releases

1. Create a tag:
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```
2. This triggers:
   - Production deployment
   - GitHub release creation
   - Docker image tagging

## Monitoring Deployments

### View Workflow Runs

1. Go to **Actions** tab
2. Click on a workflow to see run history
3. Click on a run to see detailed logs

### Health Checks

Workflows include automatic health checks:
- Staging: Checks `/health` endpoint after deployment
- Production: Retries up to 5 times with 5-second intervals

### Rollback

Production workflow includes automatic rollback:
- If health check fails, previous version is restored
- Manual rollback: Re-run previous successful workflow

## Troubleshooting

### Build Failures

1. Check workflow logs in **Actions** tab
2. Verify:
   - TypeScript compilation errors
   - Docker build issues
   - Missing dependencies

### Deployment Failures

1. Check SSH connection:
   ```bash
   ssh -i <key> <user>@<host>
   ```

2. Verify server setup:
   - Docker installed
   - Deployment path exists
   - Permissions correct

3. Check application logs:
   ```bash
   docker-compose logs api
   ```

### Health Check Failures

1. Verify application is running:
   ```bash
   docker-compose ps
   ```

2. Check application logs:
   ```bash
   docker-compose logs api
   ```

3. Test health endpoint manually:
   ```bash
   curl http://localhost:3000/health
   ```

## Best Practices

1. **Use Environment Protection**: Require approvals for production
2. **Test in Staging First**: Always deploy to staging before production
3. **Monitor Deployments**: Watch workflow runs and application logs
4. **Tag Releases**: Use semantic versioning for releases
5. **Keep Secrets Secure**: Never commit secrets to repository
6. **Review Changes**: Review PRs before merging to main
7. **Rollback Plan**: Know how to rollback if issues occur

## Customization

### Adding New Environments

1. Copy `deploy-staging.yml`
2. Rename to `deploy-<environment>.yml`
3. Update environment name and secrets
4. Configure trigger conditions

### Adding Notifications

Workflows support Slack notifications. To add other services:

1. Add notification step to workflow
2. Configure webhook or API credentials
3. Add secret to repository

### Custom Build Steps

Modify workflows to add:
- Additional tests
- Security scans
- Performance tests
- Custom deployment steps




# Logger Configuration

This project uses Winston with Loki transport for centralized logging.

## Setup

### Environment Variables

Add these to your `.env` file:

```env
# Loki Configuration
LOKI_HOST_IP=http://your-loki-instance:3100
LOKI_JOB_NAME=Solar_Inventory

# Log Level (optional, defaults to 'info')
LOG_LEVEL=info
```

### Logger Features

- **Console Transport**: Automatically enabled in development mode for local debugging
- **Loki Transport**: Enabled when `LOKI_HOST_IP` is configured
- **Safe Stringify**: Automatically converts objects to JSON strings for Loki compatibility
- **Request Logging**: All HTTP requests are automatically logged with duration and status codes
- **Error Logging**: Structured error logging with stack traces

## Usage

### In Controllers

Use the helper functions from `utils/loggerHelper`:

```typescript
import { logError, logInfo, logWarn } from '../utils/loggerHelper';

// Log errors
try {
  // your code
} catch (error) {
  logError('Operation failed', error, { userId: req.user?.id, context: 'additional info' });
}

// Log info
logInfo('User logged in', { userId: user.id, username: user.username });

// Log warnings
logWarn('Low inventory', { productId: product.id, quantity: product.quantity });
```

### Direct Logger Usage

You can also use the logger directly:

```typescript
import logger from '../config/logger';

logger.error('Error message', { error: error.message, stack: error.stack });
logger.info('Info message', { userId: user.id });
logger.warn('Warning message', { context: 'additional data' });
```

## Log Levels

- `error`: Error messages
- `warn`: Warning messages
- `info`: Informational messages (default)
- `debug`: Debug messages
- `verbose`: Verbose messages

Set the log level using `LOG_LEVEL` environment variable.

## Request Logging

All HTTP requests are automatically logged with:
- HTTP method
- URL
- Status code
- Response duration
- Client IP
- User agent

## Error Logging

Errors are automatically logged with:
- Error message
- Stack trace
- Additional context (user ID, request details, etc.)

## Loki Integration

When `LOKI_HOST_IP` is configured, logs are automatically sent to Loki with:
- Batching enabled (logs sent every 5 seconds)
- Job label: `Solar_Inventory` (or custom `LOKI_JOB_NAME`)
- JSON format for structured logging



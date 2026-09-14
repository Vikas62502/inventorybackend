import { logError, logInfo } from './loggerHelper';
import { GoogleSheetsNotConfiguredError } from './hrSheetGoogleAuth';

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;

/**
 * §AZ — in-process cron: every 30 minutes pull Google Sheet → sync-all + socket.
 * Disable with SHEET_AUTO_SYNC_CRON=false. Override interval via SHEET_AUTO_SYNC_INTERVAL_MS.
 * Ops may still schedule external cron every 30 min:
 *   curl -X POST …/hr/sheet-sources/sync-all -H "x-cron-secret: $CRON_SECRET"
 */
export const startSheetAutoSyncCron = (): void => {
  const disabled =
    String(process.env.SHEET_AUTO_SYNC_CRON || '')
      .trim()
      .toLowerCase() === 'false';
  if (disabled) {
    logInfo('Sheet auto-sync cron disabled (SHEET_AUTO_SYNC_CRON=false)');
    return;
  }

  const intervalMs = Math.max(
    60_000,
    Number(process.env.SHEET_AUTO_SYNC_INTERVAL_MS || DEFAULT_INTERVAL_MS) || DEFAULT_INTERVAL_MS
  );

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const { runHrSheetSourcesSyncAll } = await import('../controllers/hrSheetSourceController');
      const result = await runHrSheetSourcesSyncAll();
      logInfo('Sheet auto-sync cron completed', {
        spreadsheetId: result.spreadsheetId,
        tabs: result.sources.length,
        syncedAt: result.syncedAt
      });
    } catch (error) {
      if (error instanceof GoogleSheetsNotConfiguredError) {
        logInfo('Sheet auto-sync skipped — Google Sheets not configured');
      } else {
        logError('Sheet auto-sync cron failed', error);
      }
    } finally {
      running = false;
    }
  };

  logInfo('Sheet auto-sync cron started', {
    intervalMs,
    intervalMinutes: Math.round(intervalMs / 60_000)
  });

  // First run after one interval (avoid competing with boot migrations / cold Google auth).
  setInterval(() => {
    void tick();
  }, intervalMs);
};

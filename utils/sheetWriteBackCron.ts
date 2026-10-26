import { logError, logInfo } from './loggerHelper';
import { GoogleSheetsNotConfiguredError, googleSheetsErrorResponse } from './hrSheetGoogleAuth';

const DEFAULT_INTERVAL_MS = 2 * 60 * 60 * 1000;

/**
 * In-process cron: every 2 hours DB → Google Sheet write-back-all + stale reassign.
 * Disable with SHEET_WRITE_BACK_CRON=false. Override via SHEET_WRITE_BACK_INTERVAL_MS.
 *   curl -X POST …/hr/sheet-sources/write-back-all -H "x-cron-secret: $CRON_SECRET"
 */
export const startSheetWriteBackCron = (): void => {
  const disabled =
    String(process.env.SHEET_WRITE_BACK_CRON || '')
      .trim()
      .toLowerCase() === 'false';
  if (disabled) {
    logInfo('Sheet write-back cron disabled (SHEET_WRITE_BACK_CRON=false)');
    return;
  }

  const intervalMs = Math.max(
    10 * 60 * 1000,
    Number(process.env.SHEET_WRITE_BACK_INTERVAL_MS || DEFAULT_INTERVAL_MS) || DEFAULT_INTERVAL_MS
  );

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const { runHrSheetSourcesWriteBackAll } = await import('./hrSheetWriteBack');
      const result = await runHrSheetSourcesWriteBackAll();
      logInfo('Sheet write-back cron completed', result);
    } catch (error) {
      if (error instanceof GoogleSheetsNotConfiguredError) {
        logInfo('Sheet write-back skipped — Google Sheets not configured');
      } else {
        logError('Sheet write-back cron failed', error, {
          code: googleSheetsErrorResponse(error, 'Write-back-all failed').code
        });
      }
    } finally {
      running = false;
    }
  };

  logInfo('Sheet write-back cron started', {
    intervalMs,
    intervalMinutes: Math.round(intervalMs / 60_000)
  });

  setInterval(() => {
    void tick();
  }, intervalMs);
};

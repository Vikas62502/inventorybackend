import fs from 'fs';
import path from 'path';
import { google, sheets_v4 } from 'googleapis';

export const DEFAULT_SPREADSHEET_ID = '18zqPIpa3fcjRvfNqdm3FPC10bszPIPHbv5F3-TMk0A0';

/** Local/server key file (gitignored). Prefer env override. */
export const DEFAULT_GOOGLE_SHEETS_CREDENTIALS_PATH = path.join(
  process.cwd(),
  'secrets',
  'google-sheets-service-account.json'
);

/** Read + write (DB → Sheet write-back needs Editor + this scope). */
export const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export class GoogleSheetsNotConfiguredError extends Error {
  code = 'CFG_GOOGLE_SHEETS';

  constructor(
    message = 'Google Sheets credentials missing: set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS, or place the key at secrets/google-sheets-service-account.json'
  ) {
    super(message);
    this.name = 'GoogleSheetsNotConfiguredError';
  }
}

export const resolveSpreadsheetId = (raw?: unknown): string => {
  const fromEnv = String(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim();
  if (fromEnv) return fromEnv;
  const fromBody = String(raw || '').trim();
  if (fromBody) return fromBody;
  return DEFAULT_SPREADSHEET_ID;
};

const resolveGoogleSheetsKeyFile = (): string | null => {
  const candidates = [
    String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim(),
    DEFAULT_GOOGLE_SHEETS_CREDENTIALS_PATH,
    path.join(__dirname, '..', 'secrets', 'google-sheets-service-account.json')
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

export const getSheetsClient = (): sheets_v4.Sheets => {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json && json.trim()) {
    let credentials: Record<string, unknown>;
    try {
      credentials = JSON.parse(json);
    } catch {
      throw new GoogleSheetsNotConfiguredError(
        'GOOGLE_SERVICE_ACCOUNT_JSON is set but is not valid JSON'
      );
    }
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [GOOGLE_SHEETS_SCOPE]
    });
    return google.sheets({ version: 'v4', auth });
  }

  const keyFile = resolveGoogleSheetsKeyFile();
  if (!keyFile) {
    throw new GoogleSheetsNotConfiguredError();
  }
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: [GOOGLE_SHEETS_SCOPE]
  });
  return google.sheets({ version: 'v4', auth });
};

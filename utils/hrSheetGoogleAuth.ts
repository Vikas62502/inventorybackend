import fs from 'fs';
import path from 'path';
import { google, sheets_v4 } from 'googleapis';

/** Live Social Media spreadsheet (Jaipur / Ajmer). Old id 18zqPIpa… is disabled. */
export const DEFAULT_SPREADSHEET_ID = '1XOBfLVkqJ6NHe8s1t-FAZXhwWUFwGfp3WwSYdHBriqk';

/** Discover / sync only these tab titles (exact, or first word Jaipur/Ajmer). */
export const SOCIAL_SHEET_ALLOWED_TABS = ['Jaipur', 'Ajmer'] as const;

export const isAllowedSocialSheetTab = (title: unknown): boolean => {
  const key = String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (!key) return false;
  return (
    key === 'jaipur' ||
    key === 'ajmer' ||
    key.startsWith('jaipur ') ||
    key.startsWith('ajmer ')
  );
};

export const filterAllowedSocialSheetTabs = (titles: unknown[]): string[] =>
  titles.map((t) => String(t || '').trim()).filter((t) => t && isAllowedSocialSheetTab(t));

/** Local/server key file (gitignored). Prefer env override. */
export const DEFAULT_GOOGLE_SHEETS_CREDENTIALS_PATH = path.join(
  process.cwd(),
  'secrets',
  'google-sheets-service-account.json'
);

/** Read + write (DB → Sheet write-back needs Editor + this scope). */
export const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/** 503 — only when GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_APPLICATION_CREDENTIALS are both empty (and no key file). */
export class GoogleSheetsNotConfiguredError extends Error {
  code = 'GOOGLE_SHEETS_CREDENTIALS_MISSING';
  status = 503;

  constructor(
    message = 'Google Sheets credentials missing: set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS, or place the key at secrets/google-sheets-service-account.json'
  ) {
    super(message);
    this.name = 'GoogleSheetsNotConfiguredError';
  }
}

/** 500 — env is set but the key cannot be used (bad JSON, missing fields, key file not found). */
export class GoogleSheetsCredentialsInvalidError extends Error {
  code = 'GOOGLE_SHEETS_CREDENTIALS_INVALID';
  status = 500;

  constructor(message: string) {
    super(message);
    this.name = 'GoogleSheetsCredentialsInvalidError';
  }
}

export const isGoogleSheetsCredentialsError = (
  error: unknown
): error is GoogleSheetsNotConfiguredError | GoogleSheetsCredentialsInvalidError =>
  error instanceof GoogleSheetsNotConfiguredError || error instanceof GoogleSheetsCredentialsInvalidError;

let serviceAccountEmail: string | null = null;

/** client_email of the loaded key (share the spreadsheet with it as Editor). */
export const getGoogleServiceAccountEmail = (): string | null => serviceAccountEmail;

/**
 * Map any Discover / Sync failure to `{ status, code, message }`.
 *   missing env → 503 GOOGLE_SHEETS_CREDENTIALS_MISSING
 *   bad key     → 500 GOOGLE_SHEETS_CREDENTIALS_INVALID
 *   Google 403  → 500 GOOGLE_SHEETS_PERMISSION_DENIED (Google's message + share hint)
 *   other Google / JWT errors → 500 GOOGLE_SHEETS_API_ERROR (Google's message)
 */
export const googleSheetsErrorResponse = (
  error: unknown,
  fallbackMessage: string
): { status: number; code: string; message: string } => {
  if (isGoogleSheetsCredentialsError(error)) {
    return { status: error.status, code: error.code, message: error.message };
  }
  const e = (error || {}) as {
    message?: string;
    code?: unknown;
    status?: unknown;
    response?: { status?: number; data?: { error?: { message?: string } | string; error_description?: string } };
  };
  const data = e.response?.data;
  const googleMessage =
    (typeof data?.error === 'object' && data.error?.message) ||
    data?.error_description ||
    (typeof data?.error === 'string' ? data.error : undefined) ||
    e.message ||
    fallbackMessage;
  const httpStatus = Number(e.response?.status ?? e.status ?? e.code);
  if (httpStatus === 403) {
    const email = getGoogleServiceAccountEmail();
    const hint = email ? ` — share the spreadsheet with ${email} as Editor` : '';
    return { status: 500, code: 'GOOGLE_SHEETS_PERMISSION_DENIED', message: `${googleMessage}${hint}` };
  }
  return { status: 500, code: 'GOOGLE_SHEETS_API_ERROR', message: String(googleMessage) };
};

/** dotenv may turn `\n` inside a quoted value into real newlines — re-escape before JSON.parse. */
const parseServiceAccountJson = (raw: string): Record<string, unknown> => {
  const text = raw.trim();
  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(text.replace(/\r?\n/g, '\\n'));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new GoogleSheetsCredentialsInvalidError(
        `GOOGLE_SERVICE_ACCOUNT_JSON is set but is not valid JSON (${detail})`
      );
    }
  }
};

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

const assertServiceAccountFields = (credentials: Record<string, unknown>, source: string): void => {
  const missing = ['client_email', 'private_key'].filter(
    (key) => typeof credentials[key] !== 'string' || !String(credentials[key]).trim()
  );
  if (missing.length) {
    throw new GoogleSheetsCredentialsInvalidError(
      `${source} is not a service account key (missing ${missing.join(', ')})`
    );
  }
  serviceAccountEmail = String(credentials.client_email);
};

export const getSheetsClient = (): sheets_v4.Sheets => {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json && json.trim()) {
    const credentials = parseServiceAccountJson(json);
    assertServiceAccountFields(credentials, 'GOOGLE_SERVICE_ACCOUNT_JSON');
    if (typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [GOOGLE_SHEETS_SCOPE]
    });
    return google.sheets({ version: 'v4', auth });
  }

  const credentialsPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (credentialsPath && !fs.existsSync(credentialsPath)) {
    throw new GoogleSheetsCredentialsInvalidError(
      `GOOGLE_APPLICATION_CREDENTIALS is set but the file does not exist: ${credentialsPath}`
    );
  }
  const keyFile = resolveGoogleSheetsKeyFile();
  if (!keyFile) {
    throw new GoogleSheetsNotConfiguredError();
  }
  try {
    assertServiceAccountFields(parseServiceAccountJson(fs.readFileSync(keyFile, 'utf8')), keyFile);
  } catch (error) {
    if (error instanceof GoogleSheetsCredentialsInvalidError) {
      throw new GoogleSheetsCredentialsInvalidError(error.message.replace('GOOGLE_SERVICE_ACCOUNT_JSON', keyFile));
    }
    throw error;
  }
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: [GOOGLE_SHEETS_SCOPE]
  });
  return google.sheets({ version: 'v4', auth });
};

import { resolveBrowsableMediaUrlMap } from './s3Service';

/** Final confirmation multipart keys (§M / HANDOFF §20). */
export const FINAL_CONFIRMATION_DOCUMENT_FIELDS = [
  'customerFinalBillFile',
  'panelWarrantyFile',
  'inverterWarrantyFile',
  'workCompletionWarrantyFile'
] as const;

export type FinalConfirmationDocumentField = (typeof FINAL_CONFIRMATION_DOCUMENT_FIELDS)[number];

export const isFinalConfirmationDocumentField = (
  field: string
): field is FinalConfirmationDocumentField =>
  (FINAL_CONFIRMATION_DOCUMENT_FIELDS as readonly string[]).includes(field);

export const FINAL_CONFIRMATION_DOCUMENT_URL_KEYS = FINAL_CONFIRMATION_DOCUMENT_FIELDS.map(
  (field) => `${field}Url` as const
);

const toSnakeCase = (field: string): string =>
  field.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);

const fileNameFromUrl = (value: string | null): string | null => {
  if (!value) return null;
  const clean = value.split('?')[0];
  const base = clean.split('/').pop() || null;
  return base || null;
};

const plainDocuments = (
  documents: Record<string, unknown> | null | undefined
): Record<string, unknown> => {
  if (!documents) return {};
  if (typeof (documents as { toJSON?: () => Record<string, unknown> }).toJSON === 'function') {
    return (documents as { toJSON: () => Record<string, unknown> }).toJSON();
  }
  return documents;
};

const collectFinalConfirmationRawUrls = (src: Record<string, unknown>): string[] => {
  const urls: string[] = [];
  for (const field of FINAL_CONFIRMATION_DOCUMENT_FIELDS) {
    const raw = src[field];
    if (typeof raw === 'string' && raw.trim()) urls.push(raw.trim());
  }
  return urls;
};

const applyFinalConfirmationApiFields = (
  src: Record<string, unknown>,
  urlMap: Map<string, string | null>
): Record<string, string | null> => {
  const out: Record<string, string | null> = {};
  for (const field of FINAL_CONFIRMATION_DOCUMENT_FIELDS) {
    const raw = src[field];
    let url: string | null = null;
    if (typeof raw === 'string' && raw.trim()) {
      const trimmed = raw.trim();
      url = urlMap.get(trimmed) || trimmed;
    }
    const name = fileNameFromUrl(url);
    const snake = toSnakeCase(field);
    out[field] = url;
    out[`${field}Url`] = url;
    out[`${field}Name`] = name;
    out[snake] = url;
    out[`${snake}_url`] = url;
    out[`${snake}_name`] = name;
  }
  return out;
};

/**
 * Resolve the four final-confirmation slots to browsable URLs + name aliases
 * for POST response and GET list/detail / Baldev queue (§M preview).
 */
export const buildFinalConfirmationApiFields = async (
  documents: Record<string, unknown> | null | undefined
): Promise<Record<string, string | null>> => {
  const src = plainDocuments(documents);
  const urlMap = await resolveBrowsableMediaUrlMap(collectFinalConfirmationRawUrls(src));
  return applyFinalConfirmationApiFields(src, urlMap);
};

/** Same fields as `buildFinalConfirmationApiFields`, one unique-presign pass for a list. */
export const buildFinalConfirmationApiFieldsMany = async (
  documentsRows: Array<{ quotationId?: unknown } & Record<string, unknown>>
): Promise<Map<string, Record<string, string | null>>> => {
  const plains = documentsRows.map((row) => ({
    id: String(row.quotationId ?? ''),
    src: plainDocuments(row)
  }));
  const urlMap = await resolveBrowsableMediaUrlMap(
    plains.flatMap(({ src }) => collectFinalConfirmationRawUrls(src))
  );
  const out = new Map<string, Record<string, string | null>>();
  for (const { id, src } of plains) {
    if (!id) continue;
    out.set(id, applyFinalConfirmationApiFields(src, urlMap));
  }
  return out;
};

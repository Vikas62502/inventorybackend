/**
 * Meta form email + Q&A on calling_leads (§BW).
 * Sheet columns → email / formAnswers / customerNote; API echo with rawPayload fallback.
 */

export type FormAnswer = { question: string; answer: string };

/** Known Meta form question columns (normalized header → display label). */
const FORM_ANSWER_FIELDS: Array<{ keys: string[]; question: string }> = [
  {
    keys: [
      'whatisyouraveragemonthlyelectricitybill',
      'averagemonthlyelectricitybill',
      'averagemonthlyelectricitybillinr'
    ],
    question: 'Average monthly electricity bill'
  },
  {
    keys: [
      'whenareyouplanningtoinstallsolar',
      'whenplanningtoinstallsolar',
      'whenareyouplanningtoinstall'
    ],
    question: 'When planning to install solar'
  },
  {
    keys: ['doyouhaveanopenrooftop', 'openrooftop', 'doyouhaveopenrooftop'],
    question: 'Open rooftop'
  }
];

const normalizeHeader = (h: unknown): string =>
  String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Humanize Meta answer tokens: `_-_` → ` - `, `_` → space. */
export const humanizeFormAnswer = (value: unknown): string => {
  let s = String(value ?? '').trim();
  if (!s) return '';
  s = s.replace(/_-+_/g, ' - ').replace(/_+/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
};

const pickFromRaw = (raw: Record<string, unknown>, ...aliases: string[]): string => {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    const direct = raw[key] ?? raw[alias];
    if (direct !== undefined && direct !== null && String(direct).trim()) {
      return String(direct).trim();
    }
  }
  // Also scan original-looking keys in case raw kept sheet headers
  for (const [k, v] of Object.entries(raw)) {
    if (aliases.some((a) => normalizeHeader(a) === normalizeHeader(k)) && String(v ?? '').trim()) {
      return String(v).trim();
    }
  }
  return '';
};

export const extractFormAnswersFromRaw = (
  raw: Record<string, unknown> | null | undefined
): { email: string; formAnswers: FormAnswer[] } => {
  if (!raw || typeof raw !== 'object') return { email: '', formAnswers: [] };

  const email = pickFromRaw(raw, 'email', 'email_address', 'emailaddress', 'e-mail');
  const formAnswers: FormAnswer[] = [];
  for (const field of FORM_ANSWER_FIELDS) {
    const answer = humanizeFormAnswer(pickFromRaw(raw, ...field.keys));
    if (!answer) continue;
    formAnswers.push({ question: field.question, answer });
  }
  return { email, formAnswers };
};

/** customer_note: Email: … · Average monthly electricity bill: … · … */
export const buildFormCustomerNote = (
  email: string,
  formAnswers: FormAnswer[],
  fallbackParts: string[] = []
): string => {
  const parts: string[] = [];
  if (email) parts.push(`Email: ${email}`);
  for (const row of formAnswers) {
    if (row.answer) parts.push(`${row.question}: ${row.answer}`);
  }
  if (parts.length) return parts.join(' · ');
  return fallbackParts.filter(Boolean).join(' · ');
};

export type LeadFormSource = {
  email?: string | null;
  formAnswers?: FormAnswer[] | unknown;
  customerNote?: string | null;
  rawPayload?: Record<string, unknown> | object | null;
};

const asFormAnswers = (value: unknown): FormAnswer[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const question = String((row as any).question ?? '').trim();
      const answer = humanizeFormAnswer((row as any).answer);
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((row): row is FormAnswer => Boolean(row));
};

/**
 * API echo (camel + snake). Falls back to rawPayload when columns are empty
 * so leads imported before the migration still show email + Q&A after deploy.
 */
export const buildLeadFormApiFields = (lead: LeadFormSource | null | undefined): Record<string, unknown> => {
  if (!lead) return {};
  const raw = (lead.rawPayload || null) as Record<string, unknown> | null;
  const extracted = extractFormAnswersFromRaw(raw);
  const email = String(lead.email || '').trim() || extracted.email || null;
  const storedAnswers = asFormAnswers(lead.formAnswers);
  const formAnswers = storedAnswers.length ? storedAnswers : extracted.formAnswers.length ? extracted.formAnswers : [];
  const customerNote =
    String(lead.customerNote || '').trim() ||
    buildFormCustomerNote(email || '', formAnswers) ||
    null;

  return {
    email,
    formAnswers,
    form_answers: formAnswers,
    customerNote,
    customer_note: customerNote,
    raw,
    raw_json: raw
  };
};

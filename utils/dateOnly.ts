const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})(?:$|T00:00:00(?:\.0+)?Z$)/;
const DMY_RE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

const istYmd = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const isRealDay = (y: number, m: number, d: number): boolean => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/**
 * Calendar day as `YYYY-MM-DD` without a UTC day shift.
 *   "2026-09-18" / "2026-09-18T00:00:00.000Z" → kept as written
 *   "18/09/2026" (DD/MM/YYYY)                 → 2026-09-18
 *   other timestamps / Date                    → the day in India (Asia/Kolkata)
 * Empty → null; unparseable → undefined.
 */
export const toDateOnly = (raw: unknown): string | null | undefined => {
  if (raw === undefined || raw === null) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? undefined : istYmd.format(raw);
  const s = String(raw).trim();
  if (!s) return null;
  const ymd = s.match(YMD_RE);
  if (ymd) {
    return isRealDay(Number(ymd[1]), Number(ymd[2]), Number(ymd[3])) ? `${ymd[1]}-${ymd[2]}-${ymd[3]}` : undefined;
  }
  const dmy = s.match(DMY_RE);
  if (dmy) {
    const [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
    if (!isRealDay(y, m, d)) return undefined;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? undefined : istYmd.format(parsed);
};

/** Response helper: `YYYY-MM-DD` or null. */
export const toDateOnlyOrNull = (raw: unknown): string | null => toDateOnly(raw) ?? null;

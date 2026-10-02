/**
 * §BH — structure type "Mono rail" (alias "Mono Rail"). Priced the same as GI Structure.
 */

export const MONO_REAL_STRUCTURE = 'Mono rail';
export const GI_STRUCTURE = 'GI Structure';

const key = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

export const isMonoRealStructure = (value: unknown): boolean => {
  const k = key(value);
  return k === 'monoreal' || k === 'monorail';
};

/** Aliases map to the canonical label; everything else is returned verbatim. */
export const normalizeStructureType = <T>(value: T): T | string =>
  isMonoRealStructure(value) ? MONO_REAL_STRUCTURE : value;

type StructurePriceRow = { type?: unknown; size?: unknown; price?: unknown; [k: string]: unknown };

/**
 * Pricing `structures[]`: every GI size without a Mono rail row gets one at the GI price.
 * Existing Mono rail rows (aliases normalized) are kept as saved.
 */
export const withMonoRealPricingRows = (rows: unknown): unknown => {
  if (!Array.isArray(rows)) return rows;
  const out = rows.map((row) =>
    row && typeof row === 'object' && isMonoRealStructure((row as StructurePriceRow).type)
      ? { ...(row as StructurePriceRow), type: MONO_REAL_STRUCTURE }
      : row
  ) as StructurePriceRow[];
  const sizeKey = (size: unknown) => key(size);
  const monoSizes = new Set(
    out.filter((r) => r && r.type === MONO_REAL_STRUCTURE).map((r) => sizeKey(r.size))
  );
  for (const row of rows as StructurePriceRow[]) {
    if (!row || typeof row !== 'object') continue;
    if (String(row.type ?? '').trim() !== GI_STRUCTURE) continue;
    if (monoSizes.has(sizeKey(row.size))) continue;
    out.push({ ...row, type: MONO_REAL_STRUCTURE });
    monoSizes.add(sizeKey(row.size));
  }
  return out;
};

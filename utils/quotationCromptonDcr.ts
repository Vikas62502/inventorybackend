/**
 * Crompton DCR set (1-Phase) — Aug 2026 (§27).
 * See BACKEND_CROMPTON_DCR_SET.md
 *
 * Package identity (do not coerce to Premier Energies Topcon):
 *   panelType === "Crompton set" (package marker — required for set price)
 *   panelBrand / dcrPanelBrand === "Premier Energy"
 *   inverterBrand === "Crompton", inverterSize === systemSize (3kW set → 3kW, 5kW set → 5kW);
 *   legacy files may still carry 3.6kW — persisted / echoed as sent, priced the same.
 *   pdfPanelRangeKey === "premier_energy_600_610"
 *   prices: 3kW → 210000, 5kW → 295000 (keyed by systemSize + 1-Phase, never by inverterSize)
 */

export const CROMPTON_DCR_SET_NAME = 'Crompton set';
export const CROMPTON_PANEL_BRAND = 'Premier Energy';
export const CROMPTON_INVERTER_BRAND = 'Crompton';
export const CROMPTON_LEGACY_INVERTER_SIZE = '3.6kW';
export const CROMPTON_INVERTER_SIZES = ['3kW', '5kW'] as const;
export const CROMPTON_PDF_PANEL_RANGE_KEY = 'premier_energy_600_610';
export const CROMPTON_ACDB_DCDB_1_PHASE = 'Crompton (1-Phase)';

/** Package inverter for a set size (3kW → 3kW, 5kW → 5kW); null for other sizes. */
export const cromptonInverterSizeFor = (systemSize: unknown): string | null => {
  const size = String(systemSize ?? '').trim();
  return (CROMPTON_INVERTER_SIZES as readonly string[]).includes(size) ? size : null;
};

export const DCR_CROMPTON_SET_PRICES = [
  {
    systemSize: '3kW',
    phase: '1-Phase' as const,
    inverterSize: '3kW',
    panelType: CROMPTON_DCR_SET_NAME,
    price: 210000,
    notes: 'Premier Energy 600W–610W panels; Crompton 3kW inverter + ACDB/DCDB'
  },
  {
    systemSize: '5kW',
    phase: '1-Phase' as const,
    inverterSize: '5kW',
    panelType: CROMPTON_DCR_SET_NAME,
    price: 295000,
    notes: 'Premier Energy 600W–610W panels; Crompton 5kW inverter + ACDB/DCDB'
  }
] as const;

/** Browse / pricing-tables presets use column brand "Crompton set". */
export const DCR_CROMPTON_SYSTEM_CONFIGS = [
  {
    systemType: 'dcr' as const,
    systemSize: '3kW',
    phase: '1-Phase' as const,
    panelBrand: CROMPTON_DCR_SET_NAME,
    panelSize: '610W',
    inverterBrand: CROMPTON_INVERTER_BRAND,
    inverterSize: '3kW',
    inverterType: 'String Inverter',
    structureType: 'GI Structure',
    structureSize: '3kW',
    meterBrand: 'L&T',
    acCableBrand: 'Polycab',
    acCableSize: 'As per Set',
    dcCableBrand: 'Polycab',
    dcCableSize: 'As per Set',
    acdb: CROMPTON_ACDB_DCDB_1_PHASE,
    dcdb: CROMPTON_ACDB_DCDB_1_PHASE,
    centralSubsidy: 78000
  },
  {
    systemType: 'dcr' as const,
    systemSize: '5kW',
    phase: '1-Phase' as const,
    panelBrand: CROMPTON_DCR_SET_NAME,
    panelSize: '610W',
    inverterBrand: CROMPTON_INVERTER_BRAND,
    inverterSize: '5kW',
    inverterType: 'String Inverter',
    structureType: 'GI Structure',
    structureSize: '5kW',
    meterBrand: 'L&T',
    acCableBrand: 'Polycab',
    acCableSize: 'As per Set',
    dcCableBrand: 'Polycab',
    dcCableSize: 'As per Set',
    acdb: CROMPTON_ACDB_DCDB_1_PHASE,
    dcdb: CROMPTON_ACDB_DCDB_1_PHASE,
    centralSubsidy: 78000
  }
] as const;

const norm = (v?: string | null): string =>
  String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/** True when quotation products are the Crompton DCR package. */
export const isCromptonDcrSet = (
  products: Record<string, unknown> | null | undefined
): boolean => {
  if (!products) return false;
  if (String(products.systemType || '').trim().toLowerCase() === 'non-dcr') return false;
  const brand = norm(
    String(products.panelBrand ?? products.panel_brand ?? products.dcrPanelBrand ?? '')
  );
  const panelType = norm(String(products.panelType ?? products.panel_type ?? ''));
  const range = norm(String(products.pdfPanelRangeKey ?? products.pdf_panel_range_key ?? ''));
  const inverter = norm(String(products.inverterBrand ?? ''));
  return (
    panelType === 'crompton set' ||
    brand === 'crompton set' ||
    range === CROMPTON_PDF_PANEL_RANGE_KEY ||
    (brand === 'premier energy' && inverter === 'crompton')
  );
};

/** Relaxed catalog validation for Crompton DCR package — returns error strings (empty = OK). */
export const validateCromptonDcrProductSelection = (
  products: Record<string, unknown>,
  _catalog?: unknown
): string[] => {
  const errors: string[] = [];
  if (!isCromptonDcrSet(products)) return errors;

  const phase = norm(String(products.phase ?? ''));
  if (phase && phase !== '1-phase') {
    errors.push('Crompton set is 1-Phase only');
  }

  const invBrand = String(products.inverterBrand ?? '').trim();
  if (invBrand && norm(invBrand) !== 'crompton') {
    errors.push(`Crompton set expects inverterBrand "${CROMPTON_INVERTER_BRAND}"`);
  }

  return errors;
};

export const getCromptonDcrSetPrice = (
  systemSize: string,
  phase?: string
): number | null => {
  if (phase && norm(phase) !== '1-phase') return null;
  const size = String(systemSize || '').trim();
  const row = DCR_CROMPTON_SET_PRICES.find((r) => r.systemSize === size);
  return row ? row.price : null;
};

/**
 * Set-price when panelType is Crompton set.
 * Do NOT price plain Premier Energy / Premier Energies under this table.
 * Keyed by systemSize + 1-Phase only — inverterSize (3kW / 5kW / legacy 3.6kW) is ignored.
 */
export const resolveDcrSetPriceForProducts = (
  products: Record<string, unknown> | null | undefined
): number | null => {
  if (!products || !isCromptonDcrSet(products)) return null;
  const size = String(
    products.systemSize ?? products.structureSize ?? products.systemKw ?? ''
  ).trim();
  return getCromptonDcrSetPrice(size, String(products.phase ?? '') || undefined);
};

/** Keep Premier Energy brand + Crompton set marker — never remap to Premier Energies. */
export const preserveCromptonSetIdentity = (
  products: Record<string, unknown> | null | undefined
): Record<string, unknown> => {
  if (!products || !isCromptonDcrSet(products)) return products || {};
  const rangeKey =
    String(products.pdfPanelRangeKey || products.pdf_panel_range_key || '').trim() ||
    CROMPTON_PDF_PANEL_RANGE_KEY;
  const inverterSize =
    String(products.inverterSize || '').trim() ||
    cromptonInverterSizeFor(products.systemSize ?? products.structureSize);
  return {
    ...products,
    panelBrand: CROMPTON_PANEL_BRAND,
    panel_brand: CROMPTON_PANEL_BRAND,
    dcrPanelBrand: CROMPTON_PANEL_BRAND,
    dcr_panel_brand: CROMPTON_PANEL_BRAND,
    panelType: CROMPTON_DCR_SET_NAME,
    panel_type: CROMPTON_DCR_SET_NAME,
    inverterBrand: String(products.inverterBrand || '').trim() || CROMPTON_INVERTER_BRAND,
    ...(inverterSize ? { inverterSize } : {}),
    acdb: String(products.acdb || '').trim() || CROMPTON_ACDB_DCDB_1_PHASE,
    dcdb: String(products.dcdb || '').trim() || CROMPTON_ACDB_DCDB_1_PHASE,
    pdfPanelRangeKey: rangeKey,
    pdf_panel_range_key: rangeKey
  };
};

export const isAllowedCromptonPanelBrand = (brand: unknown): boolean => {
  const n = norm(String(brand || ''));
  return n === 'premier energy' || n === 'crompton set' || n === 'crompton';
};

export const isAllowedCromptonInverterBrand = (brand: unknown): boolean =>
  norm(String(brand || '')) === 'crompton';

export const isAllowedCromptonInverterSize = (size: unknown): boolean => {
  const n = norm(String(size || '')).replace(/\s/g, '').replace(/kw$/, '');
  return n === '3' || n === '5' || n === '3.6';
};

const isCromptonSetLabel = (value: unknown): boolean => norm(String(value ?? '')) === 'crompton set';
const isLegacyCromptonInverter = (value: unknown): boolean =>
  norm(String(value ?? '')).replace(/\s/g, '') === '3.6kw';

/**
 * Pricing-tables read fix: stored Crompton set dcr rows / presets still on the old fixed 3.6kW
 * inverter → inverter matching the set (3kW / 5kW). Other values are left as saved.
 */
export const alignCromptonPricingRows = <T>(rows: T[], brandKey: 'panelType' | 'panelBrand'): T[] =>
  rows.map((row) => {
    const r = row as Record<string, unknown>;
    if (!isCromptonSetLabel(r?.[brandKey]) || !isLegacyCromptonInverter(r.inverterSize)) return row;
    const size = cromptonInverterSizeFor(r.systemSize);
    if (!size) return row;
    const next: Record<string, unknown> = { ...r, inverterSize: size };
    if (typeof r.notes === 'string') next.notes = r.notes.replace(/3\.6\s*kW/i, size);
    return next as T;
  });

/** Inverter component list: legacy Crompton 3.6kW price row → 3kW (unless a 3kW row already exists). */
export const alignCromptonInverterComponents = <T>(rows: T[]): T[] => {
  const isCrompton = (r: Record<string, unknown>) => norm(String(r?.brand ?? '')) === 'crompton';
  const has3kW = rows.some((row) => {
    const r = row as Record<string, unknown>;
    return isCrompton(r) && String(r.size ?? '').trim() === '3kW';
  });
  if (has3kW) return rows;
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return isCrompton(r) && isLegacyCromptonInverter(r.size) ? ({ ...r, size: '3kW' } as T) : row;
  });
};

export const isAllowedCromptonAcdbDcdb = (label: unknown): boolean => {
  const n = norm(String(label || ''));
  return n.includes('crompton');
};

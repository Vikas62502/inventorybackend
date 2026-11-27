/**
 * Admin Catalog → Price set (Panel / Inverter / Structure / Cable / Meter / Accessories).
 * Stored in system_config.configKey = 'catalog_component_pricing'.
 */

export const CATALOG_COMPONENT_KEYS = [
  'panel',
  'inverter',
  'structure',
  'cable',
  'meter',
  'accessories'
] as const;

export type CatalogComponentKey = (typeof CATALOG_COMPONENT_KEYS)[number];

export type CatalogComponentPricingPayload = {
  version: 1;
  categories: Record<CatalogComponentKey, { brands: Array<{ name: string; rows: Array<Record<string, unknown>> }> }>;
};

export function emptyCatalogComponentPricing(): CatalogComponentPricingPayload {
  const categories = {} as CatalogComponentPricingPayload['categories'];
  for (const key of CATALOG_COMPONENT_KEYS) {
    categories[key] = { brands: [] };
  }
  return { version: 1, categories };
}

function asNum(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function asStr(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

function normalizeRow(row: Record<string, unknown>, bucketName: string): Record<string, unknown> {
  const measurementRaw = String(row.measurement ?? '')
    .trim()
    .toLowerCase();
  let measurement: 'kg' | 'piece' | undefined;
  if (measurementRaw === 'piece' || measurementRaw === 'pcs' || measurementRaw === 'pc') {
    measurement = 'piece';
  } else if (measurementRaw === 'kg' || measurementRaw === 'kgs') {
    measurement = 'kg';
  } else if (row.perPiecePrice != null && row.perKgPrice == null && row.weightKg == null) {
    measurement = 'piece';
  } else if (row.perKgPrice != null || row.weightKg != null || row.quantity != null) {
    measurement = 'kg';
  }

  const contentRaw = String(row.contentType ?? row.content_type ?? '')
    .trim()
    .toLowerCase();
  let contentType: 'dcr' | 'nonDcr' | undefined;
  if (contentRaw === 'dcr') contentType = 'dcr';
  else if (
    contentRaw === 'nondcr' ||
    contentRaw === 'non-dcr' ||
    contentRaw === 'non dcr' ||
    contentRaw === 'non_dcr'
  ) {
    contentType = 'nonDcr';
  }

  return {
    id: asStr(row.id) || `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    brand: asStr(row.brand) || asStr(bucketName),
    contentType,
    watt: asNum(row.watt),
    perWattPrice: asNum(row.perWattPrice ?? row.per_watt_price),
    totalPrice: asNum(row.totalPrice ?? row.total_price),
    kw: asNum(row.kw),
    phases: asStr(row.phases),
    singleString: asStr(row.singleString ?? row.single_string),
    price: asNum(row.price),
    product: asStr(row.product) || asStr(row.spec),
    measurement,
    quantity: asNum(row.quantity ?? row.weightKg),
    perKgPrice: asNum(row.perKgPrice ?? row.per_kg_price),
    perPiecePrice: asNum(row.perPiecePrice ?? row.per_piece_price),
    weightKg: asNum(row.weightKg ?? row.weight_kg),
    mmThickness: asNum(row.mmThickness ?? row.mm ?? row.thicknessMm),
    perMeterPrice: asNum(row.perMeterPrice ?? row.per_meter_price ?? row.unitPrice ?? row.price),
    spec: asStr(row.spec),
    unitPrice: asNum(row.unitPrice ?? row.unit_price)
  };
}

/** Normalize unknown JSON into a complete Price set payload (empty categories if missing). */
export function normalizeCatalogComponentPricing(raw: unknown): CatalogComponentPricingPayload {
  const base = emptyCatalogComponentPricing();
  if (!raw || typeof raw !== 'object') return base;

  const categories =
    (raw as { categories?: unknown }).categories &&
    typeof (raw as { categories?: unknown }).categories === 'object'
      ? ((raw as { categories: Record<string, unknown> }).categories as Record<string, unknown>)
      : (raw as Record<string, unknown>);

  for (const key of CATALOG_COMPONENT_KEYS) {
    const bucket = categories[key] as { brands?: unknown } | undefined;
    const brands = Array.isArray(bucket?.brands) ? bucket!.brands : [];
    base.categories[key] = {
      brands: brands
        .filter((b: unknown) => b && typeof b === 'object' && String((b as { name?: unknown }).name || '').trim())
        .map((b: unknown) => {
          const brand = b as { name: unknown; rows?: unknown };
          const name = String(brand.name).trim();
          const rows = Array.isArray(brand.rows) ? brand.rows : [];
          return {
            name,
            rows: rows
              .filter((r: unknown) => r && typeof r === 'object')
              .map((r: unknown) => normalizeRow(r as Record<string, unknown>, name))
          };
        })
    };
  }

  return base;
}

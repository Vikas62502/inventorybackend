// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — Structure type "Mono Real" (§BH, Oct 2026)
 * =============================================================================
 *
 * Status: IMPLEMENTED in this repo. No new route.
 * Canonical label: "Mono Real". Alias "Mono Rail" (any case / spacing / hyphen) is stored as "Mono Real".
 *
 * Helper: utils/structureType.ts
 *   MONO_REAL_STRUCTURE, GI_STRUCTURE, isMonoRealStructure, normalizeStructureType,
 *   withMonoRealPricingRows
 *
 * -----------------------------------------------------------------------------
 * 1) Catalog — GET /api/quotations/product-catalog (and config product catalog)
 * -----------------------------------------------------------------------------
 *   utils/defaultProductCatalog.ts → DEFAULT_STRUCTURE_TYPES includes "Mono Real".
 *   normalizeProductCatalog merges defaults into the saved catalog, so it is ALWAYS present:
 */
const productCatalogStructures = {
  types: ['GI Structure', 'Aluminum Structure', 'MS Structure', 'Mono Real'],
  sizes: ['1kW', '2kW', '3kW', '5kW', '10kW', '15kW', '20kW']
};
/**
 * -----------------------------------------------------------------------------
 * 2) Validation — validateProductSelection (POST /api/quotations, PATCH …/products)
 * -----------------------------------------------------------------------------
 *   Mono Real / Mono Rail is accepted even if the saved catalog lists only GI
 *   (generic path in controllers/quotationController.ts + Tata DCR path in
 *   utils/quotationTataDcrValidation.ts). Never 400 "Invalid structure type" for it.
 *   Other catalog failures → 400 VAL_PRODUCT (not VAL_003), see §BF.
 *
 * -----------------------------------------------------------------------------
 * 3) Persist + GET echo
 * -----------------------------------------------------------------------------
 *   Create: structureType = normalizeStructureType(structureType ?? structure_type).
 *   PATCH / history restore: pickQuotationProductPersistPayload normalizes the same way.
 *   Stored verbatim otherwise — never rewritten to "GI Structure".
 *   GET products (utils/quotationApiJson.ts):
 */
const productsEcho = {
  structureType: 'Mono Real',
  structure_type: 'Mono Real',
  structureSize: '5kW',
  structurePrice: 40000, // also structure_price
  structure_price: 40000
};
/**
 * -----------------------------------------------------------------------------
 * 4) Pricing tables — structures[] same INR as GI
 * -----------------------------------------------------------------------------
 *   BACKEND_PRICING_TABLES_SEED.json now has Mono Real rows:
 */
const monoRealPricingRows = [
  { type: 'Mono Real', size: '1kW', price: 8000 },
  { type: 'Mono Real', size: '3kW', price: 24000 },
  { type: 'Mono Real', size: '5kW', price: 40000 },
  { type: 'Mono Real', size: '10kW', price: 80000 }
];
/**
 *   GET pricing tables (controllers/configController.ts → normalizePricingTables):
 *   withMonoRealPricingRows() adds a Mono Real row at the GI price for every GI size that
 *   has no Mono Real row (covers Admin-saved tables without Mono Real). Saved Mono Real rows win.
 *   Agent selling-price lookup: no "Mono Real" product → falls back to the "GI Structure" product.
 *   Missing row never 400s.
 *
 * QA:
 *   1. Catalog GET → structures.types includes "Mono Real".
 *   2. Create / revise with structureType "Mono Real" (catalog saved with GI only) → 200.
 *   3. structureType "Mono Rail" → GET returns "Mono Real".
 *   4. Pricing GET → Mono Real 5kW = 40000 (same as GI).
 */

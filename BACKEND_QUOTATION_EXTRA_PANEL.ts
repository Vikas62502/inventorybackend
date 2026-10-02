// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — PDF range checkbox allows +1 extra panel (§BI, Oct 2026)
 * =============================================================================
 *
 * Status: VERIFIED — this backend already complies; no logic change was needed.
 * No new field or route. The PDF range key is the flag.
 *
 * Frontend (shipped): Dealer Panel Quantity is capped to the package (nominal kW + 400W).
 *   Adani 620W on a 5kW / 5.4kW package → 8 panels (4,960W).
 *   Checking a PDF range (540–580 / 610–625 / 600–630) allows ONE extra panel → 9.
 *   Uncheck clamps back to 8 (client-side).
 *
 * Request (POST /api/quotations → products, PATCH /api/quotations/:id/products → products):
 */
const products = {
  panelBrand: 'Adani',
  panelSize: '620W',
  panelQuantity: 9,
  pdfPanelRangeKey: 'adani_610_625_bifacial_topcon',
  pdfUsePanelSizeRange: true
};
/**
 * Backend behaviour (checked Oct 2026):
 *   - Zod: panelQuantity is int ≥ 0; refineProductsPanelQuantity is skipped when any range key
 *     (pdfPanelRangeKey / pdfDcrPanelRangeKey / pdfNonDcrPanelRangeKey) is set.
 *   - validateProductSelection: panel-size catalog check skipped when a range key is active.
 *     There is NO DC-watt cap server-side. If one is ever added, with a range key set use:
 *       maxW = systemKw × 1000 + 400 + panelW      // 5kW + 620W → 9 panels (5,580W)
 *   - Persist: panelQuantity saved as sent (create + pickQuotationProductPersistPayload on PATCH).
 *     Never rewritten to 8 or 0 because a range checkbox is on.
 *   - GET: echoes panelQuantity / panel_quantity and pdfPanelRangeKey verbatim. Quantity is never
 *     recomputed on GET. quotations.system_kw (display only) becomes 5.58.
 *   - Price / subsidy: taken from the request + package set-price (keyed by system size, not
 *     panel count) — the extra panel changes neither.
 *   - Catalog failures → 400 VAL_PRODUCT (not VAL_003), see §BF.
 *
 * QA:
 *   1. Adani 620W, 5kW package, range unchecked → save 8 → GET 8.
 *   2. Check 610–625 range → 9 → save 200 → refresh → 9 + range key.
 *   3. Subtotal / subsidy unchanged between 1 and 2.
 */

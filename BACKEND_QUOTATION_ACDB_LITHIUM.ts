// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — Quotation ACDB/DCDB "As per the set" (§BF) + lithium battery (§BG)
 * =============================================================================
 *
 * Status: IMPLEMENTED in this repo (Sep 2026).
 *
 * -----------------------------------------------------------------------------
 * §BF — ACDB / DCDB "As per the set"
 * -----------------------------------------------------------------------------
 *
 * Live bug: Tata DCR package save / revise → 400 "Invalid product selection"
 *   details: "Invalid ACDB option: As per the set"
 * Cause: utils/quotationTataDcrValidation.ts checked acdb/dcdb strictly against the catalog
 *   (the generic validateProductSelection path already allowed the placeholder).
 *
 * Fix:
 *   - acdb / dcdb equal to "As per the set" / "As per Set" (case / spacing-insensitive,
 *     utils/productDisplayValues.ts → isAsPerTheSet) are valid on every path:
 *     generic, Tata DCR package, Crompton DCR set (no acdb check there).
 *   - Persisted as sent; GET echoes the same string.
 *   - Catalog failures now return code VAL_PRODUCT (was VAL_003, which the SPA also shows
 *     for "Final amount is required"):
 *
 *   400 {
 *     "success": false,
 *     "error": {
 *       "code": "VAL_PRODUCT",
 *       "message": "Invalid product selection",
 *       "details": [{ "message": "Invalid ACDB option: Foo" }]
 *     }
 *   }
 *
 *   Applies to POST /api/quotations and PATCH /api/quotations/:id/products.
 *   Zod body errors are unchanged (VAL_001).
 *
 * -----------------------------------------------------------------------------
 * §BG — Include lithium battery
 * -----------------------------------------------------------------------------
 *
 * Column (quotation_products, camelCase like the rest of the table):
 *   ALTER TABLE quotation_products
 *     ADD COLUMN "includeLithiumBattery" BOOLEAN NOT NULL DEFAULT FALSE;
 *   Backfill once (first add only): TRUE where batteryCapacity is set or batteryPrice > 0.
 *   Migration: 20260930120000-add-include-lithium-battery-to-quotation-products.js
 *   (also ensured at boot by config/sequelizeBootstrap.ts → ensureIncludeLithiumBatteryColumn).
 *   hybridInverter / batteryCapacity / batteryPrice columns already existed.
 *
 * Request (POST /api/quotations → products, PATCH /api/quotations/:id/products → products):
 */
const requestProducts = {
  includeLithiumBattery: true, // or "true"; snake include_lithium_battery accepted
  batteryCapacity: '100kWh', //   battery_capacity
  hybridInverter: 'Vsole', //     hybrid_inverter
  batteryPrice: 2006000 //        battery_price
};
/**
 * Rules:
 *   - POST: flag omitted → inferred TRUE when batteryCapacity or batteryPrice > 0 is sent.
 *   - PATCH: flag written only when the key is sent; omitted keeps the stored value.
 *   - Battery fields are stored as sent (unticking does not clear them server-side).
 *
 * GET (by-id, lists, workflow payloads) echoes on `products`:
 */
const responseProducts = {
  includeLithiumBattery: true,
  include_lithium_battery: true,
  batteryCapacity: '100kWh',
  battery_capacity: '100kWh',
  hybridInverter: 'Vsole',
  hybrid_inverter: 'Vsole',
  batteryPrice: 2006000,
  battery_price: 2006000
};
/**
 * Code:
 *   - utils/quotationTataDcrValidation.ts — acdb/dcdb placeholder
 *   - controllers/quotationController.ts — VAL_PRODUCT; create persists includeLithiumBattery
 *   - validations/quotationValidations.ts — Zod accepts flag + snake aliases
 *   - utils/quotationProductPdfDisplay.ts — pickQuotationProductPersistPayload (PATCH / history restore)
 *   - utils/quotationApiJson.ts — lithiumBatteryApiFields
 *   - controllers/workflowController.ts — workflow product echo
 *   - models/QuotationProduct.ts
 *
 * QA:
 *   1. Tata package, ACDB + DCDB "As per the set", final amount filled → Save / Revise 200;
 *      reopen → both still "As per the set".
 *   2. ACDB "Foo" → 400 VAL_PRODUCT (not VAL_003).
 *   3. Tick lithium battery, 100kWh / Vsole / 2006000 → save → refresh → ticked + values.
 *   4. PATCH products without includeLithiumBattery → stays ticked. Untick → false.
 */

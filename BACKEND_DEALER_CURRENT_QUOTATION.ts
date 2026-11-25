// @ts-nocheck
/**
 * =============================================================================
 * BACKEND — Dealer create/revise → is_current + restore-current
 * =============================================================================
 * Nov 24–25 2026 · HANDOFF §92 · REQUIRED §CK  (FE notes §78 / their §CF)
 * Related: BACKEND_QUOTATION_SYSTEM_HISTORY.ts · HANDOFF §23
 *
 * Admin list must show one Current row per customer; History can Restore.
 *
 * Create / revise (additional quotation):
 *   POST /quotations  with allowAdditional / sourceQuotationId
 *   → new row isCurrent=true
 *   → markQuotationAsCurrentForCustomer(customerId, newId)
 *      demotes siblings isCurrent=false (rows kept)
 *
 * Restore:
 *   POST /quotations/:id/restore-current
 *   POST /quotations/:id/set-current
 *   PATCH /quotations/:id  { isCurrent: true }
 *   → markQuotationAsCurrentForCustomer
 *
 * GET list/detail echo:
 *   isCurrent / is_current
 *   sourceQuotationId / source_quotation_id
 *
 * Column: quotations."isCurrent" BOOLEAN
 *   migration: 20260730140000-quotation-is-current.js
 *
 * Checklist
 * [x] Create sets isCurrent + demotes siblings
 * [x] restore-current / set-current / PATCH isCurrent
 * [x] GET echoes isCurrent / is_current for Admin Current badge
 */

export {}

// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — Calling queue /current + /next (§AT / §4.5.3)
 * =============================================================================
 *
 * Live: controllers/callingLeadController.ts
 *   GET /api/dealers/me/calling-queue/current
 *   GET /api/dealers/me/calling-queue/next
 *
 * Product rules:
 *   1) in_progress → stays Current until Submit (§E.1)
 *   2) Start Call NOT done → Current / nextLead = Social / Google Sheet when any
 *      exist for this dealer (assigned or claimable pool) — never older raw CSV
 *   3) After Submit → same social-before-raw priority for next head
 *
 * Implementation:
 *   findOpenAssignedLeadsForDealer — SQL ORDER BY in_progress, social, FIFO
 *   promoteQueuedLeadIfSlotAvailable — same social CASE on pool claim;
 *     preferSocialOverAssignedRaw claims social even when raw fills the slot cap
 *   sortCallableQueueLeads — JS safety net matching SPA dealerAssignedQueue
 *   resolveDealerQueueHead — in_progress wins; else first sorted (social)
 *
 * Echo on every lead (§AN): sheet_source_id, source_type, platform (+ Meta fields)
 *
 * Docs: REQUIRED §AT · HANDOFF §4.5.3
 */

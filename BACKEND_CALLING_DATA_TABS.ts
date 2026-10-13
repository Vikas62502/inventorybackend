// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — Calling Data tabs (Oct 2026, REQUIRED §BR / HANDOFF §67)
 * =============================================================================
 * FE labels this §BQ / HANDOFF §63; those numbers are taken in this repo.
 *
 * Status: IMPLEMENTED (controllers/callingLeadController.ts). No new routes.
 *
 * -----------------------------------------------------------------------------
 * 1) Tabs overlap on purpose — one row per lead, classified by its LATEST action
 * -----------------------------------------------------------------------------
 *   | Tab           | Who belongs                                             | Route (dealer JWT)                         |
 *   | Scheduled     | Connected + Decision Pending only                       | GET /dealers/me/calling-queue/scheduled    |
 *   | Dialled       | every connected + not-connected lead, incl. scheduled   | GET /dealers/me/calling-actions/dialled    |
 *   | Connected     | connected, incl. Decision Pending                       | GET /dealers/me/calling-actions/connected  |
 *   | Not Connected | not-connected reasons only                              | GET /dealers/me/calling-actions/not-connected |
 *   Snapshot arrays on GET …/calling-queue/next|current (scheduledLeads, dialledActions, connectedActions,
 *   notConnectedActions) follow the same rules; counts.scheduled = Scheduled tab size.
 *
 *   - A future nextFollowUpAt never removes a lead from Dialled / Connected.
 *   - Dialled total === Connected total + Not Connected total; no lead is on both Connected and Not Connected.
 *   - Connected vs not connected = classifyCallingConnection (utils/callingActionSummary.ts): status text in the
 *     not-connected list (Call Unanswered, Switched Off, …) or category call_connectivity → not connected.
 *     The free remark is NOT matched, so "Transfer Reason: switched off" does not keep a lead on Not Connected.
 *   - Not-connected callbacks (rescheduled with a not-connected status) stay off Scheduled.
 *   - Filters: dialled ?action=, connected ?outcome=interested|not_interested|decision_pending,
 *     not-connected ?reason=, all ?search= &page= &limit= (pagination totals = per-lead counts).
 *
 * -----------------------------------------------------------------------------
 * 2) PATCH /dealers/me/calling-queue/:leadId/action — 3 outcomes
 * -----------------------------------------------------------------------------
 */
const outcomes = {
  interested: { action: 'called', status_text: 'Interested' },
  notInterested: { action: 'not_interested', status_text: 'Not Interested Currently' },
  decisionPending: {
    action: 'follow_up', // + nextFollowUpAt (future) → stored as rescheduled
    status_text: 'Follow-up Pending',
    nextFollowUpAt: '2026-10-16T05:30:00.000Z'
  }
};
/**
 *   From Scheduled: allowed before the follow-up is due (was LEAD_005). Interested / Not Interested complete the
 *     lead (leaves Scheduled); Decision Pending re-schedules it.
 *   From Connected / Not Connected "Move" (lead already completed): the latest history row is updated to the new
 *     outcome; Decision Pending also puts the assignment back to rescheduled + nextFollowUpAt so it shows on
 *     Scheduled. Free remark may include "Transfer Reason: …".
 *   After Move the lead's latest action is connected → it leaves Not Connected and shows on Connected
 *   (and Scheduled when Decision Pending).
 *
 * QA:
 *   1. Not Connected → Move → Decision Pending (+ date) → lead on Connected + Scheduled + Dialled, not on Not Connected.
 *   2. Scheduled (not yet due) → Interested → 200; lead leaves Scheduled, stays on Connected + Dialled.
 *   3. Decision Pending with future nextFollowUpAt still listed on Dialled + Connected.
 */

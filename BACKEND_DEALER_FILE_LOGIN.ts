// @ts-nocheck
/**
 * =============================================================================
 * BACKEND — File login lock (Send / Pending / Already / Login now)  (Nov 27 2026)
 * =============================================================================
 * Shipped in inventorybackend. Restart the API after deploy.
 *
 * Rules
 *   Not set / pending_for_login → dealer can edit
 *   already_login / login_now   → dealer gets 403 AUTH_004
 *   Admin unlocks by Not set (resetFileLogin: true) or Pending for login
 *   Dealer may only write fileLoginStatus = pending_for_login
 *   Admin always can edit
 *
 * API
 *   PATCH /api/quotations/:id/file-login        (dealer own / admin)
 *   PATCH /api/admin/quotations/:id/file-login  (admin)
 *
 * Bodies
 *   Send:   { fileLoginStatus:"pending_for_login", filePaymentType:"cash"|"loan"|"mix", … }
 *   Unlock: { resetFileLogin: true }   // admin Not set — also clears payment/bank
 *   Admin Pending unlock:
 *           { fileLoginStatus:"pending_for_login", filePaymentType:"…", … }
 *   Admin lock:
 *           { fileLoginStatus:"already_login"|"login_now", filePaymentType:"…", … }
 *
 * Column (leftover; lock is status-based — always written false):
 *   quotations.fileLoginDealerEditAccess BOOLEAN DEFAULT FALSE
 *   Boot: config/sequelizeBootstrap.ts → ensureFileLoginDealerEditAccessColumn
 *
 * Echo: fileLoginStatus, filePaymentType, fileBank*, fileLoginAt (+ grant flag false)
 *
 * Files
 *   controllers/adminController.ts — updateQuotationFileLogin
 *   routes/quotationRoutes.ts
 *   routes/adminRoutes.ts
 *   models/Quotation.ts
 *   config/sequelizeBootstrap.ts
 *   utils/quotationApiJson.ts
 *   validations/adminValidations.ts
 *
 * curl — unlock (Not set):
 *   curl -s -X PATCH "http://localhost:3050/api/admin/quotations/QT-XXX/file-login" \
 *     -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
 *     -d '{"resetFileLogin":true}'
 *
 * Acceptance
 * [ ] Restart API
 * [ ] Dealer pending + cash → 200
 * [ ] Admin already_login → dealer PATCH → 403 AUTH_004
 * [ ] Admin resetFileLogin → dealer can send again
 * [ ] Admin set pending_for_login → dealer can edit again
 * =============================================================================
 */

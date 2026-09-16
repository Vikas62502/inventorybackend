# Backend handoff — Final Settlement → PostgreSQL Completed + Revert (Sep 2026)

**Status: implemented** — REQUIRED **§BB** · HANDOFF **§49**

**Frontend:** Account Management → Payment Management → Manage  
**Apply:** `submitFinalSettlement` → `api.quotations.finalizeSettlement`  
**Confirm:** `GET /quotations/:id` must return `finalSettlementApplied === true` (**no** browser session bridge)  
**Revert:** `revertFinalSettlement` → `api.quotations.revertSettlement`  
**Related:** `BACKEND_FINAL_SETTLEMENT.md`, `BACKEND_REVERT_SETTLEMENT.md`, `BACKEND_FINAL_SETTLEMENT.ts`

---

## UI contract (what GET must enable)

| After settle (DB) | SPA shows |
|-------------------|-----------|
| `remaining=0` | Remaining **₹0** |
| `discountAmount` = existing + `d` | Subtotal **strikethrough** → **net** |
| `finalSettlementApplied=true` | **Hide Submit**, show **Revert** only |
| `paymentStatus=completed` | **Completed** — survives hard refresh |

Without PostgreSQL persist + GET echo, settle looks fine then refresh → Pending/Partial again.

---

## PostgreSQL (this repo)

Columns on `quotations` (camelCase — Sequelize `underscored: false`):

| Column | Type |
|--------|------|
| `finalSettlementApplied` | BOOLEAN DEFAULT FALSE |
| `finalSettlementAmount` | NUMERIC |
| `finalSettlementAt` | TIMESTAMPTZ NULL |
| `finalSettlementBy` | VARCHAR/UUID NULL |
| `finalSettlementRemarks` | TEXT NULL |
| `remainingAmount` | NUMERIC |
| `discountAmount` / `paymentStatus` | existing |

Migration: `20260916120000-add-settlement-remarks-to-quotations.js` (idempotent).

Spec SQL may show `final_settlement_*` snake_case — **do not** add a second snake set; model maps camelCase.

```sql
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS final_settlement_applied BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS final_settlement_amount  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_settlement_at      TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS final_settlement_by      UUID NULL,
  ADD COLUMN IF NOT EXISTS final_settlement_remarks TEXT NULL,
  ADD COLUMN IF NOT EXISTS remaining_amount         NUMERIC(12,2) DEFAULT 0;
```

---

## Rules (do not hardcode amounts)

| Rule | Detail |
|------|--------|
| **Settlement amount `d`** | = **current Remaining** for that quotation (any INR). Not fixed at ₹5,000. |
| **Remarks** | Optional on settle (`remarks` / `finalSettlementRemarks` / `final_settlement_remarks`). |
| **After settle** | `remaining=0`, `paymentStatus=completed`, `discountAmount` = existing + `d`, installments **unchanged**. |
| **Source of truth** | PostgreSQL only. FE confirms with GET by-id before treating as Completed. |

---

## Settle — `POST /api/quotations/:id/final-settlement`

Auth: `account-management` | `admin` (accounts access). Quotation `status = approved`.

### Persist

| Field | Value |
|-------|--------|
| `finalSettlementApplied` | `true` |
| `finalSettlementAmount` | write-off `d` |
| `finalSettlementRemarks` | optional |
| `discountAmount` | existing + `d` |
| `paymentStatus` | `completed` |
| `remaining` / `remainingAmount` | **0** |

**Do not** rewrite installment paid rows.

### SPA fallbacks (same persist)

| Endpoint | When |
|----------|------|
| `PATCH …/pricing` | absolute `discountAmount` + `finalAmount`, no `subtotal` |
| `PATCH …/discount` | settlement-shaped body / `finalSettlementApplied` |
| `PATCH …/payment-details` | `finalSettlementApplied` or completed + remaining 0 + write-off |
| `PATCH …/quotations/:id` | settlement body → delegates to POST settle |

Shared: `utils/quotationFinalSettlementPersist.ts`.

### Do not reject

Do **not** fail with “settlementAmount cannot exceed remaining (0)” when AAS already looks cleared but AM still shows a gap. Still set applied=true, amount, remaining=0, completed.

---

## GET serializer (mandatory)

Every `GET /quotations`, `GET /quotations?status=approved`, and `GET /quotations/:id` must include:

```json
{
  "finalSettlementApplied": true,
  "finalSettlementAmount": 5000,
  "finalSettlementRemarks": "optional notes",
  "discountAmount": 5000,
  "remaining": 0,
  "remainingAmount": 0,
  "paymentStatus": "completed",
  "pricing": {
    "discountAmount": 5000,
    "finalSettlementApplied": true,
    "finalSettlementAmount": 5000
  }
}
```

Snake_case duplicates are fine if camelCase is present.

---

## Revert — `POST /api/quotations/:id/revert-final-settlement`

Also: `DELETE /quotations/:id/final-settlement`.

| Field | Value |
|-------|--------|
| `finalSettlementApplied` | `false` |
| `finalSettlementAmount` | `0` |
| `finalSettlementAt` / `By` | `null` |
| `finalSettlementRemarks` | `null` |
| `discountAmount` / `remaining` / `paymentStatus` | restored from paid installments + pre-settlement discount |

Installments **unchanged**.

---

## Acceptance checklist

- [x] Migration: settlement + remarks columns
- [x] Model mapped; remarks not silently dropped
- [x] `settlementAmount` = any Remaining (not hardcoded ₹5,000)
- [x] `POST /final-settlement` persists flags + discount + remaining 0
- [x] GET approved list + by-id echo all settlement fields
- [x] Hard refresh: Remaining ₹0, Completed, Revert-only (Submit hidden)
- [x] Revert then refresh: Remaining restored, Pending/Partial, Submit visible
- [x] Installment paid amounts never rewritten by settle/revert

---

## Example — one customer (Remaining happened to be ₹5,000)

Amounts below are **that customer’s Remaining**, not a product rule.

| | Before | After settle (must persist) |
|--|--------|------------------------------|
| Subtotal | ₹1,80,000 | original shown strikethrough → net ₹1,75,000 |
| Paid | ₹1,75,000 | ₹1,75,000 (unchanged) |
| Remaining | ₹5,000 | **₹0** |
| Status | Partial | **Completed** |
| `finalSettlementApplied` | false | **true** |
| `finalSettlementAmount` | 0 | **= prior Remaining** (here 5000) |
| Discount `d` | 0 | **= settlement amount** |
| UI actions | Submit | **Revert only** |

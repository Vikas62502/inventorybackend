# Backend handoff — Final Settlement Remaining ₹0 + Remarks (Sep 2026)

**Frontend:** Account Management → Payment Management → Manage  
**Apply:** `submitFinalSettlement` → `api.quotations.finalizeSettlement`  
**Revert:** `revertFinalSettlement` → `api.quotations.revertSettlement`  
**Related:** `BACKEND_FINAL_SETTLEMENT.md`, `BACKEND_REVERT_SETTLEMENT.md`, `BACKEND_FINAL_SETTLEMENT.ts`

---

## Rules (do not hardcode amounts)

| Rule | Detail |
|------|--------|
| **Settlement amount** | = **current Remaining** for that quotation (any INR). **Not** fixed at ₹5,000. ₹5k in examples is only one customer’s remaining. |
| **Remarks** | **Mandatory** on Apply and on Revert. Reject empty/whitespace remarks (`400`). Persist and echo on GET. |
| **After settle** | `remaining=0`, `paymentStatus=completed`, discount `d` = settlement amount, installments unpaid unchanged. |

---

## Bug seen in production

| UI after settle | Wrong | Correct |
|-----------------|-------|---------|
| Toast | “Remaining is now ₹0” | OK |
| List **Remaining** | Still shows prior remaining (e.g. ₹5,000) | **₹0** |
| Status | **Partial** | **Completed** |
| Subtotal | Full amount (no discount `d`) | Net of settlement discount |

**Root cause:** Write may succeed (or server treats balance as already cleared), but **`GET /quotations?status=approved` (and GET by id) omit** `finalSettlementApplied` / `finalSettlementAmount` / updated `discountAmount` / `remaining=0` / `paymentStatus=completed`. List rebuild then shows unpaid Remaining again.

**Backend must persist AND echo** settlement fields on every list/detail GET. Without GET echo, every login/refresh shows Remaining again.

---

## What changed on FE (for context)

1. Remarks are **mandatory** on both Apply and Revert (button disabled until filled); shown on the payment card.
2. Settlement amount is always `Math.round(Remaining)` — **not** a fixed ₹5,000.
3. Client sends remarks on settle/revert bodies (aliases below).
4. Client keeps a **session overlay** so Remaining stays ₹0 in the current tab if GET omits flags — **not** a substitute for DB persistence. Cross-device / refresh still needs backend GET echo.

---

## 1. Migration

```sql
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS final_settlement_applied  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS final_settlement_amount   NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_settlement_at       TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS final_settlement_by       UUID NULL,
  ADD COLUMN IF NOT EXISTS final_settlement_remarks  TEXT NULL,
  ADD COLUMN IF NOT EXISTS revert_settlement_remarks TEXT NULL,
  ADD COLUMN IF NOT EXISTS remaining_amount          NUMERIC(12,2) DEFAULT 0;
```

If settlement columns already exist, only add the two remarks columns.

---

## 2. Model (Sequelize)

```js
finalSettlementApplied:  { type: DataTypes.BOOLEAN, defaultValue: false, field: 'final_settlement_applied' },
finalSettlementAmount:   { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'final_settlement_amount' },
finalSettlementAt:       { type: DataTypes.DATE, allowNull: true, field: 'final_settlement_at' },
finalSettlementBy:       { type: DataTypes.UUID, allowNull: true, field: 'final_settlement_by' },
finalSettlementRemarks:  { type: DataTypes.TEXT, allowNull: true, field: 'final_settlement_remarks' },
revertSettlementRemarks: { type: DataTypes.TEXT, allowNull: true, field: 'revert_settlement_remarks' },
remainingAmount:         { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'remaining_amount' },
```

Also keep absolute `discountAmount` / `pricing.discountAmount` in sync (settlement write-off is added to discount `d`).

---

## 3. Apply — `POST /api/quotations/:id/final-settlement`

Auth: `account-management` | `admin`. Quotation `status = approved`.

### Body (client sends)

`settlementAmount` = that quotation’s **Remaining** (example uses 5000 only because Remaining was ₹5,000 — use whatever Remaining is).

```json
{
  "amount": 5000,
  "settlementAmount": 5000,
  "discountAmount": 5000,
  "finalAmount": 175000,
  "paymentStatus": "completed",
  "remaining": 0,
  "remainingAmount": 0,
  "finalSettlementApplied": true,
  "remarks": "Customer waived remaining balance",
  "settlementRemarks": "Customer waived remaining balance",
  "finalSettlementRemarks": "Customer waived remaining balance"
}
```

**Reject if remarks empty** (after trim). Read remarks from first non-empty of:  
`finalSettlementRemarks` | `settlementRemarks` | `remarks`.

### Persist

| Field | Value |
|-------|--------|
| `final_settlement_applied` | `true` |
| `final_settlement_amount` | `settlementAmount` (INR written off) |
| `final_settlement_remarks` | remarks text |
| `final_settlement_at` / `_by` | now / user id |
| `discount_amount` / pricing | absolute `discountAmount` from body |
| `remaining` / `remaining_amount` | **0** |
| `payment_status` | **`completed`** |
| Installments | **unchanged** (do not rewrite paid) |

### Do not reject

Do **not** fail with “settlementAmount cannot exceed remaining (0)” when the server’s payable math already shows remaining 0 but AM still shows a small gap. Still set `finalSettlementApplied=true`, amount, remarks, `paymentStatus=completed`, `remaining=0`.

### Fallbacks (same remarks + flags)

Client may also call:

1. `PATCH /pricing` then `PATCH /payment-details` (status + flags, no phase rewrite)
2. `PATCH /discount` (absolute)
3. `PATCH /payment-details` with phases + settlement fields

Accept remarks aliases on payment-details too.

---

## 4. Revert — `POST /api/quotations/:id/revert-final-settlement`

Also: `DELETE /quotations/:id/final-settlement` (same body).

### Body (client sends)

Example amounts mirror a prior settle of Remaining ₹5,000 — not a fixed rule.

```json
{
  "amount": 5000,
  "settlementAmount": 5000,
  "discountAmount": 0,
  "finalAmount": 180000,
  "paymentStatus": "partial",
  "remaining": 5000,
  "remainingAmount": 5000,
  "finalSettlementApplied": false,
  "finalSettlementAmount": 0,
  "remarks": "Settled by mistake",
  "revertRemarks": "Settled by mistake",
  "revertSettlementRemarks": "Settled by mistake"
}
```

**Reject if remarks empty** (after trim). Read remarks from: `revertSettlementRemarks` | `revertRemarks` | `remarks`.

### Persist

| Field | Value |
|-------|--------|
| `final_settlement_applied` | `false` |
| `final_settlement_amount` | `0` |
| `final_settlement_at` / `_by` | `null` |
| `revert_settlement_remarks` | remarks text |
| `discount_amount` | body’s absolute `discountAmount` |
| `remaining` / `remaining_amount` | from body |
| `payment_status` | from body (`partial` / `pending` / `completed`) |
| Installments | **unchanged** |

Keep prior `final_settlement_remarks` for audit (optional); FE shows revert remarks separately.

---

## 5. GET serializer (mandatory)

Every `GET /quotations`, `GET /quotations?status=approved`, and `GET /quotations/:id` must include:

```json
{
  "finalSettlementApplied": true,
  "finalSettlementAmount": 5000,
  "finalSettlementRemarks": "Customer waived last ₹5,000",
  "revertSettlementRemarks": null,
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

Snake_case duplicates are fine if camelCase is present. FE treats settled when:

- `finalSettlementApplied === true`, **or**
- `finalSettlementAmount > 0`, **or**
- discount covers unpaid gap (`originalSubtotal − paid ≤ discount`)

After settle, list must show **Remaining ₹0** and **Completed** without relying on client session.

---

## 6. Acceptance checklist

- [ ] Migration: remarks columns (+ settlement columns if missing)
- [ ] Model mapped; no silent drop of remarks fields
- [ ] `settlementAmount` accepted as **any Remaining** (not capped / not hardcoded ₹5,000)
- [ ] Empty remarks → **400** on settle and revert
- [ ] `POST /final-settlement` persists flags + discount + remaining 0 + remarks
- [ ] `POST /revert-final-settlement` clears flags, restores remaining/status, stores revert remarks
- [ ] Approved list GET returns all settlement + remarks fields
- [ ] Refresh / other device: Remaining ₹0, Completed, remarks visible
- [ ] Revert then refresh: Remaining restored, revert remarks visible
- [ ] Installment paid amounts never rewritten by settle/revert
- [ ] No 400 when server remaining already 0 but FE still sends a write-off / flag

---

## 7. Example — one customer (Remaining happened to be ₹5,000)

Amounts below are **that customer’s Remaining**, not a product rule. Another file with Remaining ₹1,200 settles ₹1,200.

| | Before | After settle (must persist) |
|--|--------|------------------------------|
| Subtotal | ₹1,80,000 | ₹1,80,000 (original) / net ₹1,75,000 |
| Paid | ₹1,75,000 | ₹1,75,000 |
| Remaining | ₹5,000 | **₹0** |
| Status | Partial | **Completed** |
| `finalSettlementApplied` | false | **true** |
| `finalSettlementAmount` | 0 | **= prior Remaining** (here 5000) |
| `finalSettlementRemarks` | — | **mandatory** text from AM |
| Discount `d` | 0 | **= settlement amount** |

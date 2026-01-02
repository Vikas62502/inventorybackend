# Backend Fix: Subtotal, TotalAmount, and FinalAmount Saving to Database

**Date:** December 31, 2025  
**Status:** ✅ Complete

---

## Problem Fixed

The frontend sends `subtotal`, `totalAmount`, and `finalAmount` in the request, but these values were not being saved to the database correctly. The backend now properly saves all three fields.

---

## Field Definitions

According to the specification:

1. **`subtotal`** → Database column: `subtotal` (DECIMAL)
   - **Definition:** Set price (complete package price)
   - **Example:** `300000`
   - **Calculation:** Provided by frontend (editable field)

2. **`totalAmount`** → Database column: `totalAmount` (DECIMAL)
   - **Definition:** Amount after discount (Subtotal - Subsidy - Discount)
   - **Example:** `194750`
   - **Calculation:** `subtotal - totalSubsidy - discountAmount`

3. **`finalAmount`** → Database column: `finalAmount` (DECIMAL)
   - **Definition:** Final amount (Subtotal - Subsidy, discount NOT applied)
   - **Example:** `205000`
   - **Calculation:** `subtotal - totalSubsidy` (no discount)

---

## Changes Made

### 1. Updated Quotation Model (`models/Quotation.ts`)

Added `totalAmount` field:

```typescript
interface QuotationAttributes {
  // ... existing fields
  subtotal: number;        // Set price (complete package price)
  totalAmount: number;      // Amount after discount (Subtotal - Subsidy - Discount)
  finalAmount: number;      // Final amount (Subtotal - Subsidy, discount NOT applied)
  // ... rest of fields
}
```

**Database Columns:**
- `subtotal` - DECIMAL(12,2) NOT NULL DEFAULT 0
- `totalAmount` - DECIMAL(12,2) NOT NULL DEFAULT 0
- `finalAmount` - DECIMAL(12,2) NOT NULL

---

### 2. Updated Create Quotation Endpoint (`controllers/quotationController.ts`)

#### Extracts All Pricing Fields from Request Body

```typescript
const { 
  customerId, 
  customer, 
  products, 
  discount = 0,
  subtotal,           // Set price (complete package price) - MUST BE SAVED
  centralSubsidy,      // Individual central subsidy
  stateSubsidy,        // Individual state subsidy
  totalSubsidy,       // Total subsidy (central + state)
  amountAfterSubsidy,  // Amount after subsidy
  discountAmount,      // Discount amount
  totalAmount,         // Amount after discount - MUST BE SAVED
  finalAmount,         // Final amount - MUST BE SAVED
  pricing: bodyPricing
} = req.body;
```

#### Validates Required Fields

```typescript
// Validate subtotal
if (!subtotal || subtotal <= 0) {
  res.status(400).json({
    success: false,
    error: {
      code: 'VAL_001',
      message: 'Subtotal is required and must be greater than 0'
    }
  });
  return;
}

// Validate totalAmount
if (!totalAmount || isNaN(Number(totalAmount))) {
  res.status(400).json({
    success: false,
    error: {
      code: 'VAL_002',
      message: 'Total amount is required'
    }
  });
  return;
}

// Validate finalAmount
if (finalAmount === undefined || finalAmount === null || isNaN(Number(finalAmount))) {
  res.status(400).json({
    success: false,
    error: {
      code: 'VAL_003',
      message: 'Final amount is required'
    }
  });
  return;
}
```

#### Saves Frontend Values to Database

```typescript
// Create quotation - MUST save subtotal, totalAmount, and finalAmount from frontend
const quotation = await Quotation.create({
  id: quotationId,
  dealerId: req.dealer.id,
  customerId: finalCustomerId,
  systemType: products.systemType,
  status: 'pending',
  discount,
  subtotal: finalPricing.subtotal,        // Set price (complete package price)
  totalAmount: finalPricing.totalAmount, // Amount after discount (Subtotal - Subsidy - Discount)
  finalAmount: finalPricing.finalAmount,  // Final amount (Subtotal - Subsidy, discount NOT applied)
  validUntil
});
```

#### Returns Saved Values in Response

```typescript
res.status(201).json({
  success: true,
  data: {
    id: quotation.id,
    // ... other fields
    pricing: {
      subtotal: quotation.subtotal,              // Set price (complete package price)
      totalAmount: quotation.totalAmount,       // Amount after discount
      finalAmount: quotation.finalAmount,       // Final amount (subtotal - subsidy)
      centralSubsidy: finalPricing.centralSubsidy,
      stateSubsidy: finalPricing.stateSubsidy,
      totalSubsidy: finalPricing.totalSubsidy,
      amountAfterSubsidy: finalPricing.amountAfterSubsidy,
      discountAmount: finalPricing.discountAmount,
      // ... component prices for display
    }
  }
});
```

---

### 3. Updated Get Quotation by ID

Uses saved `subtotal`, `totalAmount`, and `finalAmount` from database:

```typescript
const finalPricing = {
  ...pricing,
  subtotal: Number(quotation.subtotal || pricing.subtotal),
  totalAmount: Number(quotation.totalAmount || pricing.totalAmount),
  finalAmount: Number(quotation.finalAmount || pricing.finalAmount)
};
```

---

### 4. Updated Get Quotations List

Returns saved values from database:

```typescript
pricing: pricing ? {
  subtotal: (q as any).subtotal !== undefined ? Number((q as any).subtotal) : pricing.subtotal,
  totalAmount: (q as any).totalAmount !== undefined ? Number((q as any).totalAmount) : pricing.totalAmount,
  finalAmount: (q as any).finalAmount !== undefined ? Number((q as any).finalAmount) : pricing.finalAmount,
  // ... other pricing fields
} : null
```

---

### 5. Updated Update Discount Endpoint

Correctly handles `totalAmount` and `finalAmount`:

```typescript
// finalAmount = subtotal - subsidy (discount NOT applied) - should remain unchanged
const savedFinalAmount = Number(quotation.finalAmount || amountAfterSubsidy);

// totalAmount = subtotal - subsidy - discount (amount after discount) - recalculate with new discount
const discountAmount = (amountAfterSubsidy * discount) / 100;
const newTotalAmount = amountAfterSubsidy - discountAmount;

await quotation.update({
  discount,
  totalAmount: newTotalAmount,    // Recalculated with new discount
  finalAmount: savedFinalAmount   // Remains unchanged (no discount applied)
});
```

---

## Database Migration

Migration script updated: `scripts/run-migration.js`

**What it does:**
1. Adds `subtotal` column if it doesn't exist
2. Adds `totalAmount` column if it doesn't exist
3. Updates existing records with temporary values

**To run migration:**
```bash
node scripts/run-migration.js
```

**Migration completed successfully!** ✅

---

## Request/Response Format

### Frontend Request (POST /api/quotations)

```json
{
  "customerId": "customer-123",
  "customer": { ... },
  "products": { ... },
  "discount": 5,
  "subtotal": 300000,           // ← MUST BE PROVIDED (Set price)
  "centralSubsidy": 78000,
  "stateSubsidy": 0,
  "totalSubsidy": 78000,
  "amountAfterSubsidy": 222000,
  "discountAmount": 11100,
  "totalAmount": 210900,        // ← MUST BE PROVIDED (Amount after discount)
  "finalAmount": 222000         // ← MUST BE PROVIDED (Subtotal - Subsidy)
}
```

### Backend Response

```json
{
  "success": true,
  "data": {
    "id": "QT-2025-001",
    "pricing": {
      "subtotal": 300000,       // ← Saved value (Set price)
      "totalAmount": 210900,      // ← Saved value (Amount after discount)
      "finalAmount": 222000,      // ← Saved value (Subtotal - Subsidy)
      "centralSubsidy": 78000,
      "stateSubsidy": 0,
      "totalSubsidy": 78000,
      "amountAfterSubsidy": 222000,
      "discountAmount": 11100
    }
  }
}
```

---

## Validation Rules

1. **Subtotal:**
   - Required
   - Must be greater than 0
   - Error code: `VAL_001`

2. **Total Amount:**
   - Required
   - Must be a valid number
   - Error code: `VAL_002`

3. **Final Amount:**
   - Required
   - Can be 0 (if subsidy equals subtotal)
   - Error code: `VAL_003`

---

## Files Modified

1. **`models/Quotation.ts`**
   - Added `totalAmount` field to interface
   - Added `totalAmount` to model definition
   - Added database column definition

2. **`controllers/quotationController.ts`**
   - Updated `createQuotation` to extract and save `subtotal`, `totalAmount`, and `finalAmount`
   - Added validation for all three required pricing fields
   - Updated `getQuotationById` to return saved values
   - Updated `getQuotations` to return saved values
   - Updated `updateQuotationDiscount` to handle `totalAmount` correctly

3. **`scripts/run-migration.js`**
   - Updated to add both `subtotal` and `totalAmount` columns
   - Handles case-sensitive column names correctly

4. **`database/migrations/add_totalAmount_to_quotations.sql`** (New)
   - Migration script to add `totalAmount` column

---

## Testing Checklist

- [x] Model updated with `totalAmount` field
- [x] Create quotation accepts `subtotal`, `totalAmount`, and `finalAmount` from request
- [x] Validation added for all required fields
- [x] Values saved to database correctly
- [x] Response returns saved values
- [x] Get quotation by ID uses saved values
- [x] Get quotations list returns saved values
- [x] Update discount correctly handles `totalAmount` and `finalAmount`
- [x] Migration script created and tested
- [x] Database columns added successfully

---

## Important Notes

1. **Subtotal is NOT calculated** - It comes from the frontend as an editable field (set price)
2. **TotalAmount is NOT calculated** - It comes from the frontend (amount after discount)
3. **FinalAmount is NOT calculated** - It comes from the frontend (subtotal - subsidy, no discount)
4. **Database stores frontend values** - Not recalculated values
5. **When discount changes:**
   - `subtotal` remains unchanged
   - `finalAmount` remains unchanged (subtotal - subsidy, no discount)
   - `totalAmount` is recalculated (subtotal - subsidy - new discount)

---

## Verification Steps

1. **Check Request Payload:**
   - Verify `subtotal`, `totalAmount`, and `finalAmount` are in request body
   - Check browser console logs

2. **Check Database:**
   ```sql
   SELECT id, subtotal, "totalAmount", "finalAmount", created_at 
   FROM quotations 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

3. **Check Response:**
   - Verify response includes saved `subtotal`, `totalAmount`, and `finalAmount`
   - Values should match what was sent in request

---

## Status

✅ **COMPLETE** - All changes implemented and tested

The backend now:
- Accepts `subtotal`, `totalAmount`, and `finalAmount` from frontend
- Validates all required fields
- Saves values to database
- Returns saved values in response
- Uses saved values when retrieving quotations
- Correctly handles discount updates

---

**Last Updated:** December 31, 2025


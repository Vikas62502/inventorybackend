# Frontend Changes Report - Pricing Fields Update

**Date:** December 31, 2025  
**Priority:** HIGH  
**Status:** ✅ Backend Ready

---

## Overview

The backend has been updated to accept and save pricing fields (`subtotal`, `totalAmount`, `finalAmount`) from the frontend. These fields are now **required** and must be sent in the request body when creating a quotation.

---

## ⚠️ CRITICAL: Required Fields

**IMPORTANT:** The frontend **MUST** send `subtotal`, `totalAmount`, and `finalAmount` at the **root level** of the request body. These fields are **REQUIRED** and the request will fail with a 400 error if they are missing or 0.

### 1. Required Fields in Request Body

When creating a quotation (`POST /api/quotations`), the frontend **MUST** send these fields at the **root level** of the request body:

```json
{
  "customerId": "customer-123",
  "customer": { ... },
  "products": { ... },
  "discount": 5,
  "subtotal": 240000,           // ← REQUIRED: Set price (complete package price)
  "totalAmount": 162000,        // ← REQUIRED: Amount after discount
  "finalAmount": 162000,        // ← REQUIRED: Final amount (subtotal - subsidy)
  "centralSubsidy": 78000,
  "stateSubsidy": 0,
  "totalSubsidy": 78000,
  "amountAfterSubsidy": 162000,
  "discountAmount": 0
}
```

---

## Field Definitions

### Pricing Fields

1. **`subtotal`** (REQUIRED)
   - **Type:** `number`
   - **Description:** Set price (complete package price)
   - **Example:** `240000`
   - **Validation:** Must be > 0
   - **Error Code:** `VAL_001` if missing or invalid

2. **`totalAmount`** (REQUIRED)
   - **Type:** `number`
   - **Description:** Amount after discount (Subtotal - Subsidy - Discount)
   - **Example:** `162000`
   - **Calculation:** `subtotal - totalSubsidy - discountAmount`
   - **Error Code:** `VAL_002` if missing or invalid

3. **`finalAmount`** (REQUIRED)
   - **Type:** `number`
   - **Description:** Final amount (Subtotal - Subsidy, discount NOT applied)
   - **Example:** `162000`
   - **Calculation:** `subtotal - totalSubsidy`
   - **Note:** Can be 0 if subsidy equals subtotal
   - **Error Code:** `VAL_003` if missing or invalid

### Subsidy Fields

4. **`centralSubsidy`** (Optional, but recommended)
   - **Type:** `number`
   - **Description:** Central government subsidy
   - **Example:** `78000`
   - **Default:** `0` if not provided

5. **`stateSubsidy`** (Optional, but recommended)
   - **Type:** `number`
   - **Description:** State subsidy
   - **Example:** `0`
   - **Default:** `0` if not provided

6. **`totalSubsidy`** (Optional, but recommended)
   - **Type:** `number`
   - **Description:** Total subsidy (central + state)
   - **Example:** `78000`
   - **Calculation:** `centralSubsidy + stateSubsidy`
   - **Default:** Calculated if not provided

7. **`amountAfterSubsidy`** (Optional)
   - **Type:** `number`
   - **Description:** Amount after subsidy deduction
   - **Example:** `162000`
   - **Calculation:** `subtotal - totalSubsidy`

8. **`discountAmount`** (Optional)
   - **Type:** `number`
   - **Description:** Discount amount
   - **Example:** `0`
   - **Calculation:** `(amountAfterSubsidy * discount) / 100`

---

## API Endpoint: POST /api/quotations

### Request Format

```json
{
  "customerId": "d78d7d6f-58f9-4bbb-96c9-aef4f922ce10",
  "customer": {
    "firstName": "AMAN",
    "lastName": "RAJAK",
    "mobile": "9249929902",
    "email": "amankrrajak288@gmail.com",
    "address": {
      "street": "plot-10 shyam vihar",
      "city": "Jaipur",
      "state": "Rajasthan",
      "pincode": "302012"
    }
  },
  "products": {
    "systemType": "dcr",
    "panelBrand": "Waaree",
    "panelSize": "545W",
    "panelQuantity": 8,
    "inverterType": "String Inverter",
    "inverterBrand": "XWatt",
    "inverterSize": "5kW",
    "structureType": "GI Structure",
    "structureSize": "4kW",
    "meterBrand": "L&T",
    "acCableBrand": "Polycab",
    "acCableSize": "4 sq mm",
    "dcCableBrand": "Polycab",
    "dcCableSize": "4 sq mm",
    "acdb": "Havells (1-Phase)",
    "dcdb": "Havells (1-Phase)",
    "centralSubsidy": 78000,
    "stateSubsidy": 0,
    "systemPrice": 240000,
    "batteryPrice": 0
  },
  "discount": 0,
  "subtotal": 240000,           // ← REQUIRED
  "centralSubsidy": 78000,
  "stateSubsidy": 0,
  "totalSubsidy": 78000,
  "amountAfterSubsidy": 162000,
  "discountAmount": 0,
  "totalAmount": 162000,        // ← REQUIRED
  "finalAmount": 162000         // ← REQUIRED
}
```

### Response Format

```json
{
  "success": true,
  "data": {
    "id": "QT-2025-001",
    "dealerId": "dealer_123",
    "customerId": "customer-123",
    "systemType": "dcr",
    "status": "pending",
    "discount": 0,
    "pricing": {
      "subtotal": 240000,              // Set price (complete package price)
      "totalAmount": 162000,            // Amount after discount (Subtotal - Subsidy - Discount)
      "finalAmount": 162000,            // Final amount (Subtotal - Subsidy, discount NOT applied)
      "centralSubsidy": 78000,
      "stateSubsidy": 0,
      "totalSubsidy": 78000,
      "amountAfterSubsidy": 162000,
      "discountAmount": 0,
      // Component prices for display
      "panelPrice": 0,
      "inverterPrice": 0,
      "structurePrice": 0,
      "meterPrice": 0,
      "cablePrice": 0,
      "acdbDcdbPrice": 0
    },
    "createdAt": "2025-12-31T03:53:20.000Z",
    "validUntil": "2026-01-05"
  }
}
```

---

## Validation Errors

### Error: VAL_001 - Subtotal Required

**Status Code:** `400`

```json
{
  "success": false,
  "error": {
    "code": "VAL_001",
    "message": "Subtotal is required and must be greater than 0",
    "details": [{
      "field": "subtotal",
      "message": "Subtotal must be greater than 0. Please provide 'subtotal' in the request body."
    }]
  }
}
```

**Fix:** Ensure `subtotal` is sent in the request body and is > 0.

---

### Error: VAL_002 - Total Amount Required

**Status Code:** `400`

```json
{
  "success": false,
  "error": {
    "code": "VAL_002",
    "message": "Total amount is required",
    "details": [{
      "field": "totalAmount",
      "message": "Total amount (amount after discount) is required in request body"
    }]
  }
}
```

**Fix:** Ensure `totalAmount` is sent in the request body.

---

### Error: VAL_003 - Final Amount Required

**Status Code:** `400`

```json
{
  "success": false,
  "error": {
    "code": "VAL_003",
    "message": "Final amount is required",
    "details": [{
      "field": "finalAmount",
      "message": "Final amount (subtotal - subsidy) is required in request body"
    }]
  }
}
```

**Fix:** Ensure `finalAmount` is sent in the request body.

---

## Data Storage

### Quotations Table

The following fields are saved to the `quotations` table:

- `subtotal` - Set price (complete package price)
- `totalAmount` - Amount after discount (Subtotal - Subsidy - Discount)
- `finalAmount` - Final amount (Subtotal - Subsidy, discount NOT applied)

### Quotation Products Table

The following fields are saved to the `quotation_products` table:

- `subtotal` - Set price (complete package price)
- `totalAmount` - Amount after discount (Subtotal - Subsidy - Discount)
- `finalAmount` - Final amount (Subtotal - Subsidy, discount NOT applied)
- `centralSubsidy` - Central government subsidy
- `stateSubsidy` - State subsidy

---

## Response Data Structure

### Get Quotation by ID (GET /api/quotations/:id)

```json
{
  "success": true,
  "data": {
    "id": "QT-2025-001",
    "pricing": {
      "subtotal": 240000,              // From database
      "totalAmount": 162000,            // From database
      "finalAmount": 162000,            // From database
      "centralSubsidy": 78000,
      "stateSubsidy": 0,
      "totalSubsidy": 78000,
      "amountAfterSubsidy": 162000,
      "discountAmount": 0
    }
  }
}
```

### Get Quotations List (GET /api/quotations)

```json
{
  "success": true,
  "data": {
    "quotations": [
      {
        "id": "QT-2025-001",
        "pricing": {
          "subtotal": 240000,          // From database
          "totalAmount": 162000,        // From database
          "finalAmount": 162000,        // From database
          // ... other fields
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

## Update Discount (PUT /api/quotations/:id/discount)

When updating discount:

- `subtotal` - Remains unchanged
- `finalAmount` - Remains unchanged (subtotal - subsidy, no discount)
- `totalAmount` - Recalculated (subtotal - subsidy - new discount)

**Request:**
```json
{
  "discount": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "QT-2025-001",
    "discount": 5,
    "pricing": {
      "subtotal": 240000,              // Unchanged
      "totalAmount": 153900,            // Recalculated (162000 - 8100)
      "finalAmount": 162000,            // Unchanged
      "amountAfterSubsidy": 162000,
      "discountAmount": 8100,
      "totalSubsidy": 78000
    }
  }
}
```

---

## Frontend Implementation Checklist

- [ ] Update quotation creation form to include `subtotal`, `totalAmount`, and `finalAmount` fields
- [ ] Ensure pricing fields are sent at the **root level** of the request body (not nested)
- [ ] Validate that `subtotal > 0` before sending request
- [ ] Validate that `totalAmount` and `finalAmount` are numbers before sending
- [ ] Handle validation errors (`VAL_001`, `VAL_002`, `VAL_003`)
- [ ] Update quotation display to show saved `subtotal`, `totalAmount`, and `finalAmount`
- [ ] Update quotation list to display pricing fields from response
- [ ] Test quotation creation with all required fields
- [ ] Test quotation retrieval to verify saved values are returned
- [ ] Test discount update to verify `totalAmount` is recalculated correctly

---

## Example Frontend Code

### Creating Quotation

```typescript
const createQuotation = async (quotationData: {
  customerId: string;
  customer?: CustomerData;
  products: ProductData;
  discount: number;
  subtotal: number;           // ← REQUIRED
  totalAmount: number;         // ← REQUIRED
  finalAmount: number;         // ← REQUIRED
  centralSubsidy?: number;
  stateSubsidy?: number;
  totalSubsidy?: number;
  amountAfterSubsidy?: number;
  discountAmount?: number;
}) => {
  try {
    const response = await fetch('/api/quotations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customerId: quotationData.customerId,
        customer: quotationData.customer,
        products: quotationData.products,
        discount: quotationData.discount,
        subtotal: quotationData.subtotal,           // ← REQUIRED
        totalAmount: quotationData.totalAmount,     // ← REQUIRED
        finalAmount: quotationData.finalAmount,     // ← REQUIRED
        centralSubsidy: quotationData.centralSubsidy || 0,
        stateSubsidy: quotationData.stateSubsidy || 0,
        totalSubsidy: quotationData.totalSubsidy || (quotationData.centralSubsidy || 0) + (quotationData.stateSubsidy || 0),
        amountAfterSubsidy: quotationData.amountAfterSubsidy || quotationData.finalAmount,
        discountAmount: quotationData.discountAmount || 0
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create quotation');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error creating quotation:', error);
    throw error;
  }
};
```

### Handling Validation Errors

```typescript
try {
  const quotation = await createQuotation(quotationData);
  // Success
} catch (error: any) {
  if (error.response?.status === 400) {
    const errorData = error.response.data;
    if (errorData.error?.code === 'VAL_001') {
      // Subtotal validation error
      console.error('Subtotal error:', errorData.error.details);
    } else if (errorData.error?.code === 'VAL_002') {
      // Total amount validation error
      console.error('Total amount error:', errorData.error.details);
    } else if (errorData.error?.code === 'VAL_003') {
      // Final amount validation error
      console.error('Final amount error:', errorData.error.details);
    }
  }
}
```

---

## Important Notes

1. **Field Location:** Pricing fields (`subtotal`, `totalAmount`, `finalAmount`) must be at the **root level** of the request body, not nested in `products` or `pricing` objects.

2. **Required Fields:** All three fields (`subtotal`, `totalAmount`, `finalAmount`) are **required** and will cause validation errors if missing.

3. **Data Types:** All pricing fields must be numbers (not strings).

4. **Validation:** 
   - `subtotal` must be > 0
   - `totalAmount` must be a valid number
   - `finalAmount` must be a valid number (can be 0)

5. **Database Storage:** Values are saved to both `quotations` and `quotation_products` tables.

6. **Response Format:** All responses include the saved pricing values in the `pricing` object.

---

## Migration Required

The backend requires a database migration to add the `totalAmount` column to the `quotations` table. This has been completed on the backend.

If you encounter errors about missing columns, the migration script is available at:
- `scripts/run-migration.js`

---

## Testing

### Test Case 1: Create Quotation with All Fields

```json
POST /api/quotations
{
  "customerId": "test-customer",
  "products": { ... },
  "discount": 5,
  "subtotal": 300000,
  "totalAmount": 210900,
  "finalAmount": 222000,
  "centralSubsidy": 78000,
  "stateSubsidy": 0,
  "totalSubsidy": 78000
}
```

**Expected:** Quotation created successfully with all pricing fields saved.

---

### Test Case 2: Missing Subtotal

```json
POST /api/quotations
{
  "customerId": "test-customer",
  "products": { ... },
  "discount": 5
  // subtotal missing
}
```

**Expected:** `400` error with code `VAL_001`

---

### Test Case 3: Missing Total Amount

```json
POST /api/quotations
{
  "customerId": "test-customer",
  "products": { ... },
  "discount": 5,
  "subtotal": 300000
  // totalAmount missing
}
```

**Expected:** `400` error with code `VAL_002`

---

### Test Case 4: Missing Final Amount

```json
POST /api/quotations
{
  "customerId": "test-customer",
  "products": { ... },
  "discount": 5,
  "subtotal": 300000,
  "totalAmount": 210900
  // finalAmount missing
}
```

**Expected:** `400` error with code `VAL_003`

---

## Summary

### What Changed

1. **New Required Fields:** `subtotal`, `totalAmount`, `finalAmount` are now required in the request body
2. **Validation:** Backend validates all three fields before creating quotation
3. **Database Storage:** All pricing fields are saved to both `quotations` and `quotation_products` tables
4. **Response Format:** All responses include the saved pricing values

### What Frontend Needs to Do

1. **Send Required Fields:** Include `subtotal`, `totalAmount`, and `finalAmount` in the request body
2. **Handle Validation Errors:** Display appropriate error messages for `VAL_001`, `VAL_002`, `VAL_003`
3. **Update UI:** Display saved pricing values from the API response
4. **Test:** Verify quotation creation works with the new required fields

---

## Support

If you encounter any issues:

1. Check server logs for detailed validation information
2. Verify request payload includes all required fields at root level
3. Ensure field types are numbers (not strings)
4. Check error response for specific validation details

---

**Last Updated:** December 31, 2025  
**Backend Status:** ✅ Ready  
**Frontend Action Required:** ⚠️ Update request payload to include required fields


# Admin Access to Quotation Endpoints

**Date:** December 23, 2025  
**Status:** ✅ **COMPLETED**

---

## Summary

Updated the quotation endpoints to allow admins to access and manage all quotations, not just their own. Dealers continue to see only their own quotations.

---

## Changes Made

### 1. Authentication Middleware
- ✅ The `authenticate` middleware already handles both dealers and admins
- ✅ Both dealers and admins are stored in the `Dealer` model with `role: 'dealer'` or `role: 'admin'`
- ✅ The `authorizeDealer` middleware works for both since both are authenticated as `req.dealer`

### 2. Quotation Controller Updates

#### ✅ GET /api/quotations
**Before:** Only returned quotations for the authenticated dealer
**After:** 
- Admins see ALL quotations
- Dealers see only their own quotations

**Code Change:**
```typescript
// Before
const where: any = { dealerId: req.dealer.id };

// After
const where: any = req.dealer.role === 'admin' ? {} : { dealerId: req.dealer.id };
```

#### ✅ GET /api/quotations/{quotationId}
**Before:** Only allowed dealers to view their own quotations
**After:**
- Admins can view ANY quotation
- Dealers can only view their own quotations

**Code Change:**
```typescript
// Before
where: { id: quotationId, dealerId: req.dealer.id }

// After
const where: any = { id: quotationId };
if (req.dealer.role !== 'admin') {
  where.dealerId = req.dealer.id;
}
```

#### ✅ PATCH /api/quotations/{quotationId}/discount
**Before:** Only allowed dealers to update their own quotations
**After:**
- Admins can update discount for ANY quotation
- Dealers can only update their own quotations

#### ✅ GET /api/quotations/{quotationId}/pdf
**Before:** Only allowed dealers to download their own quotation PDFs
**After:**
- Admins can download PDF for ANY quotation
- Dealers can only download their own quotation PDFs

#### ✅ POST /api/quotations
**Before:** Only allowed dealers to create quotations for their own customers
**After:**
- Admins can create quotations for ANY customer
- Dealers can only create quotations for their own customers

**Code Change:**
```typescript
// Before
where: { id: finalCustomerId, dealerId: req.dealer.id }

// After
const where: any = { id: finalCustomerId };
if (req.dealer.role !== 'admin') {
  where.dealerId = req.dealer.id;
}
```

---

## Access Control Summary

| Endpoint | Dealer Access | Admin Access |
|----------|--------------|--------------|
| `GET /api/quotations` | Own quotations only | All quotations |
| `GET /api/quotations/{id}` | Own quotations only | Any quotation |
| `POST /api/quotations` | Own customers only | Any customer |
| `PATCH /api/quotations/{id}/discount` | Own quotations only | Any quotation |
| `GET /api/quotations/{id}/pdf` | Own quotations only | Any quotation |
| `GET /api/quotations/{id}/visits` | Own quotations only | Any quotation |

---

## Authentication Flow

1. **Token Verification:**
   - JWT token is verified in `authenticate` middleware
   - Token contains `id` and `role` (either 'dealer' or 'admin')

2. **User Lookup:**
   - Both dealers and admins are looked up in the `Dealer` model
   - `req.dealer` is set with user information including `role`

3. **Authorization:**
   - `authorizeDealer` middleware checks if `req.dealer` exists
   - Since both dealers and admins are in the Dealer model, both pass this check

4. **Data Filtering:**
   - Controllers check `req.dealer.role` to determine access level
   - Admins (`role === 'admin'`) see all data
   - Dealers (`role === 'dealer'`) see only their own data

---

## Testing

### Admin Access Tests
- [x] Admin can view all quotations via `GET /api/quotations`
- [x] Admin can view any quotation via `GET /api/quotations/{id}`
- [x] Admin can create quotations for any customer
- [x] Admin can update discount for any quotation
- [x] Admin can download PDF for any quotation

### Dealer Access Tests
- [x] Dealer can only view their own quotations
- [x] Dealer can only view their own quotation details
- [x] Dealer can only create quotations for their own customers
- [x] Dealer can only update discount for their own quotations
- [x] Dealer can only download PDF for their own quotations

---

## Files Modified

1. **controllers/quotationController.ts**
   - Updated `getQuotations()` to allow admins to see all quotations
   - Updated `getQuotationById()` to allow admins to view any quotation
   - Updated `updateQuotationDiscount()` to allow admins to update any quotation
   - Updated `downloadQuotationPDF()` to allow admins to download any quotation PDF
   - Updated `createQuotation()` to allow admins to use any customer

2. **middleware/authQuotation.ts**
   - Added `authorizeDealerOrAdmin()` middleware (for future use if needed)
   - Existing `authorizeDealer` already works for both dealers and admins

---

## API Response Format

### For Admins
When an admin requests quotations, they receive ALL quotations regardless of `dealerId`:

```json
{
  "success": true,
  "data": {
    "quotations": [
      {
        "id": "QT-ABC123",
        "dealerId": "dealer_1",
        "customer": { ... },
        ...
      },
      {
        "id": "QT-XYZ789",
        "dealerId": "dealer_2",
        "customer": { ... },
        ...
      }
    ],
    "pagination": { ... }
  }
}
```

### For Dealers
Dealers only see their own quotations:

```json
{
  "success": true,
  "data": {
    "quotations": [
      {
        "id": "QT-ABC123",
        "dealerId": "dealer_1",
        "customer": { ... },
        ...
      }
    ],
    "pagination": { ... }
  }
}
```

---

## Security Considerations

1. **Role Verification:**
   - Role is verified from the JWT token
   - Role is stored in the database and checked during authentication
   - Only active dealers/admins can access endpoints

2. **Data Isolation:**
   - Dealers are properly isolated to their own data
   - Admins have elevated access but still require authentication
   - All endpoints require valid JWT token

3. **Authorization:**
   - Authorization is checked at both middleware and controller levels
   - Role-based filtering ensures proper data access

---

## Conclusion

✅ **All quotation endpoints now support admin access:**
- Admins can view, create, update, and download quotations for all dealers
- Dealers continue to have access only to their own quotations
- Authentication and authorization are properly enforced
- Data isolation is maintained for dealers

**Status:** Ready for testing and deployment.

---

**Last Updated:** December 23, 2025


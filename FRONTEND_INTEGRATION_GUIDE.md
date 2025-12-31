# Frontend Integration Guide - Product Catalog API

**Date:** December 26, 2025  
**Status:** Backend ✅ Complete | Frontend ⚠️ Changes Required

---

## Overview

The backend now provides Product Catalog API endpoints that should be integrated into the frontend for product selection in quotation forms. This document outlines all the frontend changes needed.

---

## Available API Endpoints

### 1. GET /api/config/products
**Purpose:** Get product catalog (Admin management)  
**Authentication:** Required (Bearer token)  
**Authorization:** Any authenticated user

**Response:**
```json
{
  "success": true,
  "data": {
    "panels": {
      "brands": ["Adani", "Tata", "Waaree", ...],
      "sizes": ["440W", "445W", "540W", ...]
    },
    "inverters": {
      "types": ["String Inverter", "Micro Inverter", ...],
      "brands": ["Growatt", "Solis", "Fronius", ...],
      "sizes": ["3kW", "5kW", "6kW", ...]
    },
    "structures": {
      "types": ["GI Structure", "Aluminum Structure", ...],
      "sizes": ["1kW", "2kW", "3kW", ...]
    },
    "meters": {
      "brands": ["L&T", "HPL", "Havells", ...]
    },
    "cables": {
      "brands": ["Polycab", "Havells", "KEI", ...],
      "sizes": ["4 sq mm", "6 sq mm", "10 sq mm", ...]
    },
    "acdb": {
      "options": ["1-String", "2-String", "3-String", ...]
    },
    "dcdb": {
      "options": ["1-String", "2-String", "3-String", ...]
    }
  }
}
```

### 2. PUT /api/config/products
**Purpose:** Update product catalog (Admin only)  
**Authentication:** Required (Bearer token)  
**Authorization:** Admin role required

**Request Body:** Same structure as GET response

**Response:**
```json
{
  "success": true,
  "message": "Product catalog updated successfully",
  "data": { ... } // Same as request body
}
```

### 3. GET /api/quotations/product-catalog
**Purpose:** Get product catalog for quotation product selection  
**Authentication:** Required (Bearer token)  
**Authorization:** Dealers, Admins, and Visitors

**Response:** Same structure as GET /api/config/products

**Note:** This endpoint is specifically for use in quotation forms. It returns the same data but is accessible to dealers and visitors (not just admins).

---

## Frontend Changes Required

### 1. API Client Updates

**File:** `lib/api.ts` (or similar API client file)

Add or update the API methods:

```typescript
// Add to your API client
export const api = {
  // ... existing methods

  // Product Catalog API (for admin management)
  config: {
    getProducts: async (): Promise<ProductCatalog> => {
      return apiRequest("/config/products", {
        method: "GET",
        requiresAuth: true,
      });
    },
    updateProducts: async (productData: ProductCatalog): Promise<ApiResponse<ProductCatalog>> => {
      return apiRequest("/config/products", {
        method: "PUT",
        body: productData,
        requiresAuth: true,
      });
    },
  },

  // Product Catalog API (for quotation forms)
  quotations: {
    // ... existing quotation methods
    getProductCatalog: async (): Promise<ProductCatalog> => {
      return apiRequest("/quotations/product-catalog", {
        method: "GET",
        requiresAuth: true,
      });
    },
  },
};
```

**Type Definition:**

```typescript
// types/product-catalog.ts (or add to existing types file)
export interface ProductCatalog {
  panels: {
    brands: string[];
    sizes: string[];
  };
  inverters: {
    types: string[];
    brands: string[];
    sizes: string[];
  };
  structures: {
    types: string[];
    sizes: string[];
  };
  meters: {
    brands: string[];
  };
  cables: {
    brands: string[];
    sizes: string[];
  };
  acdb: {
    options: string[];
  };
  dcdb: {
    options: string[];
  };
}
```

---

### 2. Custom Hook for Product Catalog

**File:** `hooks/use-product-catalog.ts` (create new or update existing)

```typescript
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ProductCatalog } from '@/types/product-catalog';

export const useProductCatalog = () => {
  const [catalog, setCatalog] = useState<ProductCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.quotations.getProductCatalog();
        if (response.success && response.data) {
          setCatalog(response.data);
        } else {
          setError('Failed to load product catalog');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product catalog');
        // Set default empty catalog on error
        setCatalog({
          panels: { brands: [], sizes: [] },
          inverters: { types: [], brands: [], sizes: [] },
          structures: { types: [], sizes: [] },
          meters: { brands: [] },
          cables: { brands: [], sizes: [] },
          acdb: { options: [] },
          dcdb: { options: [] },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  return { catalog, loading, error };
};
```

---

### 3. Update Product Selection Form Component

**File:** `components/product-selection-form.tsx` (or similar)

**Changes needed:**

1. **Import the hook:**
```typescript
import { useProductCatalog } from '@/hooks/use-product-catalog';
```

2. **Use the hook in component:**
```typescript
const ProductSelectionForm = () => {
  const { catalog, loading, error } = useProductCatalog();

  // Show loading state
  if (loading) {
    return <div>Loading product catalog...</div>;
  }

  // Show error state (but still render form with empty options)
  if (error && !catalog) {
    console.error('Error loading catalog:', error);
  }

  // Use catalog data for dropdowns
  return (
    <form>
      {/* Panel Brand Dropdown */}
      <select name="panelBrand">
        <option value="">Select Panel Brand</option>
        {catalog?.panels?.brands?.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </select>

      {/* Panel Size Dropdown */}
      <select name="panelSize">
        <option value="">Select Panel Size</option>
        {catalog?.panels?.sizes?.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      {/* Inverter Type Dropdown */}
      <select name="inverterType">
        <option value="">Select Inverter Type</option>
        {catalog?.inverters?.types?.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      {/* Inverter Brand Dropdown */}
      <select name="inverterBrand">
        <option value="">Select Inverter Brand</option>
        {catalog?.inverters?.brands?.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </select>

      {/* Inverter Size Dropdown */}
      <select name="inverterSize">
        <option value="">Select Inverter Size</option>
        {catalog?.inverters?.sizes?.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      {/* Structure Type Dropdown */}
      <select name="structureType">
        <option value="">Select Structure Type</option>
        {catalog?.structures?.types?.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      {/* Structure Size Dropdown */}
      <select name="structureSize">
        <option value="">Select Structure Size</option>
        {catalog?.structures?.sizes?.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      {/* Meter Brand Dropdown */}
      <select name="meterBrand">
        <option value="">Select Meter Brand</option>
        {catalog?.meters?.brands?.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </select>

      {/* AC Cable Brand Dropdown */}
      <select name="acCableBrand">
        <option value="">Select AC Cable Brand</option>
        {catalog?.cables?.brands?.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </select>

      {/* AC Cable Size Dropdown */}
      <select name="acCableSize">
        <option value="">Select AC Cable Size</option>
        {catalog?.cables?.sizes?.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      {/* DC Cable Brand Dropdown */}
      <select name="dcCableBrand">
        <option value="">Select DC Cable Brand</option>
        {catalog?.cables?.brands?.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </select>

      {/* DC Cable Size Dropdown */}
      <select name="dcCableSize">
        <option value="">Select DC Cable Size</option>
        {catalog?.cables?.sizes?.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      {/* ACDB Dropdown */}
      <select name="acdb">
        <option value="">Select ACDB</option>
        {catalog?.acdb?.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {/* DCDB Dropdown */}
      <select name="dcdb">
        <option value="">Select DCDB</option>
        {catalog?.dcdb?.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {/* Rest of form */}
    </form>
  );
};
```

---

### 4. Update Admin Product Management Component

**File:** `components/admin-product-management.tsx` (if exists)

**Changes needed:**

1. **Update API call to use new endpoint:**
```typescript
// Replace existing API call with:
const fetchCatalog = async () => {
  try {
    const response = await api.config.getProducts();
    if (response.success && response.data) {
      setCatalog(response.data);
    }
  } catch (error) {
    console.error('Error fetching catalog:', error);
  }
};

// Update catalog
const handleSave = async () => {
  try {
    const response = await api.config.updateProducts(catalog);
    if (response.success) {
      // Show success message
      toast.success('Product catalog updated successfully');
    }
  } catch (error) {
    // Handle error
    if (error.response?.data?.error?.code === 'VAL_001') {
      // Show validation errors
      const details = error.response.data.error.details || [];
      const errorMessages = details.map((d: any) => d.message).join('\n');
      toast.error(`Validation errors:\n${errorMessages}`);
    } else {
      toast.error('Failed to update product catalog');
    }
  }
};
```

---

### 5. Error Handling

**Update error handling to match backend error codes:**

```typescript
// Error handling helper
const handleApiError = (error: any) => {
  if (error.response?.data?.error) {
    const { code, message, details } = error.response.data.error;
    
    switch (code) {
      case 'AUTH_003':
        // User not authenticated
        // Redirect to login
        router.push('/login');
        break;
      case 'AUTH_004':
        // Insufficient permissions
        toast.error('Admin access required');
        break;
      case 'VAL_001':
        // Validation error
        if (details && Array.isArray(details)) {
          const errorMessages = details.map((d: any) => d.message).join('\n');
          toast.error(`Validation errors:\n${errorMessages}`);
        } else {
          toast.error(message || 'Validation error');
        }
        break;
      case 'SYS_001':
        // Internal server error
        toast.error('Server error. Please try again later.');
        break;
      default:
        toast.error(message || 'An error occurred');
    }
  } else {
    toast.error('Network error. Please check your connection.');
  }
};
```

---

## Implementation Checklist

### API Client
- [ ] Add `config.getProducts()` method
- [ ] Add `config.updateProducts()` method
- [ ] Add `quotations.getProductCatalog()` method
- [ ] Define `ProductCatalog` TypeScript interface

### Hooks
- [ ] Create or update `useProductCatalog()` hook
- [ ] Handle loading states
- [ ] Handle error states
- [ ] Provide default empty catalog on error

### Product Selection Form
- [ ] Import `useProductCatalog` hook
- [ ] Replace hardcoded dropdown options with API data
- [ ] Update all product selection dropdowns:
  - [ ] Panel brands
  - [ ] Panel sizes
  - [ ] Inverter types
  - [ ] Inverter brands
  - [ ] Inverter sizes
  - [ ] Structure types
  - [ ] Structure sizes
  - [ ] Meter brands
  - [ ] AC cable brands
  - [ ] AC cable sizes
  - [ ] DC cable brands
  - [ ] DC cable sizes
  - [ ] ACDB options
  - [ ] DCDB options
- [ ] Add loading state UI
- [ ] Add error handling

### Admin Product Management
- [ ] Update GET request to use `api.config.getProducts()`
- [ ] Update PUT request to use `api.config.updateProducts()`
- [ ] Handle validation errors from backend
- [ ] Display field-level validation errors

### Error Handling
- [ ] Implement error code handling
- [ ] Handle `AUTH_003` (not authenticated)
- [ ] Handle `AUTH_004` (insufficient permissions)
- [ ] Handle `VAL_001` (validation errors)
- [ ] Handle `SYS_001` (server errors)
- [ ] Show user-friendly error messages

---

## Testing Checklist

### Product Selection Form
- [ ] Catalog loads on component mount
- [ ] All dropdowns populate with correct data
- [ ] Loading state displays while fetching
- [ ] Error state handles gracefully (shows empty dropdowns)
- [ ] Form submission works with selected values

### Admin Product Management
- [ ] Catalog loads on page load
- [ ] Can update catalog successfully
- [ ] Validation errors display correctly
- [ ] Success message shows after update
- [ ] Updated catalog reflects in product selection form

### Error Scenarios
- [ ] Handles network errors gracefully
- [ ] Handles authentication errors (redirects to login)
- [ ] Handles authorization errors (shows permission message)
- [ ] Handles validation errors (shows field-level errors)
- [ ] Handles server errors (shows generic error message)

---

## Example Integration Flow

### 1. User Opens Quotation Form
```
User → Opens form → useProductCatalog() hook → GET /api/quotations/product-catalog → Populates dropdowns
```

### 2. Admin Updates Catalog
```
Admin → Opens admin panel → GET /api/config/products → Edits catalog → PUT /api/config/products → Success
```

### 3. User Creates Quotation
```
User → Fills form with catalog data → Submits → POST /api/quotations → Backend validates against catalog → Success
```

---

## Important Notes

1. **Always use arrays**: The API guarantees all fields are arrays (never `null` or `undefined`). Always use optional chaining and provide fallback empty arrays.

2. **Error handling**: Always handle errors gracefully. If the catalog fails to load, show empty dropdowns rather than breaking the form.

3. **Loading states**: Show loading indicators while fetching the catalog to improve UX.

4. **Caching**: Consider caching the catalog data to reduce API calls. The catalog doesn't change frequently.

5. **Real-time updates**: If admin updates the catalog, consider refreshing the product selection form or showing a notification.

---

## API Endpoint Summary

| Endpoint | Method | Purpose | Auth | Authorization |
|----------|--------|---------|------|---------------|
| `/api/config/products` | GET | Get catalog (admin) | ✅ | Any authenticated |
| `/api/config/products` | PUT | Update catalog | ✅ | Admin only |
| `/api/quotations/product-catalog` | GET | Get catalog (quotations) | ✅ | Dealer/Admin/Visitor |

---

## Support

If you encounter any issues:

1. Check browser console for API errors
2. Verify authentication token is valid
3. Check network tab for API request/response
4. Verify error codes match backend specification
5. Ensure all required fields are provided in PUT requests

---

**Last Updated:** December 26, 2025  
**Backend Status:** ✅ Complete  
**Frontend Status:** ⚠️ Implementation Required


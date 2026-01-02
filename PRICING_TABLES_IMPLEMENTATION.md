# Pricing Tables Implementation

**Date:** December 26, 2025  
**Status:** ✅ Complete

---

## Overview

This document describes the backend implementation of pricing tables API endpoints that support the frontend pricing system. The pricing tables store component pricing, system pricing, and system configuration presets.

---

## API Endpoints

### 1. GET /api/config/pricing

**Purpose:** Get all pricing tables  
**Authentication:** Required (Bearer token)  
**Authorization:** Any authenticated user

**Response:**
```json
{
  "success": true,
  "data": {
    "panels": [
      { "brand": "Adani", "size": "440W", "price": 25000 },
      { "brand": "Adani", "size": "545W", "price": 31000 }
    ],
    "inverters": [
      { "brand": "Growatt", "size": "3kW", "price": 35000 },
      { "brand": "Growatt", "size": "5kW", "price": 58000 }
    ],
    "structures": [
      { "type": "GI Structure", "size": "1kW", "price": 8000 }
    ],
    "meters": [
      { "brand": "L&T", "price": 5000 }
    ],
    "cables": [
      { "brand": "Polycab", "size": "4 sq mm", "type": "AC", "price": 3000 }
    ],
    "acdb": [
      { "option": "1-String", "price": 2500 }
    ],
    "dcdb": [
      { "option": "1-String", "price": 2500 }
    ],
    "dcr": [
      {
        "systemSize": "3kW",
        "phase": "1-Phase",
        "inverterSize": "3kW",
        "panelType": "Adani",
        "price": 185000
      }
    ],
    "nonDcr": [
      {
        "systemSize": "3kW",
        "phase": "1-Phase",
        "inverterSize": "3kW",
        "panelType": "Adani",
        "price": 200000
      }
    ],
    "both": [
      {
        "systemSize": "5kW",
        "phase": "3-Phase",
        "inverterSize": "5kW",
        "dcrCapacity": "3kW",
        "nonDcrCapacity": "2kW",
        "panelType": "Adani",
        "price": 260000
      }
    ],
    "systemConfigs": [
      {
        "systemType": "dcr",
        "systemSize": "3kW",
        "panelBrand": "Adani",
        "panelSize": "545W",
        "inverterBrand": "Polycab",
        "inverterSize": "3kW",
        "inverterType": "String Inverter",
        "structureType": "GI Structure",
        "structureSize": "3kW",
        "meterBrand": "Havells",
        "acCableBrand": "Polycab",
        "acCableSize": "6 sq mm",
        "dcCableBrand": "Polycab",
        "dcCableSize": "4 sq mm",
        "acdb": "1-String",
        "dcdb": "1-String"
      }
    ]
  }
}
```

**Notes:**
- Returns empty arrays if no pricing data exists
- All arrays are guaranteed to be arrays (never null/undefined)

---

### 2. PUT /api/config/pricing

**Purpose:** Update pricing tables  
**Authentication:** Required (Bearer token)  
**Authorization:** Admin role required

**Request Body:**
```json
{
  "panels": [
    { "brand": "Adani", "size": "440W", "price": 25000 }
  ],
  "inverters": [
    { "brand": "Growatt", "size": "3kW", "price": 35000 }
  ],
  "structures": [
    { "type": "GI Structure", "size": "1kW", "price": 8000 }
  ],
  "meters": [
    { "brand": "L&T", "price": 5000 }
  ],
  "cables": [
    { "brand": "Polycab", "size": "4 sq mm", "type": "AC", "price": 3000 }
  ],
  "acdb": [
    { "option": "1-String", "price": 2500 }
  ],
  "dcdb": [
    { "option": "1-String", "price": 2500 }
  ],
  "dcr": [
    {
      "systemSize": "3kW",
      "phase": "1-Phase",
      "inverterSize": "3kW",
      "panelType": "Adani",
      "price": 185000
    }
  ],
  "nonDcr": [
    {
      "systemSize": "3kW",
      "phase": "1-Phase",
      "inverterSize": "3kW",
      "panelType": "Adani",
      "price": 200000
    }
  ],
  "both": [
    {
      "systemSize": "5kW",
      "phase": "3-Phase",
      "inverterSize": "5kW",
      "dcrCapacity": "3kW",
      "nonDcrCapacity": "2kW",
      "panelType": "Adani",
      "price": 260000
    }
  ],
  "systemConfigs": [
    {
      "systemType": "dcr",
      "systemSize": "3kW",
      "panelBrand": "Adani",
      "panelSize": "545W",
      "inverterBrand": "Polycab",
      "inverterSize": "3kW",
      "inverterType": "String Inverter",
      "structureType": "GI Structure",
      "structureSize": "3kW",
      "meterBrand": "Havells",
      "acCableBrand": "Polycab",
      "acCableSize": "6 sq mm",
      "dcCableBrand": "Polycab",
      "dcCableSize": "4 sq mm",
      "acdb": "1-String",
      "dcdb": "1-String"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pricing tables updated successfully",
  "data": {
    // Normalized pricing tables (same structure as GET response)
  }
}
```

**Validation:**
- All pricing entries must have required fields
- Prices must be non-negative numbers
- Cable type must be "AC" or "DC"
- Phase must be "1-Phase" or "3-Phase"
- System type must be "dcr", "non-dcr", or "both"
- At least one pricing category must be provided

**Error Responses:**
- `400` - Validation error with field-level details
- `401` - Unauthorized
- `403` - Forbidden (Admin access required)
- `500` - Internal server error

---

## Data Structure

### Component Pricing

#### Panel Pricing
```typescript
{
  brand: string;      // e.g., "Adani", "Tata", "Waaree"
  size: string;       // e.g., "440W", "545W"
  price: number;      // Price per panel
}
```

#### Inverter Pricing
```typescript
{
  brand: string;      // e.g., "Growatt", "Solis", "Fronius"
  size: string;       // e.g., "3kW", "5kW", "6kW"
  price: number;      // Price per inverter
}
```

#### Structure Pricing
```typescript
{
  type: string;       // e.g., "GI Structure", "Aluminum Structure"
  size: string;       // e.g., "1kW", "3kW", "5kW"
  price: number;      // Price per kW or total
}
```

#### Meter Pricing
```typescript
{
  brand: string;      // e.g., "L&T", "HPL", "Havells"
  price: number;      // Price per meter
}
```

#### Cable Pricing
```typescript
{
  brand: string;       // e.g., "Polycab", "Havells", "KEI"
  size: string;       // e.g., "4 sq mm", "6 sq mm"
  type: "AC" | "DC";  // Cable type
  price: number;      // Price per meter or fixed price
}
```

#### ACDB/DCDB Pricing
```typescript
{
  option: string;      // e.g., "1-String", "2-String", "3-String"
  price: number;      // Price per option
}
```

### System Pricing

#### DCR/Non-DCR System Pricing
```typescript
{
  systemSize: string;        // e.g., "3kW", "5kW", "10kW"
  phase: "1-Phase" | "3-Phase";
  inverterSize: string;     // e.g., "3kW", "5kW"
  panelType: string;        // e.g., "Adani", "Waaree", "Tata"
  price: number;            // Total system price
  notes?: string;           // Optional notes
}
```

#### BOTH System Pricing (DCR + Non-DCR)
```typescript
{
  systemSize: string;        // Total system size
  phase: "1-Phase" | "3-Phase";
  inverterSize: string;
  dcrCapacity: string;       // DCR capacity (e.g., "3kW")
  nonDcrCapacity: string;     // Non-DCR capacity (e.g., "2kW")
  panelType: string;
  price: number;             // Total system price
}
```

### System Configuration Presets

```typescript
{
  systemType: "dcr" | "non-dcr" | "both";
  systemSize: string;         // e.g., "3kW", "5kW"
  panelBrand: string;
  panelSize: string;
  inverterBrand: string;
  inverterSize: string;
  inverterType: string;
  structureType: string;
  structureSize: string;
  meterBrand: string;
  acCableBrand: string;
  acCableSize: string;
  dcCableBrand: string;
  dcCableSize: string;
  acdb: string;
  dcdb: string;
}
```

---

## Database Storage

Pricing tables are stored in the `system_config` table:
- **configKey:** `pricing_tables`
- **configValue:** JSON string of pricing tables
- **dataType:** `json`
- **category:** `pricing`

---

## Files Created/Modified

### New Files
1. **`validations/pricingValidations.ts`**
   - Zod schemas for all pricing table structures
   - Validation for component pricing, system pricing, and presets

### Modified Files
1. **`controllers/configController.ts`**
   - Added `getPricingTables()` function
   - Added `updatePricingTables()` function
   - Added `normalizePricingTables()` helper

2. **`routes/configRoutes.ts`**
   - Added `GET /api/config/pricing` route
   - Added `PUT /api/config/pricing` route
   - Added Swagger documentation

---

## Validation Rules

### Component Pricing
- All fields are required
- Prices must be non-negative numbers
- Cable type must be "AC" or "DC"

### System Pricing
- All fields are required (except `notes`)
- Phase must be "1-Phase" or "3-Phase"
- Prices must be non-negative numbers
- BOTH systems require `dcrCapacity` and `nonDcrCapacity`

### System Configuration Presets
- All fields are required
- System type must be "dcr", "non-dcr", or "both"

### General
- At least one pricing category must be provided
- All arrays are normalized to be arrays (never null/undefined)

---

## Error Codes

- `VAL_001` - Validation error (with field-level details)
- `AUTH_003` - User not authenticated
- `AUTH_004` - Insufficient permissions (Admin access required)
- `SYS_001` - Internal server error

---

## Usage Example

### Frontend Integration

```typescript
// Get pricing tables
const response = await fetch('/api/config/pricing', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data } = await response.json();

// Use pricing data
const panelPrice = data.panels.find(
  p => p.brand === 'Adani' && p.size === '545W'
)?.price || 0;

// Update pricing tables (Admin only)
await fetch('/api/config/pricing', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    panels: [
      { brand: 'Adani', size: '545W', price: 31000 }
    ],
    // ... other pricing categories
  })
});
```

---

## Next Steps

### Backend
1. ✅ Pricing tables API endpoints created
2. ✅ Validation schemas implemented
3. ✅ Database storage configured
4. ⚠️ **TODO:** Integrate pricing tables into quotation pricing calculation
5. ⚠️ **TODO:** Add helper functions to lookup prices from tables

### Frontend
1. Use `GET /api/config/pricing` to fetch pricing data
2. Use `PUT /api/config/pricing` to update pricing (Admin only)
3. Integrate pricing tables into quotation forms
4. Use system configuration presets to auto-populate forms

---

## Notes

- Pricing tables are stored as JSON in the database
- All arrays are normalized to ensure they're never null/undefined
- Validation ensures data integrity
- Admin-only access for updates ensures data security
- Pricing tables can be updated independently of product catalog

---

**Last Updated:** December 26, 2025  
**Status:** ✅ API Endpoints Complete  
**Next:** Integrate pricing tables into quotation calculations


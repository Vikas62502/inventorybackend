# Login Systems Documentation

## Overview

There are **TWO separate login systems** in this application:

1. **Inventory System** - For managing inventory (Super Admin, Admin, Agent, Account)
2. **Quotation System** - For managing quotations (Dealers, Visitors, Admin)

---

## 1. Inventory System Login

### Endpoint
```
POST /api/inventory-auth/login
```

### Database Table
- **Table:** `users`
- **Model:** `User`

### Default Credentials
- **Username:** `superadmin`
- **Password:** `admin123`
- **Role:** `super-admin`

### Initialize Super Admin
```bash
npx ts-node scripts/initSuperAdmin.ts
```

### Supported Roles
- `super-admin` - Full system access
- `admin` - Admin level access
- `agent` - Agent level access
- `account` - Account manager access

### Response Format
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "username": "superadmin",
    "name": "Super Admin",
    "role": "super-admin"
  }
}
```

---

## 2. Quotation System Login

### Endpoint
```
POST /api/auth/login
```

### Database Table
- **Table:** `dealers` (for dealers and admin)
- **Table:** `visitors` (for visitors)
- **Models:** `Dealer`, `Visitor`

### Default Credentials
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** `admin`

### Initialize Quotation Admin
```bash
npx ts-node scripts/initQuotationAdmin.ts
```

### Supported Roles
- `admin` - Quotation system admin
- `dealer` - Dealer users
- `visitor` - Visitor users

### Response Format
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "dealer_id",
      "username": "admin",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@chairbord.com",
      "role": "admin"
    },
    "expiresIn": 3600
  }
}
```

---

## Quick Reference

| System | Endpoint | Username | Password | Table |
|--------|----------|----------|----------|-------|
| **Inventory** | `/api/inventory-auth/login` | `superadmin` | `admin123` | `users` |
| **Quotation** | `/api/auth/login` | `admin` | `admin123` | `dealers` |

---

## Troubleshooting

### Error: "Invalid username or password"

**For Inventory System:**
1. Check if superadmin exists: Run `npx ts-node scripts/initSuperAdmin.ts`
2. Verify you're using endpoint: `/api/inventory-auth/login`
3. Verify username: `superadmin` (not `admin`)

**For Quotation System:**
1. Check if admin exists: Run `npx ts-node scripts/initQuotationAdmin.ts`
2. Verify you're using endpoint: `/api/auth/login`
3. Verify username: `admin` (not `superadmin`)
4. Check if account is active: The script will activate it automatically

### Error: "Account is pending approval"

**For Quotation System:**
- The dealer/admin account exists but `isActive = false`
- Run `npx ts-node scripts/initQuotationAdmin.ts` to activate the account

---

## Frontend Integration

### Inventory System Frontend
```typescript
// Use this endpoint for Inventory System
POST /api/inventory-auth/login
Body: { "username": "superadmin", "password": "admin123" }
```

### Quotation System Frontend
```typescript
// Use this endpoint for Quotation System
POST /api/auth/login
Body: { "username": "admin", "password": "admin123" }
```

---

## Important Notes

1. **DO NOT** use `/api/auth/login` for Inventory System users
2. **DO NOT** use `/api/inventory-auth/login` for Quotation System users
3. Each system has its own authentication middleware and user models
4. Tokens from one system cannot be used with the other system's endpoints

---

**Last Updated:** December 25, 2025



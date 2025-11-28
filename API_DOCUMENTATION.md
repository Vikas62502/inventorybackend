# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-token>
```

---

## Authentication Endpoints

### Login
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "username": "superadmin",
  "password": "admin123"
}
```

**Notes:**
- Returns HTTP 401 with `{"error": "Account is inactive"}` for users awaiting approval.

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "username": "superadmin",
    "name": "Super Admin",
    "role": "super-admin"
  }
}
```

### Get Current User
**GET** `/api/auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "1",
  "username": "superadmin",
  "name": "Super Admin",
  "role": "super-admin",
  "created_at": "2024-01-01T00:00:00.000Z",
  "is_active": true
}
```

---

## Users Endpoints

> **⚠️ Important:** All user endpoints require JWT authentication. You must first login using `/api/auth/login` to obtain a token, then include it in the `Authorization: Bearer <token>` header for all requests below.

### Get All Users
**GET** `/api/users?role=admin`

**Query Parameters:**
- `role` (optional): Filter by role

**Response Fields:** `id`, `username`, `name`, `role`, `is_active`, `created_by_id`, `created_by_name`, timestamps

**Required Role:** super-admin, admin

**Headers:** `Authorization: Bearer <token>`

**Example Request:**
```
GET /api/users?role=admin
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
[
  {
    "id": "2",
    "username": "admin1",
    "name": "Admin 1",
    "role": "admin",
    "is_active": true,
    "created_by_id": "1",
    "created_by_name": "Super Admin",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### Get User by ID
**GET** `/api/users/:id`

**Required Role:** super-admin, admin

**Headers:** `Authorization: Bearer <token>`

**Example Request:**
```
GET /api/users/1
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "id": "1",
  "username": "superadmin",
  "name": "Super Admin",
  "role": "super-admin",
  "is_active": true,
  "created_by_id": null,
  "created_by_name": null,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Note:** You must first login using `/api/auth/login` to obtain a JWT token, then include it in the Authorization header for this endpoint.

### Create User
**POST** `/api/users`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "username": "newagent",
  "password": "Password123!",
  "name": "New Agent",
  "role": "agent"
}
```

**Creation Rules:**
- Super Admins may create any role (new users are activated immediately).
- Admins may create *agents only* (new agents start inactive until approved).

**Required Role:** super-admin, admin

### Update User
**PUT** `/api/users/:id`

**Request Body (partial updates allowed):**
```json
{
  "name": "Updated Name",
  "is_active": true
}
```

**Required Role:** super-admin

### Delete User
**DELETE** `/api/users/:id`

**Required Role:** super-admin

---

## Postman Collection (Login & Register)

Import the JSON below into Postman (collection v2.1).  
Set the `baseUrl` variable (e.g. `http://localhost:3000/api`) and update the `token` variable after logging in.

```json
{
  "info": {
    "_postman_id": "chairbord-auth-collection",
    "name": "Chairbord Auth & Users",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Login (obtain JWT)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\\n  \\"username\\": \\"superadmin\\",\\n  \\"password\\": \\"admin123\\"\\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/auth/login",
          "host": ["{{baseUrl}}"],
          "path": ["auth", "login"]
        }
      }
    },
    {
      "name": "Register User (requires token)",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\\n  \\"username\\": \\"newagent\\",\\n  \\"password\\": \\"Password123!\\",\\n  \\"name\\": \\"New Agent\\",\\n  \\"role\\": \\"agent\\"\\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/users",
          "host": ["{{baseUrl}}"],
          "path": ["users"]
        }
      }
    }
  ],
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3000/api" },
    { "key": "token", "value": "" }
  ]
}
```
> Run **Login** first, copy the `token` from the response into the collection/environment variable, then execute **Register User**.

---

## Categories Endpoint

### Get All Categories
**GET** `/api/categories`

Returns distinct category labels derived from the current product catalog.  
**Public endpoint** (no authentication required)

### Get Category by Label
**GET** `/api/categories/:label`

Checks if any product currently uses the provided category label. Responds with `404` if no products exist for the label.  
**Public endpoint**

> ℹ️ Category records are no longer managed as a separate table. Assign category labels directly when creating or updating products. POST/PUT/DELETE requests to `/api/categories` respond with an error message explaining this change.

---

## Products Endpoints

### Get All Products
**GET** `/api/products?category=Panels&search=panel`

**Query Parameters:**
- `category` (optional): Filter by category label
- `search` (optional): Search by name or model

**Public endpoint**

### Get Product by ID
**GET** `/api/products/:id`

**Public endpoint**

### Get Inventory Levels
**GET** `/api/products/inventory/levels`

**Response:**
```json
[
  {
    "id": "1",
    "name": "Tata Panel",
    "model": "TP-400W",
    "category": "Panels",
    "central_stock": 500,
    "distributed_stock": 75,
    "total_stock": 575
  }
]
```

**Required:** Authentication

### Create Product
**POST** `/api/products`

**Request Body (multipart/form-data or JSON):**
```json
{
  "name": "Tata Panel",
  "model": "TP-400W",
  "category": "Panels",
  "wattage": "400W",
  "quantity": 500,
  "unit_price": 220.00,
  "image": "(optional file upload)"
}
```

**Required Role:** super-admin

### Update Product
**PUT** `/api/products/:id`

**Required Role:** super-admin

### Delete Product
**DELETE** `/api/products/:id`

**Required Role:** super-admin

---

## Admin Inventory Endpoints

### Get All Admin Inventory
**GET** `/api/admin-inventory?admin_id=2`

**Query Parameters:**
- `admin_id` (optional): Filter by admin

**Required:** Authentication

### Get Inventory for Specific Admin
**GET** `/api/admin-inventory/admin/:adminId`

**Required:** Authentication

### Create/Update Admin Inventory
**POST** `/api/admin-inventory`

**Request Body:**
```json
{
  "admin_id": "2",
  "product_id": "1",
  "quantity": 50
}
```

**Required Role:** super-admin

### Update Admin Inventory
**PUT** `/api/admin-inventory/:id`

**Required Role:** super-admin

### Delete Admin Inventory
**DELETE** `/api/admin-inventory/:id`

**Required Role:** super-admin

---

## Stock Requests Endpoints

### Get All Stock Requests
**GET** `/api/stock-requests?status=pending&requested_by_id=2`

**Query Parameters:**
- `status` (optional): Filter by status
- `requested_by_id` (optional): Filter by requester
- `requested_from` (optional): Filter by source

**Required:** Authentication

### Get Stock Request by ID
**GET** `/api/stock-requests/:id`

**Required:** Authentication

### Create Stock Request
**POST** `/api/stock-requests`

**Request Body:**
```json
{
  "requested_from": "super-admin",
  "items": [
    {
      "product_id": "1",
      "quantity": 40
    },
    {
      "product_id": "5",
      "quantity": 10
    }
  ],
  "notes": "Urgent requirement"
}
```

**Required Role:** admin, agent

### Dispatch Stock Request
**POST** `/api/stock-requests/:id/dispatch`

**Request Body (multipart/form-data):**
- `rejection_reason` (optional): If rejecting
- `dispatch_image`: Image file (optional)

**Required Role:** super-admin, admin

### Confirm Stock Request
**POST** `/api/stock-requests/:id/confirm`

**Request Body (multipart/form-data):**
- `confirmation_image`: Image file (optional)

**Required:** Must be the requester

### Update Stock Request
**PUT** `/api/stock-requests/:id`

**Request Body (partial updates allowed):**
```json
{
  "items": [
    {
      "product_id": "1",
      "quantity": 50
    },
    {
      "product_id": "5",
      "quantity": 15
    }
  ],
  "notes": "Updated requirement"
}
```

**Notes:**
- `items` (optional): Array of items to replace existing items. Each item must include `product_id` and `quantity`. If provided, all existing items will be replaced.
- `notes` (optional): Updated notes for the request.
- Only one or both fields can be provided - partial updates are allowed.

**Required:** Must be the requester, status must be pending

**Headers:** `Authorization: Bearer <token>`

### Delete Stock Request
**DELETE** `/api/stock-requests/:id`

**Required:** Must be the requester or super-admin, status must be pending

---

## Sales Endpoints

### Get All Sales
**GET** `/api/sales?type=B2B&payment_status=completed&start_date=2024-01-01&end_date=2024-12-31`

**Query Parameters:**
- `type` (optional): B2B or B2C
- `payment_status` (optional): pending or completed
- `customer_name` (optional): Search by customer name
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date

**Required:** Authentication

### Get Sales Summary
**GET** `/api/sales/summary`

**Response:**
```json
[
  {
    "type": "B2B",
    "payment_status": "completed",
    "sale_count": 10,
    "total_quantity": 150,
    "total_revenue": 50000.00,
    "total_subtotal": 46000.00
  }
]
```

**Required:** Authentication

### Get Sale by ID
**GET** `/api/sales/:id`

**Required:** Authentication

### Create Sale
**POST** `/api/sales`

**Request Body (multipart/form-data or JSON):**
```json
{
  "type": "B2B",
  "customer_name": "GreenEnergy Corp",
  "items": [
    { "product_id": "1", "quantity": 80, "unit_price": 220.00, "gst_rate": 10.0 },
    { "product_id": "3", "quantity": 20, "unit_price": 350.00, "gst_rate": 10.0 }
  ],
  "tax_amount": 2460.00,
  "discount_amount": 0,
  "billing_address_id": "addr1",
  "delivery_address_id": "addr2",
  "delivery_matches_billing": false,
  "company_name": "GreenEnergy Corp",
  "gst_number": "27AAACG1234R1Z5",
  "contact_person": "Anita Sharma",
  "customer_email": "contact@greenenergy.example",
  "customer_phone": "+91-9876543210",
  "notes": "Deliver in staggered batches",
  "image": "(optional file upload)"
}
```

`items[].gst_rate` is optional; omit it to default to `0`.

**Required Role:** agent, admin

### Update Sale
**PUT** `/api/sales/:id`

**Required:** Creator, admin, or super-admin

### Confirm B2B Bill
**POST** `/api/sales/:id/confirm-bill`

**Request Body (multipart/form-data):**
- `bill_image`: Bill image file

**Required Role:** account

### Delete Sale
**DELETE** `/api/sales/:id`

**Required:** Creator or super-admin

---

## Inventory Transactions Endpoints

### Get All Transactions
**GET** `/api/inventory-transactions?product_id=1&transaction_type=sale&start_date=2024-01-01`

**Query Parameters:**
- `product_id` (optional): Filter by product
- `transaction_type` (optional): Filter by type
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date

**Required:** Authentication

### Get Transaction by ID
**GET** `/api/inventory-transactions/:id`

**Required:** Authentication

### Create Transaction
**POST** `/api/inventory-transactions`

**Request Body:**
```json
{
  "product_id": "1",
  "transaction_type": "adjustment",
  "quantity": 10,
  "reference": "manual-adjustment",
  "notes": "Manual inventory adjustment",
  "related_stock_request_id": null,
  "related_sale_id": null
}
```

**Required Role:** super-admin, admin

---

## Stock Returns Endpoints

### Get All Stock Returns
**GET** `/api/stock-returns?admin_id=2&status=pending`

**Query Parameters:**
- `admin_id` (optional): Filter by admin
- `status` (optional): Filter by status
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date

**Required:** Authentication

### Get Stock Return by ID
**GET** `/api/stock-returns/:id`

**Required:** Authentication

### Create Stock Return
**POST** `/api/stock-returns`

**Request Body:**
```json
{
  "product_id": "1",
  "quantity": 10,
  "reason": "Excess stock"
}
```

**Required Role:** admin

### Process Stock Return
**POST** `/api/stock-returns/:id/process`

**Required Role:** super-admin

### Update Stock Return
**PUT** `/api/stock-returns/:id`

**Required:** Admin or super-admin, status must be pending

### Delete Stock Return
**DELETE** `/api/stock-returns/:id`

**Required:** Admin or super-admin, status must be pending

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message here"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## File Uploads

For endpoints that accept file uploads, use `multipart/form-data` content type.

**Supported file types:** JPEG, JPG, PNG, GIF, PDF
**Max file size:** 5MB (configurable via `MAX_FILE_SIZE` in `.env`)

Uploaded files are accessible at:
```
http://localhost:3000/uploads/<filename>
```




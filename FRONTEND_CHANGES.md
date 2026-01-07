# Frontend Integration Guide - Visitor List & Visit Schedule Updates

## Overview
This document explains the API changes made to support visitor list functionality and enhanced visit schedule with full visitor details.

---

## 1. NEW ENDPOINT: Get Visitors List

### Endpoint
```
GET /api/dealers/visitors
```

### Purpose
Retrieve the list of visitors that dealers can assign to visits. This endpoint is used to populate the visitor dropdown in the visit scheduling form.

### Authentication
- **Required**: Yes (Bearer token)
- **Role**: Dealer only

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by name, email, mobile, or employee ID |
| `isActive` | boolean | No | Filter by active status. If not specified, returns ALL visitors (both active and inactive) |

### Request Example
```javascript
// Get all visitors
GET /api/dealers/visitors
Authorization: Bearer <token>

// Search for visitors
GET /api/dealers/visitors?search=john
Authorization: Bearer <token>

// Get only active visitors
GET /api/dealers/visitors?isActive=true
Authorization: Bearer <token>
```

### Response Format
```json
{
  "success": true,
  "data": {
    "visitors": [
      {
        "id": "visitor_123",
        "username": "visitor123",
        "firstName": "John",
        "lastName": "Doe",
        "fullName": "John Doe",
        "email": "john.doe@example.com",
        "mobile": "9876543210",
        "employeeId": "EMP001",
        "isActive": true,
        "createdAt": "2025-12-23T10:00:00.000Z"
      }
    ]
  }
}
```

### Frontend Implementation
```typescript
// Example: Fetch visitors for dropdown
const fetchVisitors = async () => {
  try {
    const response = await fetch('/api/dealers/visitors', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    
    if (data.success) {
      setVisitors(data.data.visitors);
    }
  } catch (error) {
    console.error('Error fetching visitors:', error);
  }
};
```

### Important Notes
- **Empty List**: If no visitors exist, the API returns an empty array `[]`. Visitors must be created by an admin first using `POST /api/admin/visitors`.
- **All Visitors**: By default, the endpoint returns ALL visitors (active and inactive). Use `?isActive=true` to filter only active visitors.
- **Display**: Use `fullName` for display in dropdowns, or combine `firstName` and `lastName`.

---

## 2. NEW ENDPOINT: Get Visit Schedule

### Endpoint
```
GET /api/visits
```

### Purpose
Retrieve all visits for the authenticated dealer with complete visitor details. This is the main endpoint for displaying the visit schedule.

### Authentication
- **Required**: Yes (Bearer token)
- **Role**: Dealer only

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 20, max: 100) |
| `status` | string | No | Filter by status: `pending`, `approved`, `completed`, `incomplete`, `rejected`, `rescheduled` |
| `startDate` | string (date) | No | Filter visits from this date (YYYY-MM-DD) |
| `endDate` | string (date) | No | Filter visits until this date (YYYY-MM-DD) |
| `search` | string | No | Search by customer name, location, or quotation ID |

### Request Example
```javascript
// Get all visits (paginated)
GET /api/visits?page=1&limit=20
Authorization: Bearer <token>

// Filter by status
GET /api/visits?status=pending
Authorization: Bearer <token>

// Filter by date range
GET /api/visits?startDate=2025-12-01&endDate=2025-12-31
Authorization: Bearer <token>

// Search visits
GET /api/visits?search=john
Authorization: Bearer <token>
```

### Response Format
```json
{
  "success": true,
  "data": {
    "visits": [
      {
        "id": "visit_123",
        "quotation": {
          "id": "quotation_456",
          "systemType": "On-Grid",
          "finalAmount": 500000
        },
        "customer": {
          "id": "customer_789",
          "firstName": "Jane",
          "lastName": "Smith",
          "fullName": "Jane Smith",
          "mobile": "9876543210",
          "email": "jane@example.com"
        },
        "visitDate": "2025-12-25",
        "visitTime": "10:00:00",
        "location": "123 Main Street, City",
        "locationLink": "https://maps.google.com/...",
        "notes": "Customer requested morning visit",
        "status": "pending",
        "length": null,
        "width": null,
        "height": null,
        "images": null,
        "feedback": null,
        "rejectionReason": null,
        "visitors": [
          {
            "visitorId": "visitor_123",
            "username": "visitor123",
            "firstName": "John",
            "lastName": "Doe",
            "fullName": "John Doe",
            "email": "john@example.com",
            "mobile": "9876543210",
            "employeeId": "EMP001",
            "isActive": true
          },
          {
            "visitorId": "visitor_456",
            "username": "visitor456",
            "firstName": "Alice",
            "lastName": "Johnson",
            "fullName": "Alice Johnson",
            "email": "alice@example.com",
            "mobile": "9876543211",
            "employeeId": "EMP002",
            "isActive": true
          }
        ],
        "createdAt": "2025-12-23T10:00:00.000Z",
        "updatedAt": "2025-12-23T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Frontend Implementation
```typescript
// Example: Fetch visit schedule
const fetchVisitSchedule = async (filters = {}) => {
  try {
    const params = new URLSearchParams({
      page: filters.page || '1',
      limit: filters.limit || '20',
      ...(filters.status && { status: filters.status }),
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate }),
      ...(filters.search && { search: filters.search })
    });

    const response = await fetch(`/api/visits?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    
    if (data.success) {
      setVisits(data.data.visits);
      setPagination(data.data.pagination);
    }
  } catch (error) {
    console.error('Error fetching visits:', error);
  }
};
```

### Important Notes
- **Visitor List**: Each visit now includes a complete `visitors` array with full visitor details (not just IDs).
- **Multiple Visitors**: A visit can have multiple visitors assigned.
- **Empty Visitors**: If no visitors are assigned, the `visitors` array will be empty `[]`.

---

## 3. UPDATED ENDPOINT: Create Visit

### Endpoint
```
POST /api/visits
```

### Changes
The response now includes **full visitor details** instead of just visitor IDs.

### Request Format (Unchanged)
```json
{
  "quotationId": "quotation_456",
  "visitDate": "2025-12-25",
  "visitTime": "10:00:00",
  "location": "123 Main Street, City",
  "locationLink": "https://maps.google.com/...",
  "notes": "Customer requested morning visit",
  "visitors": [
    {
      "visitorId": "visitor_123"
    },
    {
      "visitorId": "visitor_456"
    }
  ]
}
```

### Response Format (Updated)
```json
{
  "success": true,
  "data": {
    "id": "visit_123",
    "quotationId": "quotation_456",
    "dealerId": "dealer_789",
    "visitDate": "2025-12-25",
    "visitTime": "10:00:00",
    "location": "123 Main Street, City",
    "locationLink": "https://maps.google.com/...",
    "notes": "Customer requested morning visit",
    "status": "pending",
    "visitors": [
      {
        "visitorId": "visitor_123",
        "username": "visitor123",
        "firstName": "John",
        "lastName": "Doe",
        "fullName": "John Doe",
        "email": "john@example.com",
        "mobile": "9876543210",
        "employeeId": "EMP001",
        "isActive": true
      }
    ],
    "createdAt": "2025-12-23T10:00:00.000Z",
    "updatedAt": "2025-12-23T10:00:00.000Z"
  }
}
```

---

## 4. UPDATED ENDPOINT: Get Visits for Quotation

### Endpoint
```
GET /api/quotations/{quotationId}/visits
```

### Changes
The response now includes **full visitor details** for each visit.

### Response Format (Updated)
```json
{
  "success": true,
  "data": {
    "visits": [
      {
        "id": "visit_123",
        "visitDate": "2025-12-25",
        "visitTime": "10:00:00",
        "location": "123 Main Street, City",
        "locationLink": "https://maps.google.com/...",
        "status": "pending",
        "visitors": [
          {
            "visitorId": "visitor_123",
            "username": "visitor123",
            "firstName": "John",
            "lastName": "Doe",
            "fullName": "John Doe",
            "email": "john@example.com",
            "mobile": "9876543210",
            "employeeId": "EMP001",
            "isActive": true
          }
        ],
        "createdAt": "2025-12-23T10:00:00.000Z"
      }
    ]
  }
}
```

---

## 5. Frontend Integration Checklist

### For Visit Scheduling Form
- [ ] Call `GET /api/dealers/visitors` to fetch visitor list
- [ ] Populate dropdown with visitor data
- [ ] Display `fullName` or `firstName + lastName` in dropdown
- [ ] Handle empty visitor list (show message: "No visitors available")
- [ ] When creating visit, send `visitorId` in the `visitors` array

### For Visit Schedule Display
- [ ] Call `GET /api/visits` to fetch visit schedule
- [ ] Display visitor list for each visit using the `visitors` array
- [ ] Show visitor details: name, email, mobile, employee ID
- [ ] Handle pagination using the `pagination` object
- [ ] Implement filters: status, date range, search
- [ ] Display multiple visitors if assigned to a visit

### Error Handling
- [ ] Handle 401 Unauthorized (redirect to login)
- [ ] Handle 500 Internal Server Error (show error message)
- [ ] Handle empty responses gracefully
- [ ] Show loading states while fetching data

---

## 6. Example React Component

```typescript
import { useState, useEffect } from 'react';

interface Visitor {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  mobile: string;
  employeeId: string;
  isActive: boolean;
}

interface Visit {
  id: string;
  visitDate: string;
  visitTime: string;
  location: string;
  status: string;
  visitors: Visitor[];
  customer?: {
    firstName: string;
    lastName: string;
    fullName: string;
  };
}

const VisitSchedule = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch visitors for dropdown
  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        const response = await fetch('/api/dealers/visitors', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setVisitors(data.data.visitors);
        }
      } catch (error) {
        console.error('Error fetching visitors:', error);
      }
    };
    fetchVisitors();
  }, []);

  // Fetch visits
  useEffect(() => {
    const fetchVisits = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/visits?page=1&limit=20', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setVisits(data.data.visits);
        }
      } catch (error) {
        console.error('Error fetching visits:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVisits();
  }, []);

  return (
    <div>
      <h2>Visit Schedule</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          {visits.map(visit => (
            <div key={visit.id} className="visit-card">
              <h3>Visit on {visit.visitDate} at {visit.visitTime}</h3>
              <p>Location: {visit.location}</p>
              <p>Status: {visit.status}</p>
              
              {/* Display assigned visitors */}
              <div className="visitors-list">
                <h4>Assigned Visitors:</h4>
                {visit.visitors.length > 0 ? (
                  <ul>
                    {visit.visitors.map(visitor => (
                      <li key={visitor.visitorId}>
                        {visitor.fullName} ({visitor.employeeId})
                        <br />
                        <small>{visitor.email} | {visitor.mobile}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No visitors assigned</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VisitSchedule;
```

---

## 7. Summary of Changes

### New Features
1. ✅ **GET /api/dealers/visitors** - Get list of visitors for assignment
2. ✅ **GET /api/visits** - Get visit schedule with full visitor details

### Enhanced Responses
1. ✅ **POST /api/visits** - Now returns full visitor details in response
2. ✅ **GET /api/quotations/{quotationId}/visits** - Now includes full visitor details

### Key Improvements
- Visitors are now returned with complete information (name, email, mobile, employee ID)
- Visit schedule shows all assigned visitors with their details
- Better support for multiple visitors per visit
- Improved search and filtering capabilities

---

## 8. Migration Notes

### Breaking Changes
- **None** - All changes are backward compatible. Existing endpoints continue to work.

### Recommended Updates
- Update visit schedule UI to display visitor list
- Update visit creation form to use the new visitor endpoint
- Add visitor selection dropdown using the new endpoint

---

**Last Updated**: December 23, 2025


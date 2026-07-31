# API Specification

## Base URL

```
/api/v1
```

All endpoints return JSON.

---

# Response Format

Success

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

Error

```json
{
  "success": false,
  "message": "",
  "errors": []
}
```

---

# Authentication

```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh-token
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /auth/me
```

---

# Clients

```
GET    /clients
GET    /clients/:id
POST   /clients
PUT    /clients/:id
DELETE /clients/:id
```

---

# Projects

```
GET    /projects
GET    /projects/:id
POST   /projects
PUT    /projects/:id
DELETE /projects/:id
```

---

# Rooms

```
GET    /rooms
GET    /rooms/:id
POST   /rooms
PUT    /rooms/:id
DELETE /rooms/:id
```

---

# Furniture

```
GET    /furniture
GET    /furniture/:id
POST   /furniture
PUT    /furniture/:id
DELETE /furniture/:id
```

---

# Materials

```
GET    /materials
GET    /materials/:id
POST   /materials
PUT    /materials/:id
DELETE /materials/:id
```

---

# Measurement Engine

```
POST /measurements/calculate
```

Returns:

* Area
* Volume
* Material Area
* Edge Band
* Paint Area
* Hardware Quantity

---

# Cutting Engine

```
POST /cutting/calculate
```

Returns

* Panels
* Sheets
* Waste
* Remaining Material

---

# Cost Estimation

```
POST /cost-estimation/calculate
```

Returns

* Material Cost
* Labour Cost
* Manufacturing Cost
* Total Cost
* Profit
* GST
* Selling Price

---

# BOQ

```
POST /boq/generate
GET  /boq/:id
```

---

# Quotations

```
POST /quotations/generate
GET  /quotations
GET  /quotations/:id
PUT  /quotations/:id
DELETE /quotations/:id
```

---

# Reports

```
GET /reports/sales
GET /reports/material
GET /reports/profit
GET /reports/labour
GET /reports/client
```

---

# Settings

```
GET /settings
PUT /settings
```

---

# File Upload

```
POST /uploads
DELETE /uploads/:id
```

Supported

* PDF
* Images
* Excel
* DWG
* DXF

---

# Search

```
GET /search?q=
```

Searches

* Clients
* Projects
* Furniture
* Materials
* Quotations

---

# API Standards

Every endpoint must

* Validate input
* Require authentication unless public
* Return proper HTTP status codes
* Use pagination for collections
* Support filtering
* Support sorting
* Be documented in OpenAPI

# Database Schema

## Database

MongoDB

---

# Collections

* users
* clients
* projects
* rooms
* furniture
* materials
* quotations
* boq
* reports
* settings
* uploads
* notifications

---

# User

Fields

* name
* email
* password
* role
* phone
* avatar
* isActive
* createdAt
* updatedAt

---

# Client

* name
* phone
* email
* address
* gstNumber
* notes

Relationship

One Client → Many Projects

---

# Project

* clientId
* designerId
* projectName
* siteAddress
* status
* timeline
* notes

Relationship

One Project → Many Rooms

---

# Room

* projectId
* name
* width
* length
* height
* wallFinish
* floorFinish
* ceilingFinish

Relationship

One Room → Many Furniture Items

---

# Furniture

* roomId
* category
* width
* height
* depth
* shelves
* drawers
* shutters
* materialId
* finish
* hardware

---

# Material

* sku
* brand
* category
* thickness
* sheetSize
* unit
* purchaseRate
* sellingRate
* gst
* supplier

---

# Quotation

* projectId
* quotationNumber
* subtotal
* discount
* gst
* total
* status

---

# BOQ

* quotationId
* materialId
* quantity
* unit
* rate
* amount

---

# Upload

* projectId
* fileName
* fileType
* cloudinaryId
* url

---

# Settings

* companyName
* logo
* gstNumber
* currency
* taxes
* labourRates
* profitMargin

---

# Common Fields

Every collection includes

* _id
* createdAt
* updatedAt

Use timestamps.

Use indexes where appropriate.

Soft delete should be considered for business entities.

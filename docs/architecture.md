# System Architecture

## Overview

The AI Interior Estimation & Quotation Platform is designed as a modular SaaS application following Clean Architecture and Domain-Driven Design principles.

The system consists of two independent applications:

```text
frontend/
backend/
```

Communication occurs exclusively through REST APIs.

---

# High-Level Architecture

```
                Browser
                    │
                    ▼
        Next.js Frontend (UI)
                    │
             REST API (HTTPS)
                    │
                    ▼
        Express Backend (API)
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
    MongoDB               Cloudinary
        │
        ▼
 Business Engines
```

---

# Frontend Responsibilities

The frontend is responsible only for presentation and user interaction.

Responsibilities:

* Authentication UI
* Dashboard
* CRUD Forms
* Tables
* Search
* Charts
* Responsive Design
* State Management
* File Upload UI
* API Consumption

The frontend must never:

* Access MongoDB
* Perform business calculations
* Store secrets
* Generate quotations

---

# Backend Responsibilities

The backend contains all business logic.

Responsibilities:

* Authentication
* Authorization
* Project Management
* Measurement Engine
* Material Engine
* Cost Estimation
* BOQ Generation
* Quotation Generation
* Reports
* PDF Export
* Excel Export
* File Upload
* AI Services

---

# Clean Architecture Layers

```
Presentation

↓

Controllers

↓

Services

↓

Repositories

↓

MongoDB
```

### Controllers

Receive requests.

Validate input.

Call services.

Return responses.

### Services

Business logic.

Calculations.

Workflow orchestration.

### Repositories

Database access only.

No business logic.

### Models

Database schema.

Validation.

Relationships.

---

# Feature Modules

Authentication

Client Management

Project Management

Room Planner

Furniture

Material Master

Measurement Engine

Cutting Optimization

Cost Engine

BOQ

Quotation

Reports

Settings

AI Assistant

Each feature should remain independent and reusable.

---

# Security

JWT Authentication

Refresh Tokens

Role-Based Access Control

Password Hashing

Rate Limiting

Input Validation

Helmet

CORS

Audit Logging

---

# Scalability

The architecture must support future modules:

* ERP
* Inventory
* CRM
* Manufacturing
* Vendor Management
* Purchase Orders
* Warehouse
* Mobile Application
* AI Interior Design
* 3D Visualization

No future module should require major refactoring.

---

# Deployment

Frontend

* Vercel

Backend

* Docker
* Railway
* Render
* Azure
* AWS

Database

* MongoDB Atlas

File Storage

* Cloudinary

---

# Development Workflow

1. Design
2. API
3. Database
4. Backend
5. Frontend
6. Testing
7. Documentation
8. Deployment

Each phase must be independently testable before proceeding.

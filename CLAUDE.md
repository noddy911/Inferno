# CLAUDE.md

# AI Interior Estimation & Quotation Platform

## Project Goal

Build a production-ready SaaS Interior Estimation & Quotation Platform.

Prioritize maintainability, scalability, performance, and clean architecture over implementation speed.

---

# Architecture

This project consists of two completely independent applications.

```
frontend/
backend/
```

The frontend and backend must never share business logic.

Communication is only through REST APIs.

---

# Frontend

Technology

- Next.js 15 App Router
- React
- JavaScript (Strict Mode)
- Tailwind CSS
- shadcn/ui
- Zustand
- TanStack Query
- React Hook Form
- Zod
- Framer Motion

Responsibilities

- UI
- Forms
- Authentication pages
- Dashboard
- CRUD screens
- Charts
- File uploads
- Responsive layout
- Dark mode

Never place business logic in the frontend.

---

# Backend

Technology

- Node.js
- Express
- JavaScript (Strict Mode)
- MongoDB
- Mongoose
- JWT
- Cloudinary
- Swagger
- Winston

Responsibilities

- Authentication
- Business logic
- Measurement engine
- Cost engine
- BOQ
- Quotation engine
- File uploads
- Reports

Never generate React code inside the backend.

---

# Code Standards

Use:

- Clean Architecture
- SOLID
- DRY
- Feature-based folders
- JavaScript (Strict Mode)
- ESLint
- Prettier

Avoid:

- Duplicate code
- Large components
- Large controllers
- Large service files
- `any` types

---

# Folder Organization

Business logic belongs in Services.

Database access belongs in Repositories.

Controllers should remain thin.

Shared utilities belong in utils.

Validation belongs in validators.

---

# API

REST APIs only.

Every endpoint should

- validate input
- use proper HTTP status codes
- return consistent JSON

Example

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

---

# Development Workflow

Never generate the entire application in one response.

Always work in phases.

Complete one module before starting another.

After each phase:

- verify build
- verify type checks
- verify linting
- summarize changes
- wait for confirmation

---

# UI

Design should feel similar to

- Linear
- Stripe Dashboard
- Vercel
- Notion

Requirements

- Responsive
- Modern
- Minimal
- Fast
- Dark Mode
- Beautiful tables
- Command Palette
- Loading Skeletons
- Empty States
- Toast Notifications

---

# Deliverables

Generate

- README
- Docker Compose
- .env.example
- OpenAPI documentation
- Seed scripts

Always prefer maintainability over shortcuts.




# Documentation

Before implementing any feature, always read the relevant documents inside the `docs/` directory.

Use the documents as the source of truth.

Read:

- docs/architecture.md
- docs/api-spec.md
- docs/database-schema.md
- docs/coding-standards.md

Before starting any phase, also read:

- docs/phase-1-requirements.md
- docs/phase-2-requirements.md
- docs/phase-3-requirements.md

Never ignore these documents.

If implementation conflicts with the documentation, ask for clarification instead of making assumptions.
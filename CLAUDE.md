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
- TypeScript
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
- TypeScript
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
- Strict TypeScript
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
- verify TypeScript
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
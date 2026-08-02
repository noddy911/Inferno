# Coding Standards

## Purpose

This document defines the engineering standards for the AI Interior Estimation & Quotation Platform. Every contribution must follow these standards to ensure maintainability, scalability, consistency, and production readiness.

---

# General Principles

* Follow Clean Architecture.
* Apply SOLID principles.
* Follow DRY (Don't Repeat Yourself).
* Prefer composition over inheritance.
* Keep code readable and self-documenting.
* Prioritize maintainability over clever implementations.
* Avoid premature optimization.

---

# Project Structure

The application consists of two independent applications:

```
frontend/
backend/
```

The frontend and backend must remain completely separated.

Communication must occur only through REST APIs.

Business logic must never exist in the frontend.

---

# JavaScript Standards

Both the frontend and backend are written in JavaScript (Strict Mode).

* Enable JavaScript strict mode (ESM modules are strict by default).
* Use `===` / `!==`; never rely on loose equality.
* Prefer `const` over `let`; never use `var`.
* Define types for all public APIs using JSDoc (`@typedef`, `@param`, `@returns`).
* Keep JSDoc types precise; avoid `{*}` (any) where a concrete type exists.
* Prefer small, focused modules and composition over large classes.

---

# Naming Conventions

## Variables

```ts
const projectName
const materialCost
```

## Functions

Use verbs.

```ts
calculateCost()
generateQuotation()
createProject()
```

## Components

Use PascalCase.

```
ProjectCard.tsx
MaterialTable.tsx
```

## Files

Use kebab-case.

```
project-service.ts
quotation-controller.ts
```

---

# Frontend Standards

Use:

* Next.js App Router
* Functional Components
* React Hooks
* Zustand
* TanStack Query
* React Hook Form
* Zod

Avoid:

* Business logic
* Database access
* Large components
* Inline styles

Maximum component size:

Approximately 300 lines.

Extract reusable UI into shared components.

---

# Backend Standards

Controllers should:

* Validate requests
* Call services
* Return responses

Controllers must not contain business logic.

Services should:

* Implement business rules
* Coordinate repositories
* Perform calculations

Repositories should:

* Access MongoDB only
* Never contain business rules

---

# API Standards

Use REST.

Example:

```
GET /api/projects
POST /api/projects
PUT /api/projects/:id
DELETE /api/projects/:id
```

Every endpoint must:

* Validate input
* Return proper HTTP status codes
* Return consistent JSON

Example response:

```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {}
}
```

---

# Error Handling

Use centralized error middleware.

Never expose stack traces to clients.

Return meaningful messages.

Example:

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

# Validation

Validate all input using Zod or equivalent validation middleware.

Never trust client input.

Validate:

* Request body
* Query parameters
* Route parameters
* Uploaded files

---

# Database Standards

Use Mongoose models.

Keep schemas normalized where appropriate.

Create indexes for frequently queried fields.

Use soft deletes when business rules require record recovery.

Never execute raw database queries from controllers.

---

# Authentication

Use JWT.

Hash passwords using bcrypt.

Never store plaintext passwords.

Protect routes with middleware.

Implement role-based access control.

Roles:

* Admin
* Designer
* Sales
* Client

---

# Logging

Use Winston.

Log:

* Errors
* Authentication events
* Important business actions

Do not log:

* Passwords
* JWT tokens
* Sensitive personal information

---

# File Uploads

Store files using Cloudinary.

Validate:

* File type
* File size
* Upload permissions

Reject unsupported file formats.

---

# UI Standards

Design should be:

* Responsive
* Minimal
* Fast
* Accessible
* Consistent

Support:

* Dark mode
* Keyboard navigation
* Loading skeletons
* Empty states
* Toast notifications

---

# Performance

Optimize:

* API responses
* Database queries
* React rendering
* Bundle size

Use:

* Lazy loading
* Code splitting
* Memoization where appropriate

Avoid unnecessary re-renders.

---

# Git Standards

Branch naming:

```
feature/authentication
feature/dashboard
bugfix/login-validation
refactor/project-service
```

Commit messages:

```
feat: add authentication module
fix: resolve quotation calculation bug
refactor: simplify project service
docs: update API documentation
```

---

# Testing

Every new feature should include:

* Unit tests where appropriate
* API validation
* Error handling verification

Run before committing:

* Type checking
* Linting
* Build verification

---

# Documentation

Every module should include:

* Purpose
* Folder structure
* API documentation
* Environment variables
* Usage examples

Maintain:

* README.md
* OpenAPI documentation
* .env.example

---

# Code Review Checklist

Before submitting code:

* Builds successfully
* Passes linting
* Passes type checking
* Strict JavaScript (Strict Mode) with ESLint and JSDoc typing
* No duplicated logic
* No hardcoded secrets
* Proper validation
* Proper error handling
* Proper logging
* Clean architecture maintained
* Responsive UI verified
* API documented
* Tests executed

---

# AI Development Workflow

Claude Code should:

1. Understand the requirement.
2. Explain the proposed architecture.
3. Generate one feature at a time.
4. Verify compilation.
5. Verify type checks.
6. Verify linting.
7. Summarize completed work.
8. Wait for confirmation before continuing.

Never generate the entire application in one response.

Always prioritize long-term maintainability, scalability, and production readiness over implementation speed.

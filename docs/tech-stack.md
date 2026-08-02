# Technology Stack

## Overview

This document defines the approved technology stack for the AI Interior Estimation & Quotation Platform.

Unless explicitly approved, do not introduce additional frameworks or libraries that duplicate existing functionality.

---

# Frontend

## Framework

* Next.js 15 (App Router)

## Language

* JavaScript (Strict Mode)

## UI

* React 19
* Tailwind CSS
* shadcn/ui
* Radix UI
* Lucide React
* Framer Motion

## State Management

* Zustand

Use for:

* Authentication
* Theme
* UI state
* Global application state

Do not use Zustand for server data.

---

## Server State

* TanStack Query

Use for:

* API requests
* Caching
* Background refetching
* Optimistic updates
* Pagination

---

## Forms

* React Hook Form
* Zod

All forms must use schema validation.

---

## Tables

Preferred:

* TanStack Table

Support:

* Sorting
* Filtering
* Pagination
* Column visibility
* Export

---

## Charts

Preferred:

* Recharts

Dashboard charts should be responsive.

---

## Icons

* Lucide React

Avoid mixing multiple icon libraries.

---

## Styling

* Tailwind CSS
* CSS Variables
* shadcn/ui Design Tokens

Do not use Bootstrap, Material UI, or inline styling unless necessary.

---

## Notifications

* Sonner

Use for:

* Success messages
* Errors
* Warnings
* Information

---

## Theme

Support:

* Light Mode
* Dark Mode
* System Theme

---

# Backend

## Runtime

* Node.js LTS

## Framework

* Express.js

## Language

* JavaScript (Strict Mode)

---

## Database

* MongoDB Atlas
* Mongoose

---

## Authentication

* JWT
* bcrypt

Support:

* Access Token
* Refresh Token
* Role-Based Access Control

---

## Validation

* Zod

Validate:

* Request Body
* Route Params
* Query Params

---

## Logging

* Winston

Log:

* Errors
* Warnings
* Business Events

---

## Documentation

* Swagger (OpenAPI)

Every endpoint must be documented.

---

## File Upload

* Cloudinary

Supported formats:

* Images
* PDF
* Excel
* DWG
* DXF

---

## PDF Generation

Preferred:

* PDFKit

Alternative:

* Puppeteer (for HTML-based reports)

---

## Excel Export

* ExcelJS

---

## Email

Preferred:

* Nodemailer

Future support:

* SendGrid
* AWS SES

---

## Security

* Helmet
* CORS
* Express Rate Limit
* Compression

---

# Development Tools

## Package Manager

* npm

---

## Version Control

* Git

Repository strategy:

```text
frontend/
backend/
```

Each application should be independently deployable.

---

## Code Quality

* ESLint
* Prettier

Strict linting should be enabled.

---

## Testing

Backend:

* Vitest
* Supertest

Frontend:

* Vitest
* React Testing Library

End-to-End (Future):

* Playwright

---

## Environment Variables

Each application must include:

```text
.env.example
```

Never commit:

* API Keys
* Passwords
* JWT Secrets
* Database Credentials

---

# Deployment

## Frontend

Preferred:

* Vercel

Alternatives:

* Netlify
* Azure Static Web Apps

---

## Backend

Deployment target: Render (Docker image)

* Render — production deployment target (backend deployed as a Docker image)
* Docker — local development (Docker Compose) using the same image
* Alternatives (future): Railway, Azure App Service, AWS ECS

---

## Database

* MongoDB Atlas

---

## Storage

* Cloudinary

---

# Project Structure

```text
InteriorQuotationPlatform/

├── frontend/
├── backend/
├── docs/
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

# Future Technologies

These may be introduced in later phases:

## AI

* OpenAI API
* Anthropic Claude API
* Google Gemini API

## Search

* Meilisearch
* Elasticsearch

## Queue

* BullMQ
* Redis

## Caching

* Redis

## Realtime

* Socket.IO

## Monitoring

* Sentry

## Analytics

* PostHog

## Object Storage

* AWS S3
* Azure Blob Storage

---

# Approved Principles

* Use the simplest suitable technology.
* Prefer established, well-maintained libraries.
* Minimize dependencies.
* Avoid overlapping libraries with similar purposes.
* Keep frontend and backend completely independent.
* Business logic must remain in the backend.
* Follow Clean Architecture and feature-based organization.
* Every new dependency should have a clear justification before being added.

# AI Interior Estimation & Quotation Platform

A production-ready SaaS for interior design firms: plan rooms, auto-calculate materials
and costs, and generate BOQs and quotations (PDF/Excel).

Built as **two completely independent applications** that communicate **only through REST APIs**:

```
frontend/   Next.js 15 (App Router) - UI only, deployed to Vercel
backend/    Express REST API - all business logic, deployed to Render (Docker)
```

> Source of truth: the documents in [`docs/`](docs/). Read them before implementing features.

---

## Tech Stack

| Layer      | Choice |
|------------|--------|
| Language   | JavaScript (Strict Mode) on both apps |
| Frontend   | Next.js 15, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, React Hook Form, Zod |
| Backend    | Node.js, Express, Mongoose (MongoDB), JWT, Zod, Winston, Swagger |
| Storage    | MongoDB Atlas (Cloudinary for files, later) |
| Testing    | Vitest, Supertest (backend) |
| Deployment | Vercel (frontend), Render / Docker (backend) |

See [`docs/tech-stack.md`](docs/tech-stack.md) for the full approved stack.

---

## Repository Structure

```
my-project/
├── backend/            # Express REST API
├── frontend/           # Next.js application (Phase 1)
├── docs/               # Architecture, API spec, schema, standards, phase requirements
├── docker-compose.yml  # Local dev: MongoDB + backend
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+ (Node 24 recommended)
- MongoDB (local install, or `docker compose up mongodb`)
- npm

### 1. Backend

```bash
cd backend
cp .env.example .env   # then fill in secrets
npm install
npm run dev            # http://localhost:5000/api/v1
```

- Health check: `GET /api/v1/health`
- Swagger UI: `http://localhost:5000/api/v1/docs`

Seed demo users (one per role):

```bash
npm run seed
```

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | Admin@123 |
| Designer | designer@example.com | Designer@123 |
| Sales | sales@example.com | Sales@123 |
| Client | client@example.com | Client@123 |

### 2. Frontend (Phase 1)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```

### 3. Docker Compose (optional local stack)

```bash
docker compose up --build
```

Starts MongoDB + backend. The backend reaches MongoDB via the compose network.

---

## Environment Variables

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` / `test` / `production` |
| `PORT` | API port (default `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Signing secret for access tokens (min 16 chars) |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens (min 16 chars) |
| `JWT_ACCESS_EXPIRES_IN` | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | e.g. `7d` |
| `SMTP_HOST/PORT/USER/PASS` | SMTP for reset-password emails (optional in dev) |
| `EMAIL_FROM` | Sender address |
| `CLIENT_URL` | Frontend origin (CORS + reset links) |

---

## API

Base URL: `/api/v1` — every endpoint returns `{ success, message, data }`.

See [`docs/api-spec.md`](docs/api-spec.md) and the live Swagger UI.

---

## Development Workflow

Work is delivered in phases. Each phase is built one module at a time, verified
(build, lint, tests), summarized, and confirmed before continuing. See
[`docs/coding-standards.md`](docs/coding-standards.md).

- **Phase 1 — Foundation & Authentication** (in progress): scaffold both apps, auth flow
  (register/login/logout/refresh/forgot/reset/me), dashboard layout, Docker, Swagger, seed.
- **Phase 2 — Core Business Modules**: dashboard metrics, clients, projects, room planner,
  furniture library, global search, file uploads.
- **Phase 3 — Estimation Engine**: material master, measurement engine, cutting
  optimization, cost engine, BOQ, quotations (PDF), reports, AI assistant.

---

## Deployment

- **Backend**: Render, as a Docker image (`backend/Dockerfile`). Add the env vars above
  to the Render service and point `MONGODB_URI` at MongoDB Atlas.
- **Frontend**: Vercel (Phase 1).

## License

MIT

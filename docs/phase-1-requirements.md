# Phase 1 - Foundation & Authentication

## Goal

Build the project foundation and authentication system.

This phase should create a production-ready architecture that future phases can build upon.

Do NOT implement business modules yet.

---

# Repositories

The solution must contain two completely separate applications.

```
frontend/
backend/
```

Communication must happen only through REST APIs.

---

# Frontend

Tech Stack

- Next.js 15
- App Router
- JavaScript (Strict Mode)
- Tailwind CSS
- shadcn/ui
- Zustand
- TanStack Query
- React Hook Form
- Zod

Create

- Authentication pages
- Login
- Signup
- Forgot Password
- Dashboard Layout
- Sidebar
- Header
- Breadcrumbs
- User Menu
- Theme Switcher
- Protected Routes
- Loading Screens
- Error Pages

---

# Backend

Create

- Express Server
- MongoDB Connection
- Mongoose
- JWT Authentication
- Refresh Tokens
- User Roles
- Password Hashing
- Validation
- Error Handling
- Logging
- Swagger
- Docker Support

---

# Roles

- Admin
- Designer
- Sales
- Client

---

# Authentication

Implement

- Register
- Login
- Logout
- Refresh Token
- Forgot Password
- Reset Password

---

# Folder Structure

Backend

```
src/
    config/
    controllers/
    middleware/
    routes/
    services/
    repositories/
    validators/
    models/
    utils/
    types/
```

Frontend

```
src/
    app/
    components/
    features/
    hooks/
    services/
    store/
    utils/
    types/
```

---

# Deliverables

Generate

- Docker Compose
- README
- .env.example
- Swagger
- Seed Data
- Authentication APIs
- Authentication UI

Stop after authentication.
Wait for confirmation.
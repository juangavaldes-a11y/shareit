# AGENTS.md — ShareIt

Product-agnostic rental platform (tools, cars, clothes, sports gear, etc.).
Users are renters/owners/admins; owners list items, renters browse/rent.
Includes a DB-backed feature-flag ("modules") system with admin audit trail.

## Tech Stack
**Backend:** Node.js, Express 5, PostgreSQL 16 + Sequelize, JWT via HttpOnly
cookies + bcryptjs, Helmet, CORS, express-rate-limit, Pino logging, Prometheus
metrics (prom-client), Morgan.
**Frontend:** React 19 + Vite, Ant Design 6, React Router v7, Axios, Oxlint.
**DevOps:** Docker Compose (dev + prod split), Nginx reverse proxy in prod.

## Structure
```
backend/src/
├── controllers/   auth, listing, module
├── routes/        route registration + index
├── services/       business logic (auth, listing, module)
├── repositories/   Sequelize data access (listing.repository.js)
├── models/         User, Listing, AppModule, ModuleAuditLog
├── middlewares/    authenticate, authorize-roles, module-guard, error-handler
├── utils/          jwt, auth-cookie, api-error, logger, metrics
├── migrations/      Sequelize CLI migrations
└── scripts/         bootstrap-admin.js

frontend/src/
├── pages/          Home, Auth, AdminModules, FeatureUnavailable
├── features/       auth/, listings/, modules/, admin/ (context + api per feature)
├── components/     AppHeader
├── services/        apiClient.js (axios, 401 handling)
└── theme/           antdTheme.js
```

## Build / Run / Test
```bash
# Backend (http://localhost:4000)
cd backend && cp .env.example .env
npm install && npm run db:migrate && npm run db:seed:all && npm run dev
npm test                       # supertest integration tests
npm run admin:bootstrap        # provision admin (ADMIN_EMAIL/ADMIN_PASSWORD)

# Frontend (http://localhost:5173)
cd frontend && cp .env.example .env
npm install && npm run dev
npm run build / npm run lint

# Docker (dev)
docker compose up --build      # frontend :3000, backend :4000, postgres :5432

# Docker (prod)
cp .env.prod.example .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml up --build -d
```

## API (base `/api/v1`)
`/auth/register|login|logout|me`, `/listings` (GET public, POST owner/admin),
`/modules` (public enabled list), `/admin/modules[/:key][/audit-logs]`,
`/health`, `/ready`, `/metrics` (bearer token).

## Conventions
- Layers: Route → Controller → Service → Repository → Model. Keep query logic
  out of controllers; use the repository layer.
- Auth is cookie-based (HttpOnly), not `Authorization: Bearer` — use
  `withCredentials: true` on the frontend axios client.
- New features that should be toggle-able must register as an `AppModule` and
  be gated by `module-guard.js` middleware; toggles are always audited via
  `ModuleAuditLog`.
- Errors thrown as `ApiError(status, message)`, caught by the global
  `error-handler.js` — don't send raw `res.status().json()` errors from routes.
- Structured logs via Pino; metrics exposed at `/api/v1/metrics` protected by
  `METRICS_TOKEN`.

## Cross-repo component inventory
See [../COMPONENT_INVENTORY.md](../COMPONENT_INVENTORY.md). ShareIt's module
system is the workspace reference for "DB-backed feature flags with audit
trail," and its JWT/cookie auth is the reference for simple Node auth.

# ShareIt

ShareIt is a rental platform foundation built as two independent projects:
- `frontend`: React + Ant Design client app.
- `backend`: Node.js + Express API with Sequelize ORM and PostgreSQL.

The platform is product-agnostic: listings can represent tools, cars, clothes, sports gear, or any rentable item.

## Tech Stack

- Frontend: React, React Router, Ant Design, Axios, Vite
- Backend: Node.js, Express, Sequelize, PostgreSQL
- Deployment: Docker and Docker Compose

## Architecture

### Backend layers

- `src/routes`: HTTP route registration
- `src/controllers`: request/response orchestration
- `src/services`: business logic and validation
- `src/repositories`: data access via Sequelize models
- `src/models`: ORM entities and initialization
- `src/config`: environment and runtime config
- `src/middlewares`: auth, authorization, and error handling

Request flow:

`Route -> Controller -> Service -> Repository -> Model -> PostgreSQL`

### Frontend layers

- `src/app`: app router and app-level setup
- `src/pages`: route pages
- `src/features`: feature modules (listings)
- `src/components`: reusable UI components
- `src/services`: API client and shared integrations
- `src/theme`: Ant Design theming

## Local Development

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed:all
npm run dev
```

Backend runs on `http://localhost:4000`.

### 2) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## API Endpoints

- `GET /api/v1/health`
- `GET /api/v1/ready`
- `GET /api/v1/metrics` (Bearer `METRICS_TOKEN`)
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me` (HttpOnly session cookie)
- `GET /api/v1/listings`
- `POST /api/v1/listings` (session cookie, role `owner` or `admin`)
- `GET /api/v1/modules`
- `GET /api/v1/admin/modules` (session cookie, role `admin`)
- `PATCH /api/v1/admin/modules/:key` (session cookie, role `admin`)

### Example register payload

```json
{
  "fullName": "Juan Perez",
  "email": "juan@example.com",
  "password": "a-strong-password",
  "role": "owner"
}
```

### Example listing create payload

```json
{
  "title": "Bosch Cordless Drill",
  "description": "18V drill with 2 batteries",
  "category": "tools",
  "pricePerDay": 14.5,
  "location": "Madrid",
  "imageUrl": "https://example.com/drill.jpg"
}
```

## Database Workflow (Sequelize CLI)

From `backend`:

```bash
npm run db:migrate
npm run db:migrate:undo
npm run db:migrate:undo:all
npm run db:seed:all
npm run db:seed:undo:all
npm run db:reset
```

## Docker Deployment

From repository root:

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- PostgreSQL: `localhost:5432`

Compose runs migrations in a one-shot `migrate` service before it starts the API.

## Production Compose

Use the production override with environment variables:

```bash
cp .env.prod.example .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml up --build -d
```

Production Compose exposes only the Nginx frontend. Nginx proxies `/api` to the internal API,
which keeps PostgreSQL and the backend off the public network. Terminate TLS at the deployment
ingress, use a secret manager for `.env.prod` values, and configure automated PostgreSQL backups
with regular restore tests.

See [production operations](docs/production-operations.md) for backup, restore, TLS, secret, and
metrics procedures.

Provision the initial administrator through the container, never through public registration:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD=use-a-long-unique-password \
  backend npm run admin:bootstrap
```

## Modules

Modules are persisted feature flags enforced by the API as well as the client. `listings` is the
first optional module; disabling it returns `503` for listing endpoints and removes the feature
from the client. Administrators can manage modules at `/admin/modules`. Each change is recorded
in `module_audit_logs` and is available from the module table. Core modules cannot be disabled.

## CI Pipeline

GitHub Actions workflow in `.github/workflows/ci.yml` includes:
- Backend install, migration, seed, and app-load smoke check with PostgreSQL service
- Frontend install and production build
- Docker compose build validation

## Product-Agnostic Growth Strategy

To scale to new categories:
1. Keep common inventory in `listings` for unified discovery/search.
2. Add optional category-specific detail tables only when needed (for example vehicle specs).
3. Keep auth, billing, booking, and messaging modules category-neutral.
4. Reuse frontend `features/listings` and evolve with filters/search facets.

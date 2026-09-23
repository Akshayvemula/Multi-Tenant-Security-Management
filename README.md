# Deep Trace Security Command

A secure, multi-tenant security-management platform built for the Deep Trace full-stack assessment. It uses React/Vite for the operator console, Node.js/Express for the API, and PostgreSQL for durable tenant-scoped data.

## What is included

- JWT sign-in and protected API routes
- Bcrypt password hashing; no plain-text password storage
- Backend-enforced RBAC: `ADMIN`, `MANAGER`, and `USER`
- Multi-tenant data isolation for users, campaigns, events, and audit logs
- Campaign lifecycle management and assignment management
- Security-event filtering, status updates, and server-side pagination
- Tenant dashboard and admin-only audit log
- PostgreSQL schema with foreign keys, constraints, indexes, and demo seed data
- Docker Compose setup for PostgreSQL

## Architecture

```
React/Vite console  --Bearer JWT-->  Express API  --parameterized queries--> PostgreSQL
                                             |
                                  request user reloaded from database
                                  (tenant + current role)
```

The JWT includes only the authenticated user ID. On every protected request, the API reloads that account from the database. The frontend cannot choose a tenant or role; tenant ID and role come from that authenticated server-side record.

Every tenant-owned SQL query contains a tenant predicate. For example, campaign lookup uses both `campaign.id` and `request.user.tenant_id`; a user from tenant A querying a tenant B ID receives a `404` and never sees the other tenant's data. Standard users are also limited to campaigns assigned to them.

## Prerequisites

- Node.js 20 or newer
- PostgreSQL 16+ **or** Docker Desktop
- pnpm 9+ (recommended; npm can be used if lockfiles are regenerated)

## Quick start with Docker

1. From the project root, start PostgreSQL:

   ```powershell
   docker compose up -d
   ```

   The first startup creates the database and runs `backend/db/schema.sql` then `backend/db/seed.sql`.

2. Create the API environment file:

   ```powershell
   Copy-Item .env.example backend/.env
   ```

   For a non-local deployment, replace `JWT_SECRET` with a unique random string of at least 32 characters.

3. In one terminal, start the API:

   ```powershell
   Set-Location backend
   pnpm install
   pnpm dev
   ```

4. In a second terminal, start the console:

   ```powershell
   Set-Location frontend
   pnpm install
   pnpm dev
   ```

5. Open `http://localhost:5173`.

## Local PostgreSQL setnpm deup

Create a database named `deep_trace`, set `DATABASE_URL` in `backend/.env`, then run:

```powershell
Set-Location backend
$env:DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/deep_trace'
psql $env:DATABASE_URL -f db/schema.sql
psql $env:DATABASE_URL -f db/seed.sql
```

The provided `db:schema` and `db:seed` scripts are also available when `DATABASE_URL` is set.

## Demo accounts

All accounts use their shown password in the development seed only.

| Tenant slug | Role | Email | Password |
| --- | --- | --- | --- |
| `apex-sentinel` | ADMIN | `admin@apex.test` | `AdminPass123!` |
| `apex-sentinel` | MANAGER | `manager@apex.test` | `ManagerPass123!` |
| `apex-sentinel` | USER | `user@apex.test` | `UserPass123!` |
| `northstar-labs` | ADMIN | `admin@northstar.test` | `AdminPass123!` |

## API summary

All `/api/*` routes except `POST /api/auth/login` require `Authorization: Bearer <token>`.

| Area | Routes | Access |
| --- | --- | --- |
| Authentication | `POST /api/auth/login`, `GET /api/auth/me` | Public / authenticated |
| Dashboard | `GET /api/dashboard` | All authenticated roles |
| Campaigns | CRUD, `POST/DELETE /:id/assignees` | Read: all roles (USER sees assigned); mutate: ADMIN/MANAGER |
| Security events | `GET`, `POST`, `PATCH /:id` | Read: all roles; mutate: ADMIN/MANAGER |
| Users | `GET /api/users`, `GET /api/users/me`, `POST`, `PATCH /:id` | Directory: ADMIN/MANAGER; mutations: ADMIN |
| Audit logs | `GET /api/audit-logs` | ADMIN only |

Campaign lists and security-event lists support server-side `page`, `pageSize`, `search`, and status filters; events also support severity. Page size is capped at 100.

Campaign transitions are deliberately constrained: `DRAFT → ACTIVE/CANCELLED`, `ACTIVE → COMPLETED/CANCELLED`; completed and cancelled campaigns are terminal.

## Security notes

- Passwords are hashed with bcrypt (12 rounds for newly created users).
- Auth tokens use HS256 and expire after `JWT_EXPIRES_IN` (default `8h`).
- A login rate limiter, Helmet headers, a strict CORS origin, small JSON body limit, Zod validation, and parameterized SQL are in place.
- Duplicate tenant/email pairs are prevented by a database unique constraint.
- API errors never expose raw database messages.
- Audit entries record successful logins plus campaign, event, and user mutations.

### Cross-tenant verification

The seed creates Campaign `201` in `northstar-labs`. Sign in as `admin@apex.test`, then request:

```text
GET /api/campaigns/201
```

The API returns `404 Resource not found`. The query requires both the campaign ID and the authenticated Apex tenant ID, so knowing an ID alone is insufficient.

## Engineering notes

### How would this scale to 1,000 tenants / 1M users?

Keep tenant ID as the leading key in high-volume composite indexes, partition event/audit tables by time (and, if needed, tenant hash), put connection pooling behind the API, and add read replicas for analytics-heavy dashboard work. Object storage and asynchronous jobs would handle bulk imports and reports. At higher scale, I would enforce tenant scoping through PostgreSQL Row-Level Security as a second defense layer and add tenant-aware rate limits and observability dimensions.

### How would JWT revocation work?

Use short-lived access tokens plus rotating refresh tokens stored hashed in a revocation/session table. A password or role change would revoke active sessions by incrementing a per-user token version or invalidating refresh-token families. For immediate high-risk revocation, check a cached deny-list keyed by token `jti` until its expiry. This implementation already reloads user activity and role per request, so deactivated accounts stop working immediately.

### How would you troubleshoot a production API returning many 500 errors?

Start with a time-bounded error-rate dashboard segmented by route, deployment version, tenant, and database dependency. Correlate request IDs with structured application logs and tracing spans, compare the error start time to deployments/config changes, then inspect database pool saturation, slow queries, upstream failures, and resource metrics. Roll back a confirmed faulty deployment or feature flag promptly, add a regression test from the failing request, and retain a sanitized incident timeline.

## Project layout

```
backend/
  db/                 PostgreSQL schema and development seed
  src/                Express app, routes, auth middleware, audit service
frontend/
  src/                React/Vite console
docker-compose.yml    Development PostgreSQL service
.env.example          API environment template
```

## Build verification

```powershell
Set-Location frontend
pnpm build
```

The production bundle is emitted to `frontend/dist/`.


# Deep Trace Security Management Platform

> Full-stack technical assessment project for **Deep Trace Cybernetics**  
> Stack: **Node.js · Express.js · React.js · Vite · PostgreSQL**

A secure, multi-tenant security management platform that demonstrates authentication, authorization, role-based access control, tenant isolation, campaign management, security-event monitoring, audit logging, and a React dashboard.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Assessment Requirements Covered](#2-assessment-requirements-covered)
3. [Technology Stack](#3-technology-stack)
4. [Core Features](#4-core-features)
5. [Roles and Permissions](#5-roles-and-permissions)
6. [Application Architecture](#6-application-architecture)
7. [Project Structure](#7-project-structure)
8. [Prerequisites](#8-prerequisites)
9. [Environment Configuration](#9-environment-configuration)
10. [Database Setup](#10-database-setup)
11. [Installation](#11-installation)
12. [Running the Application](#12-running-the-application)
13. [Demo Credentials](#13-demo-credentials)
14. [API Overview](#14-api-overview)
15. [Multi-Tenant Data Isolation](#15-multi-tenant-data-isolation)
16. [Security Implementation](#16-security-implementation)
17. [Validation and Error Handling](#17-validation-and-error-handling)
18. [Testing and Verification](#18-testing-and-verification)
19. [Engineering Notes](#19-engineering-notes)
20. [Troubleshooting](#20-troubleshooting)
21. [Submission Checklist](#21-submission-checklist)
22. [License](#22-license)

---

## 1. Project Overview

Deep Trace Security Management Platform is a simplified security management application designed for multiple organizations, also called tenants.

Each tenant can have its own users, campaigns, security events, and audit activity. The backend enforces authentication, role permissions, and tenant-level data access so that a user from one tenant cannot access another tenant's resources.

The project focuses on secure and maintainable full-stack development, including:

- JWT-based authentication
- Secure password hashing
- Role-Based Access Control (RBAC)
- Multi-tenant data isolation
- Campaign lifecycle management
- Security event tracking
- Audit logging
- Server-side filtering and pagination
- PostgreSQL relationships and constraints
- React-based dashboards and management screens

---

## 2. Assessment Requirements Covered

The implementation is designed around the following assessment requirements:

| Assessment Area | Implementation Focus |
|---|---|
| Authentication | JWT-based login and protected APIs |
| Password Security | Password hashing using bcrypt |
| Authorization | Backend-enforced RBAC |
| Roles | `ADMIN`, `MANAGER`, and `USER` |
| Multi-Tenancy | Tenant-scoped users and resources |
| Campaigns | CRUD, assignment, statuses, and validation |
| Security Events | Event type, severity, status, description, timestamp |
| Audit Logs | Recording important user and system actions |
| Frontend | Login, dashboard, campaigns, events, and users |
| Database | PostgreSQL, relationships, constraints, and indexes |
| API Security | Validation, parameterized queries, and appropriate status codes |
| Large Lists | Server-side filtering, sorting, and pagination |

---

## 3. Technology Stack

### Frontend

- React.js
- Vite
- JavaScript / JSX
- React-based dashboard and management screens
- Role-aware UI actions
- API integration with the backend

### Backend

- Node.js
- Express.js
- JWT authentication
- bcrypt password hashing
- Request validation
- Role-based authorization middleware
- Tenant-scoped database access
- Audit logging

### Database

- PostgreSQL
- Relational tables
- Foreign keys
- Unique constraints
- Indexes
- Parameterized SQL queries

### Development and Deployment Tools

- pnpm
- Git and GitHub
- Docker / Docker Compose, if enabled in the repository
- Postman or another API client for testing

---

## 4. Core Features

### 4.1 Authentication

- Login using email and password
- Secure password verification
- JWT token generation
- Protected API routes
- Authenticated user lookup
- Login audit activity

### 4.2 Role-Based Access Control

The application supports three roles:

- `ADMIN`
- `MANAGER`
- `USER`

Permissions are enforced on the backend. Hiding a button or page in the frontend is not considered sufficient authorization.

### 4.3 Multi-Tenant Organizations

- Multiple organizations can use the same application.
- Users belong to a tenant.
- Resources belong to a tenant.
- Tenant identity is derived from the authenticated user.
- Client-provided tenant IDs are not trusted.
- Client-provided role values are not trusted.
- Cross-tenant access is rejected.

### 4.4 Campaign Management

The campaign module supports:

- Create campaign
- List campaigns
- View campaign details
- Update campaign
- Delete campaign
- Assign users to campaigns
- Remove users from campaigns
- Search and filtering
- Pagination
- Status validation

Supported campaign statuses:

```text
DRAFT
ACTIVE
COMPLETED
CANCELLED
```

### 4.5 Security Events

Security events include:

- Event type
- Severity
- Status
- Description
- Timestamp

The events interface supports filtering and pagination where implemented by the API.

### 4.6 Audit Logs

Important actions are recorded in an audit log, including:

- Login
- Campaign creation
- Campaign updates
- Campaign deletion
- User management actions
- Other important security-related operations

Audit log access is restricted to authorized users.

### 4.7 Dashboard

The dashboard is intended to display tenant-level information such as:

- Total users
- Total campaigns
- Open security events
- Critical security events
- Recent activity
- Other available tenant metrics

---

## 5. Roles and Permissions

The backend is responsible for enforcing permissions.

| Capability | ADMIN | MANAGER | USER |
|---|:---:|:---:|:---:|
| Login | Yes | Yes | Yes |
| View permitted dashboard data | Yes | Yes | Yes |
| View tenant users | Yes | According to policy | Restricted |
| Manage users | Yes | According to policy | No |
| Create campaigns | Yes | Yes | No |
| Update campaigns | Yes | Yes | Restricted |
| Delete campaigns | Yes | According to policy | No |
| Assign users to campaigns | Yes | Yes | No |
| View permitted campaigns | Yes | Yes | Assigned/permitted |
| View security events | Yes | Yes | According to policy |
| View audit logs | Authorized roles | Restricted | No |

> The exact permission matrix should always be validated against the authorization middleware and route implementation in the repository.

---

## 6. Application Architecture

```text
                     React + Vite
                         |
                         | HTTP requests
                         | Authorization header
                         v
                  Express.js API
                         |
        -------------------------------------
        |                 |                 |
   Authentication     Authorization     Validation
        |                 |                 |
        -------------------------------------
                         |
                  Tenant Scoping
                         |
                         v
                    PostgreSQL
```

### Backend Request Flow

1. The user submits login credentials.
2. The backend verifies the email and password.
3. The backend generates a JWT.
4. The frontend sends the JWT with protected requests.
5. Authentication middleware validates the token.
6. The backend loads the authenticated user from the database.
7. The user's tenant and role are derived from trusted backend data.
8. Authorization middleware checks the requested action.
9. Database queries are scoped to the authenticated tenant.
10. The API returns only permitted data.

### Important Design Decision

The frontend is not trusted to determine:

- Tenant identity
- User role
- Resource ownership
- Authorization permissions

These values must be derived and enforced on the backend.

---

## 7. Project Structure

```text
deep-trace-security-platform/
│
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── db/
│   │   └── server.js
│   ├── package.json
│   ├── .env.example
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── App.jsx
│   ├── package.json
│   └── .env.example
│
├── db/
│   ├── schema.sql
│   └── seed.sql
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

> Update this tree if the final repository uses different directory names. The actual repository structure should be treated as the source of truth.

---

## 8. Prerequisites

Install the following:

- Node.js 20 or later
- pnpm
- PostgreSQL 16 or later

Optional:

- Docker Desktop
- Git
- Postman

Check the installed versions:

```powershell
node --version
pnpm --version
psql --version
```

---

## 9. Environment Configuration

Do not commit real secrets or private environment files.

### Backend Environment

From the `backend` directory, create the environment file:

```powershell
Copy-Item .env.example .env
```

Typical variables may include:

```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/deep_trace
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:5173
```

Use the exact variable names required by the backend source code and `.env.example`.

### Frontend Environment

If the frontend has an environment example file:

```powershell
Copy-Item .env.example .env
```

Use the API base URL expected by the frontend configuration.

Example:

```env
VITE_API_URL=http://localhost:4000
```

The actual frontend variable name must match the implementation.

### Environment Security

- Never commit `.env` files containing secrets.
- Use long, random JWT secrets.
- Use separate credentials for development, staging, and production.
- Do not expose database credentials in frontend variables.
- Commit `.env.example` with safe placeholder values.

---

## 10. Database Setup

The application uses PostgreSQL.

### 10.1 Create the Database

Create a database named `deep_trace`:

```sql
CREATE DATABASE deep_trace;
```

Example connection string:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/deep_trace
```

Update the username, password, host, port, and database name to match your local setup.

### 10.2 Apply the Schema

From the project root:

```powershell
psql $env:DATABASE_URL -f db/schema.sql
```

The schema should define the required tables, relationships, constraints, and indexes.

### 10.3 Load Seed Data

```powershell
psql $env:DATABASE_URL -f db/seed.sql
```

The seed file should create sample tenants, users, campaigns, events, and any required demonstration records.

### 10.4 Docker Database

If Docker Compose is configured:

```powershell
docker compose up -d
```

Check running services:

```powershell
docker compose ps
```

Review the `docker-compose.yml` file and database initialization configuration before relying on automatic schema or seed execution.

---

## 11. Installation

Clone the repository:

```powershell
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd deep-trace-security-platform
```

### Install Backend Dependencies

```powershell
cd backend
pnpm install
```

### Install Frontend Dependencies

Open a second terminal:

```powershell
cd frontend
pnpm install
```

Use the package manager supported by the committed lockfile. Avoid mixing npm, pnpm, and yarn in the same installation workflow unless there is a specific reason.

---

## 12. Running the Application

### 12.1 Start the Backend

From the backend directory:

```powershell
pnpm dev
```

Expected backend URL:

```text
http://localhost:4000
```

The port is controlled by the backend configuration.

If port `4000` is already in use:

```powershell
netstat -ano | findstr :4000
```

Identify the process:

```powershell
tasklist /FI "PID eq <PID>"
```

Stop the process only if it is an unwanted or duplicate backend process:

```powershell
taskkill /PID <PID> /F
```

### 12.2 Start the Frontend

From the frontend directory:

```powershell
pnpm dev
```

Expected frontend URL:

```text
http://localhost:5173
```

Open the frontend URL in your browser.

### 12.3 Production Build

From the frontend directory:

```powershell
pnpm build
```

The build should complete without errors before the project is described as production-build verified.

---

## 13. Demo Credentials

Use the credentials from the committed seed file.

The following sample accounts were defined for local demonstration in the project documentation:

| Tenant | Role | Email | Password |
|---|---|---|---|
| `apex-sentinel` | `ADMIN` | `admin@apex.test` | `AdminPass123!` |
| `apex-sentinel` | `MANAGER` | `manager@apex.test` | `ManagerPass123!` |
| `apex-sentinel` | `USER` | `user@apex.test` | `UserPass123!` |
| `northstar-labs` | `ADMIN` | `admin@northstar.test` | `AdminPass123!` |

Confirm that these accounts and passwords match `db/seed.sql` before submission.

These credentials are for local assessment demonstration only and must not be reused in production.

---

## 14. API Overview

The following table summarizes the expected API areas. Confirm exact route names and methods against the backend route files.

| Area | Route Example | Purpose |
|---|---|---|
| Authentication | `POST /api/auth/login` | Authenticate a user |
| Dashboard | `GET /api/dashboard` | Retrieve tenant metrics |
| Campaigns | `GET /api/campaigns` | List tenant-scoped campaigns |
| Campaigns | `POST /api/campaigns` | Create a campaign |
| Campaigns | `GET /api/campaigns/:id` | View one campaign |
| Campaigns | `PATCH /api/campaigns/:id` | Update a campaign |
| Campaigns | `DELETE /api/campaigns/:id` | Delete a campaign |
| Events | `GET /api/events` | List and filter security events |
| Users | `GET /api/users` | List permitted users |
| Audit Logs | `GET /api/audit-logs` | View authorized audit records |

### API Requirements

The API should provide:

- Appropriate HTTP methods
- Protected endpoints
- Role-based authorization
- Tenant-scoped queries
- Request validation
- Server-side pagination
- Filtering and sorting
- Parameterized SQL queries
- Consistent error responses
- Appropriate HTTP status codes

---

## 15. Multi-Tenant Data Isolation

Multi-tenant isolation is a mandatory requirement of the assessment.

### Isolation Rules

1. Every user belongs to a tenant.
2. Tenant-owned resources contain a tenant relationship.
3. The authenticated user's tenant is derived by the backend.
4. Client-provided `tenantId` values are not trusted.
5. Client-provided role values are not trusted.
6. Resource queries include tenant restrictions.
7. A resource ID alone is not sufficient to authorize access.
8. Cross-tenant reads and writes must be rejected.
9. Unauthorized resources should not expose sensitive information.

### Example Security Scenario

Suppose:

- Campaign `201` belongs to Tenant B.
- A user authenticated under Tenant A knows the campaign ID.

The following request must not expose Tenant B's campaign:

```http
GET /api/campaigns/201
```

Expected behavior:

```http
404 Not Found
```

The same tenant restriction must be applied to update and delete operations.

### Recommended Query Pattern

A tenant-scoped resource lookup should conceptually follow this pattern:

```sql
SELECT *
FROM campaigns
WHERE id = $1
  AND tenant_id = $2;
```

The value of `$2` must come from the authenticated backend user, not from an untrusted frontend request body.

---

## 16. Security Implementation

### Authentication

- JWT-based authentication
- Protected API routes
- Backend validation of tokens
- Authenticated user lookup
- Token expiration configuration

### Password Security

- Passwords must not be stored in plaintext.
- Passwords are hashed using bcrypt.
- Password comparison occurs on the backend.
- Password secrets must not be exposed in API responses.

### Authorization

- Permissions are enforced by backend middleware.
- Role information is taken from trusted backend data.
- Frontend controls are not treated as security boundaries.
- Restricted resources require appropriate authorization.

### Database Security

- Parameterized queries are used to reduce SQL injection risk.
- Foreign keys maintain relationships.
- Unique constraints help prevent duplicate records.
- Indexes support common tenant and list queries.
- Raw database errors should not be exposed directly to clients.

### API Security

Recommended protections include:

- Request validation
- CORS configuration
- Security headers
- Rate limiting for authentication endpoints
- Request body size limits
- Safe error handling
- Audit logging for important actions
- Secret management through environment variables

---

## 17. Validation and Error Handling

The backend should validate:

- Required request fields
- Email and password input
- Resource identifiers
- Campaign status values
- Campaign status transitions
- Pagination parameters
- Filter values
- User roles
- Authorization permissions

Recommended status codes:

| Status Code | Meaning |
|---|---|
| `200 OK` | Successful request |
| `201 Created` | Resource successfully created |
| `400 Bad Request` | Invalid request data |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | User lacks permission |
| `404 Not Found` | Resource not found or not visible in tenant scope |
| `409 Conflict` | Duplicate or conflicting operation |
| `500 Internal Server Error` | Unexpected server failure |

For security-sensitive resource lookups, returning `404` for an inaccessible tenant-owned resource can avoid revealing whether the resource exists in another tenant.

---

## 18. Testing and Verification

Before submitting the project, verify the following.

### Authentication Tests

- [ ] Valid login succeeds.
- [ ] Invalid credentials are rejected.
- [ ] Protected endpoints reject missing tokens.
- [ ] Invalid or expired tokens are rejected.
- [ ] Passwords are not returned in API responses.

### Authorization Tests

- [ ] `ADMIN` permissions are enforced.
- [ ] `MANAGER` permissions are enforced.
- [ ] `USER` permissions are enforced.
- [ ] Frontend role visibility cannot bypass backend authorization.
- [ ] Unauthorized actions return the correct status code.

### Multi-Tenant Tests

- [ ] Tenant A can access its own resources.
- [ ] Tenant A cannot read Tenant B resources.
- [ ] Tenant A cannot update Tenant B resources.
- [ ] Tenant A cannot delete Tenant B resources.
- [ ] Client-provided tenant IDs cannot change authorization scope.
- [ ] Client-provided roles cannot elevate permissions.

### Campaign Tests

- [ ] Campaign creation works.
- [ ] Campaign listing works.
- [ ] Campaign detail view works.
- [ ] Campaign update works.
- [ ] Campaign deletion works.
- [ ] User assignment works.
- [ ] User removal works.
- [ ] Invalid status transitions are rejected.
- [ ] Pagination and filtering work.

### Security Event and Audit Tests

- [ ] Events contain required fields.
- [ ] Event filtering works.
- [ ] Event pagination works.
- [ ] Important actions create audit records.
- [ ] Unauthorized users cannot view restricted audit logs.

### Frontend Tests

- [ ] Login page works.
- [ ] Dashboard loads after authentication.
- [ ] Campaign screen works.
- [ ] Security events screen works.
- [ ] User list displays role information.
- [ ] UI actions respect the current role.
- [ ] Loading and error states are handled.

---

## 19. Engineering Notes

### 19.1 Scaling to 1,000 Tenants and 1 Million Users

A possible scaling strategy includes:

1. Add indexes to frequently filtered and joined columns such as:
   - `tenant_id`
   - `user_id`
   - `campaign_id`
   - `status`
   - `created_at`
2. Use server-side pagination instead of loading entire tables.
3. Use PostgreSQL connection pooling.
4. Keep API instances stateless for horizontal scaling.
5. Place the API behind a load balancer.
6. Add caching for suitable read-heavy operations.
7. Move long-running operations to background workers.
8. Use centralized logging and monitoring.
9. Apply tenant-level rate limits and resource quotas.
10. Consider partitioning or tenant-aware sharding only when supported by actual traffic and database measurements.

The first priority should remain correctness, tenant isolation, data integrity, and maintainability.

### 19.2 JWT Revocation

JWTs are generally stateless and remain valid until they expire. A production system that requires immediate revocation could use:

- Short-lived access tokens
- Refresh tokens with rotation
- A server-side session or token table
- A token version stored against the user
- A revocation list for high-risk sessions
- Session invalidation after password changes
- Account-level token invalidation after suspension

The final strategy should consider security requirements, scale, storage, and user experience.

### 19.3 Troubleshooting Many Production 500 Errors

A structured response process would be:

1. Check monitoring dashboards and error-rate alerts.
2. Inspect structured logs and correlation/request IDs.
3. Identify affected endpoints, tenants, and deployments.
4. Check database availability and connection pool usage.
5. Review slow queries and recent schema changes.
6. Check CPU, memory, disk, and network metrics.
7. Review recent code and configuration deployments.
8. Check third-party services and external dependencies.
9. Reproduce the problem in a safe staging environment.
10. Apply a targeted fix or roll back the problematic release.
11. Add a regression test.
12. Continue monitoring after remediation.

Production responses should not expose stack traces, SQL details, secrets, or internal infrastructure information to end users.

---

## 20. Troubleshooting

### Port 4000 Already in Use

Find the process:

```powershell
netstat -ano | findstr :4000
```

Inspect the process:

```powershell
tasklist /FI "PID eq <PID>"
```

Stop an unwanted process:

```powershell
taskkill /PID <PID> /F
```

### Database Connection Failure

Check:

- PostgreSQL is running.
- The database exists.
- The `DATABASE_URL` is correct.
- The username and password are correct.
- The database port is accessible.
- The schema has been applied.
- The backend `.env` file exists.

### Frontend Cannot Reach Backend

Check:

- Backend is running on the expected port.
- Frontend API base URL is correct.
- CORS configuration allows the frontend origin.
- The browser network tab for failed requests.
- The request includes authentication when required.

### Login Fails

Check:

- Seed data was loaded.
- The user email exists.
- The password matches the seed credentials.
- The database connection is working.
- The JWT secret is configured.
- The frontend is calling the correct login endpoint.

### Build or Dependency Errors

Try:

```powershell
pnpm install
pnpm build
```

Use the Node.js version supported by the project. Avoid committing `node_modules` to GitHub.

---

## 21. Submission Checklist

### Repository

- [ ] Complete runnable codebase pushed to GitHub
- [ ] Frontend included
- [ ] Backend included
- [ ] Database schema or migrations included
- [ ] Seed data included
- [ ] `README.md` included
- [ ] `.env.example` included
- [ ] No private secrets committed
- [ ] No unnecessary `node_modules` folders committed

### Functional Verification

- [ ] Backend starts successfully
- [ ] Frontend starts successfully
- [ ] Database initializes successfully
- [ ] Seed data loads successfully
- [ ] Login works
- [ ] Protected routes work
- [ ] RBAC is enforced on the backend
- [ ] Cross-tenant access is blocked
- [ ] Campaign operations work
- [ ] Security event filters and pagination work
- [ ] Audit log permissions work
- [ ] Frontend build succeeds

### Demo Video

- [ ] Record a 5–10 minute demo
- [ ] Show the application running
- [ ] Demonstrate login
- [ ] Demonstrate dashboard
- [ ] Demonstrate campaign management
- [ ] Demonstrate security events
- [ ] Demonstrate role restrictions
- [ ] Demonstrate cross-tenant isolation
- [ ] Upload the video to Google Drive
- [ ] Enable access for the review team
- [ ] Copy the shareable Google Drive link

### Final Submission

Submit both:

1. GitHub repository URL
2. Google Drive demo video URL

The assessment specifies a submission deadline of **24 September 2026 at 6:00 PM IST**.

---

## 22. License

This project was developed as part of the Deep Trace Cybernetics Full Stack Developer technical assessment.


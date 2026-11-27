# WattWise API Documentation

WattWise separates identity/session handling (Next.js App Router + Better Auth) from domain analytics, multi-organization RBAC, and time-series MongoDB aggregations (Express 5 API).

---

## Base URLs

| Service | Production URL (Vercel) | Local Development |
| :--- | :--- | :--- |
| **Frontend & Auth Bridge** | `https://wattwise-frontend-two.vercel.app` | `http://localhost:3000` |
| **Backend Domain API** | `https://wattwise-backend-tau.vercel.app` | `http://localhost:5000` |

---

## Authentication & Authorization Flow

1. Users authenticate against **Better Auth** on the frontend (`/api/auth/*`) using Email/Password or Google OAuth.
2. The client calls `GET /api/auth/token` on the frontend server to verify the Better Auth session cookie and receive a signed **12-hour HS256 JWT** containing `sub`, `email`, `name`, `organizationId`, `role`, and `departmentIds`.
3. Every request to `/api/*` on the Express backend must send:
   ```http
   Authorization: Bearer <token>
   ```
4. Backend middleware enforces:
   - `requireAuth` — verifies JWT signature (`JWT_SECRET` / `BETTER_AUTH_SECRET`), hydrates `wattwise_profiles` by `email`, and blocks `Suspended` profiles (`403`).
   - `blockViewerWrites` — rejects all non-`GET`/`HEAD` requests from `Viewer` accounts (`403`), except self-service `PATCH /api/profile`.
   - `requireRole(...roles)` — restricts sensitive mutations to permitted roles (`403`).
   - `scopeFilter(req)` — automatically isolates queries to `req.user.organizationId` and, for `Department Manager`, locks queries to `req.user.departmentIds`.

### Standard Error Responses

| Status | Meaning | Example Payload |
| :--- | :--- | :--- |
| `400` | Validation or malformed ObjectId error | `{ "error": "Invalid meterId" }` |
| `401` | Missing, invalid, or expired Bearer JWT | `{ "error": "Authentication required" }` |
| `403` | Role restriction, Viewer write block, or suspended account | `{ "error": "Forbidden: Viewer accounts have read-only permissions" }` |
| `404` | Resource missing outside user organization or unknown ID | `{ "error": "Meter not found" }` |
| `409` | Unique index conflict (e.g. duplicate meter reading timestamp or code) | `{ "error": "Duplicate energy record prevented..." }` |

---

## Frontend Auth Bridge Endpoints (`/api/auth/*`)

Hosted by Next.js (`frontend/src/app/api/auth/*`):

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET`, `POST` | `/api/auth/[...all]` | Public | Better Auth core handler (sign-in, sign-up, Google OAuth callback, session, sign-out) |
| `GET` | `/api/auth/token` | Session Cookie | Auto-provisions missing `wattwise_profiles` row (default `Viewer`) and mints 12h API JWT + returns `user` & `organization` |
| `POST` | `/api/auth/token` | Session Cookie | Initializes profile with `{ name, role, organizationId, organizationName }` after registration |
| `GET` | `/api/auth/google-complete` | Session Cookie | Provisions chosen `role` & `org` after Google OAuth sign-up and redirects to workspace |
| `POST` | `/api/auth/demo-bootstrap` | Public | Idempotently ensures the 4 seeded demo credential accounts exist in Better Auth |

---

## Health Endpoints (Public)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Returns `{ ok: true, service: "wattwise-backend", health: "/api/health" }` |
| `GET` | `/api/health` | Runs MongoDB `{ ping: 1 }` and returns `{ ok: true, service: "wattwise-backend", timestamp }` (`500` if DB unavailable) |

---

## Date Range & Dimension Query Parameters

Analytics, dashboard, energy-record, and report endpoints share `parseDateRange` & `applyDimensionFilters` (`backend/src/utils/dateRange.js`):

- `preset`: `'24h' | '7d' | '30d' | '90d' | 'this_month' | 'last_month'` (defaults vary by endpoint; fallback window anchors on `2026-11-25T23:59:59.999Z` when no newer `endDate` is specified)
- `startDate`, `endDate`: ISO date/datetime strings overriding `preset`
- `buildingId`, `floorId`, `departmentId`, `meterId`: optional ObjectId strings (ignored when `'all'`; `Department Manager` access stays locked to authorized departments)

---

## Organizations & Multi-Tenant Management

### `GET /api/organizations/current`
- **Roles:** All authenticated roles
- **Response:** `{ organization, counts: { buildingsCount, floorsCount, departmentsCount, metersCount } }`

### `PATCH /api/organizations/current`
- **Roles:** `Organization Admin`
- **Body (partial Zod `organizationSchema`):** `{ name?, industry?, timezone?, currency?, tariffPerKwh?, emissionFactorKgPerKwh?, contactEmail? }`
- **Response:** `{ organization }`

### `GET /api/organizations/portfolio`
- **Roles:** All authenticated roles
- **Response:** `{ organizations: Array<Org & { isCurrent, buildingsCount, metersCount }> }`

### `POST /api/organizations`
- **Roles:** `Organization Admin`
- **Body:** `{ name, industry?, timezone?, currency?, tariffPerKwh?, emissionFactorKgPerKwh?, contactEmail? }`
- **Response (`201`):** `{ organization }`

### `POST /api/organizations/switch`
- **Roles:** `Organization Admin`
- **Body:** `{ organizationId }`
- **Response:** `{ ok: true, organization }` (updates active `organizationId` on user profile)

---

## Buildings, Floors, Departments & Meters

### Buildings
| Method | Endpoint | Roles | Query / Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/buildings` | All roles | `?q=` search (`name`, `code`, `city`) | `{ buildings }` (enriched with `floorsCount`, `metersCount`, `mtdKwh`, `mtdCost`) |
| `POST` | `/api/buildings` | `Organization Admin` | `{ name, code, address, city, totalSqFt, targetMonthlyKwh, status? }` | `201 { building }` (`409` duplicate `code`) |
| `PATCH` | `/api/buildings/:id` | `Organization Admin` | Partial building fields | `{ building }` |
| `DELETE` | `/api/buildings/:id` | `Organization Admin` | — | `{ ok: true }` |

### Floors
| Method | Endpoint | Roles | Query / Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/floors` | All roles | `?buildingId=` | `{ floors }` (enriched with `buildingName`, `departmentsCount`) |
| `POST` | `/api/floors` | `Organization Admin` | `{ buildingId, floorNumber, name, areaSqFt }` | `201 { floor }` (`409` duplicate floor number) |
| `DELETE` | `/api/floors/:id` | `Organization Admin` | — | `{ ok: true }` |

### Departments
| Method | Endpoint | Roles | Query / Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/departments` | All roles (`Department Manager` scoped) | `?buildingId=&q=` | `{ departments }` (with `buildingName`, `floorName`, `mtdKwh`, `mtdCost`) |
| `POST` | `/api/departments` | `Organization Admin` | `{ buildingId, floorId, name, code, costCenter, monthlyBudgetUsd, headcount? }` | `201 { department }` |
| `PATCH` | `/api/departments/:id` | `Organization Admin` | Partial department fields | `{ department }` |
| `DELETE` | `/api/departments/:id` | `Organization Admin` | — | `{ ok: true }` |

### Electricity Meters
| Method | Endpoint | Roles | Query / Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/meters` | All roles (dept scoped) | `?buildingId=&healthStatus=&q=` | `{ meters }` |
| `POST` | `/api/meters` | `Organization Admin`, `Facility Manager` | `{ buildingId, floorId, departmentId, meterCode, name, meterType, ratedCapacityKw, baselineHourlyKwh, thresholdHourlyKwh, tariffPerKwh?, healthStatus? }` | `201 { meter }` |
| `PATCH` | `/api/meters/:id` | `Organization Admin`, `Facility Manager` | Partial meter fields | `{ meter }` |
| `DELETE` | `/api/meters/:id` | `Organization Admin`, `Facility Manager` | — | `{ ok: true }` |

---

## Energy Records, Export & Simulation

### `GET /api/energy-records`
- **Roles:** All roles (org & dept scoped)
- **Query Params:**
  - `page` (default `1`), `limit` (`5..100`, default `25`)
  - `preset` (default `'90d'`), `startDate`, `endDate`
  - `buildingId`, `floorId`, `departmentId`, `meterId`
  - `anomalyOnly`: `'true'` to return anomaly readings only
  - `q`: debounced search over `meterCode`, `buildingName`, `departmentName`
  - `sortBy`: `'timestamp' | 'consumptionKwh' | 'estimatedCost' | 'demandKw'`
  - `sortDir`: `'asc' | 'desc'`
- **Response:** `{ records, pagination: { page, limit, totalCount, totalPages } }`

### `POST /api/energy-records`
- **Roles:** `Organization Admin`, `Facility Manager`
- **Body:** `{ meterId, consumptionKwh, demandKw?, powerFactor?, timestamp }`
- **Behavior:** Verifies meter membership in `req.user.organizationId`, computes `estimatedCost` and `carbonKg`, detects anomaly (`consumptionKwh > meter.thresholdHourlyKwh`), evaluates active `alert_thresholds`, and blocks duplicate `{ meterId, timestamp }` with `409`.
- **Response (`201`):** `{ record, triggeredAlert }`

### `GET /api/energy-records/export`
- **Roles:** All roles (scoped to user organization/departments)
- **Query Params:** Same date, dimension, `anomalyOnly`, and `q` filters as `GET /api/energy-records` (`preset` defaults to `'30d'`).
- **Response:** Streaming `text/csv; charset=utf-8` attachment (`Content-Disposition: attachment; filename="wattwise-energy-report-YYYY-MM-DD.csv"`), up to `50,000` rows, formula-injection sanitized via `escapeCsvCell`.

### `POST /api/simulation/tick`
- **Roles:** `Organization Admin`, `Facility Manager`
- **Behavior:** Generates live simulated readings across up to 5 non-offline meters, updates `lastReadingAt`, and auto-triggers alerts when spikes exceed thresholds.
- **Response:** `{ timestamp, readings, triggeredAlerts }`

---

## Dashboard & Analytics

### `GET /api/dashboard/overview`
- **Roles:** All roles (scoped)
- **Query Params:** `preset` (default `'30d'`), `startDate`, `endDate`, `buildingId`, `floorId`, `departmentId`, `meterId`
- **Response:**
  - `range`: `{ start, end, prevStart, prevEnd }`
  - `kpis`: `{ totalKwh, totalCost, totalCarbonKg, avgDailyKwh, peakKwh, lowestKwh, recordCount, anomalyCount, prevPeriodKwh, prevPeriodCost, deltaPct, efficiencyScore }`
  - `dailySeries`: `Array<{ date, label, kwh, cost, baseline, anomalies }>`
  - `buildingBreakdown`: top buildings by usage & cost
  - `departmentBreakdown`: top 10 departments by usage & cost
  - `meterBreakdown`: top 8 meters by usage, cost & peak kWh
  - `activeAlerts`: latest 6 `New` / `Acknowledged` alerts
  - `meterHealth`: `{ Healthy, Degraded, Offline }`

### `GET /api/analytics`
- **Roles:** All roles (scoped)
- **Query Params:** `preset` (default `'30d'`), `startDate`, `endDate`, `buildingId`, `floorId`, `departmentId`, `meterId`
- **Response:**
  - `hourlyUsage`: `Array<{ hour, avgKwh, peakKwh, totalKwh }>`
  - `dailyUsage`: `Array<{ date, label, kwh, cost, carbonKg }>`
  - `weeklyUsage`: `Array<{ week, label, kwh, cost, carbonKg }>` (ISO weeks `%G-W%V` across the quarter)
  - `monthlyUsage`: `Array<{ month, kwh, cost, carbonKg }>`
  - `buildingComparison`: `Array<{ id, name, kwh, cost, carbonKg, intensityPerSqFt }>`
  - `departmentComparison`: `Array<{ id, name, kwh, cost, budgetUsd, utilizationPct }>`
  - `costAnalysis`: `Array<{ category, kwh, cost }>` grouped by `meterType`
  - `forecast`: 7-day projection (`Array<{ date, label, projectedKwh, lowerBound, upperBound }>`)

---

## Alerts & Threshold Rules

| Method | Endpoint | Roles | Query / Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/alerts` | All roles (dept scoped) | `?status=&severity=&buildingId=` | `{ alerts, summary: { New, Acknowledged, Resolved } }` |
| `PATCH` | `/api/alerts/:id/status` | `Organization Admin`, `Facility Manager`, `Department Manager` | `{ status: 'New' \| 'Acknowledged' \| 'Resolved' }` | `{ alert }` |
| `GET` | `/api/thresholds` | All roles | — | `{ thresholds }` |
| `POST` | `/api/thresholds` | `Organization Admin`, `Facility Manager` | `{ name, buildingId?, meterId?, metric?, limitValue, spikeMultiplier?, severity?, enabled? }` | `201 { threshold }` |
| `PATCH` | `/api/thresholds/:id` | `Organization Admin`, `Facility Manager` | Partial threshold rule | `{ threshold }` |
| `DELETE` | `/api/thresholds/:id` | `Organization Admin`, `Facility Manager` | — | `{ ok: true }` |

---

## Insights, Reports, Users & Profile

| Method | Endpoint | Roles | Query / Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/insights` | All roles (scoped) | `?preset=` (default `'30d'`) | `{ anomalies, peakHours, highestConsumers, historicalComparison, carbonSummary, recommendations }` |
| `PATCH` | `/api/insights/recommendations/:id` | `Organization Admin`, `Facility Manager`, `Department Manager` | `{ status: 'Open' \| 'Accepted' \| 'Dismissed' }` | `{ recommendation }` |
| `GET` | `/api/reports/summary` | All roles (scoped) | `?preset=&startDate=&endDate=&buildingId=&departmentId=` | `{ generatedAt, organization, currency, range, totals, breakdown }` |
| `GET` | `/api/reports/scheduled` | All roles | — | `{ schedules }` |
| `POST` | `/api/reports/scheduled` | `Organization Admin`, `Facility Manager` | `{ name, frequency, format, recipients, buildingId?, enabled? }` | `201 { schedule }` |
| `DELETE` | `/api/reports/scheduled/:id` | `Organization Admin`, `Facility Manager` | — | `{ ok: true }` |
| `GET` | `/api/users` | `Organization Admin` | — | `{ users }` (enriched with `departmentNames`) |
| `PATCH` | `/api/users/:id` | `Organization Admin` | `{ role, departmentIds, status }` | `{ user }` |
| `GET` | `/api/profile` | All roles | — | `{ profile, organization }` |
| `PATCH` | `/api/profile` | All roles (including `Viewer`) | `{ name?, themePreference?, timezone? }` | `{ profile }` |

# WattWise — Smart Energy Consumption Intelligence Platform

WattWise is a multi-organization smart energy monitoring, time-series analytics, and automated threshold alerting platform built with **Next.js (App Router)**, **TypeScript**, **Express 5**, **MongoDB**, and **Better Auth**. It enables commercial real estate portfolios, manufacturing facilities, and university campuses to monitor electricity usage down to individual sub-meters, identify abnormal consumption spikes, estimate CO2 emissions, and export custom compliance reports.

---

## Live Deployments & Links

- **Live Web Application (Frontend):** [https://wattwise-frontend-two.vercel.app](https://wattwise-frontend-two.vercel.app)
- **Live Domain API (Backend):** [https://wattwise-backend-tau.vercel.app](https://wattwise-backend-tau.vercel.app)
- **API Health Check:** [https://wattwise-backend-tau.vercel.app/api/health](https://wattwise-backend-tau.vercel.app/api/health)
- **Source Repository:** [https://github.com/Jifan-Mahmud/WattWise](https://github.com/Jifan-Mahmud/WattWise)

---

## Demo Credentials for All Four Roles

All seeded demo operators belong to **Northgrid Commercial Holdings** and share the same password. One-click autofill buttons are also available directly on the [`/login`](https://wattwise-frontend-two.vercel.app/login) page and [`/roles`](https://wattwise-frontend-two.vercel.app/roles) directory.

| Role | Name | Email | Password | Scope & Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Organization Admin** | Elena Rostova | `admin@wattwise.io` | `WattWise#2026!` | Full organization control: manage org portfolio/switching, buildings, floors, departments, meters, users & roles |
| **Facility Manager** | Marcus Vance | `facility@wattwise.io` | `WattWise#2026!` | Manage electricity meters, log readings, configure alert thresholds, triage alerts, manage scheduled reports |
| **Department Manager** | Nadia Chen | `dept@wattwise.io` | `WattWise#2026!` | Scoped strictly to assigned departments: monitor dept usage, budgets, alerts, recommendations, and export reports |
| **Viewer** | Tariq Al-Mansoor | `viewer@wattwise.io` | `WattWise#2026!` | Read-only access across dashboards, analytics, energy records, alerts, and reports (mutations blocked with `403`, except self profile theme/timezone) |

---

## Architecture & Tech Stack

- **Frontend (`frontend/`):** Next.js `16.4.6` (App Router), React `19.3.0`, TypeScript, Tailwind CSS v4 (`@tailwindcss/turbopack`), HeroUI v3, Recharts 3, Motion (`motion/react`), Gravity UI Icons (`@gravity-ui/icons`).
- **Authentication (`frontend/`):** Better Auth (`better-auth` + `@better-auth/mongo-adapter`) supporting Email/Password and Google OAuth with account linking, plus an internal 12-hour HS256 JWT token bridge (`GET /api/auth/token`) for decoupled Express API calls.
- **Backend (`backend/`):** Node.js, Express `5.3.0`, MongoDB driver `7.9.1`, Zod `4.6.7`, `jose-cjs` `6.2.3`.
- **Database:** MongoDB Atlas with 11 domain collections, 4 Better Auth collections, and 21 compound/unique indexes (see [Database Design](docs/DATABASE.md)).

---

## Implemented Capabilities

### Core Platform Modules
- **Multi-Organization Hierarchy:** Organization overview & tariff/emission settings, portfolio switcher, and CRUD across **Buildings**, **Floors**, **Departments**, and **Electricity Meters**.
- **Time-Series Energy Management:** Server-side paginated and sorted ledger (`GET /api/energy-records`) with debounced search, date range presets (`24h`, `7d`, `30d`, `90d`, `this_month`, `last_month`, or custom `startDate`/`endDate`), hierarchy filters, automatic cost (`consumptionKwh * tariffPerKwh`) & CO2e calculation, and duplicate `(meterId, timestamp)` conflict protection (`409`).
- **Monitoring Dashboard (`/dashboard`):** KPIs (Total Energy, Total Cost, Avg Daily Usage, Peak & Lowest Usage, Previous Period % Comparison), daily load profile with baseline overlay, Building/Department/Meter breakdowns, meter health summary, and active alerts feed.
- **Energy Analytics (`/analytics`):** Recharts visualizations covering **Hourly Usage**, **Daily Usage**, **Weekly Consumption** (ISO `%G-W%V`), **Monthly Consumption**, **Building Comparison** (incl. intensity/sq ft), **Department Budget Utilization**, **Cost Analysis** by meter type, and a **7-Day Consumption Forecast**.
- **Alert & Threshold System (`/alerts`):** Configurable rules (`hourly_kwh`, `daily_kwh`, `spike_ratio`), automatic threshold evaluation on reading ingestion/simulation, lifecycle triage (`New` -> `Acknowledged` -> `Resolved`), and filters by status, severity, and **building**.
- **Energy Insights (`/insights`):** High-consumption anomaly detection, peak hours ranking, highest-consuming buildings/departments, period-over-period comparisons, carbon & tree-equivalent metrics, and actionable saving recommendations (`Open` / `Accepted` / `Dismissed`).
- **Reporting & Exports (`/reports`):** Streaming formula-safe CSV export (`GET /api/energy-records/export`, up to 50,000 rows), printable browser PDF report view, and recurring **Scheduled Reports** management.
- **Role-Based Access, Self-Service Onboarding & Approvals (`/register`, `/users`, `/settings`):** Users joining an existing organization search organizations during registration and always start as read-only `Viewer` (with optional `Facility Manager` or `Department Manager` requests queued for the Organization Admin in `/users`), while creating a new organization grants `Organization Admin` strictly for that new workspace. Dark/light theme and timezone preferences work for all roles.

---

## Sample Dataset Scale

Running the deterministic seed script (`backend/src/scripts/seed.js`) populates MongoDB with realistic multi-interval telemetry exceeding every minimum requirement:

- **Organizations:** `3` seeded portfolios (Northgrid Commercial Holdings, Apex Fab Industries, Metro State University; live DB also preserves user-created orgs)
- **Buildings:** `12` (minimum required: `10`)
- **Floors:** `36` (minimum required: `30`)
- **Departments:** `60` (minimum required: `50`)
- **Electricity Meters:** `84` across HVAC, Chiller, Server Room, Lighting, Production, and Main Feeder types
- **Energy Records:** `60,480` seeded records spanning `2026-09-01` to `2026-11-25` (minimum required: `50,000`)

---

## Project Structure

```text
WATTWISE/
├── backend/                  # Express 5 REST & aggregation API
│   ├── src/
│   │   ├── config/           # env loader & MongoDB pool + 21 indexes
│   │   ├── middleware/       # JWT verification, RBAC roles, Viewer lock, scopeFilter
│   │   ├── routes/           # hierarchy, energy, analytics, alerts, insights
│   │   ├── schemas/          # Zod input validators
│   │   ├── scripts/          # seed.js (60,480 records generator)
│   │   └── utils/            # tariff/carbon math, CSV escaping, dateRange parser
│   └── vercel.json
├── frontend/                 # Next.js 16 App Router UI + Better Auth
│   ├── src/
│   │   ├── app/              # landing, /login, /register, /roles, (workspace) pages, /api/auth/*
│   │   ├── components/       # AppProviders, layout shell, auth showcase, motion/state UI
│   │   ├── hooks/            # useUrlFilters
│   │   └── lib/              # Better Auth, Mongo client, demo credentials, API cache client
│   └── vercel.json
├── docs/
│   ├── DATABASE.md           # ER diagram, 11 domain + 4 auth collections, 21 indexes
│   └── API.md                # All REST & Next.js auth bridge endpoint specs
└── README.md
```

---

## Local Setup & Development

### Prerequisites
- Node.js `20+` and `npm`
- MongoDB Atlas (or local MongoDB instance)
- Google Cloud OAuth credentials *(optional — only needed for Google sign-in)*

### 1. Install Dependencies
```bash
npm --prefix backend install
npm --prefix frontend install
```

### 2. Configure Environment Variables

Create **`backend/.env`**:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=Cluster0
MONGODB_DB_NAME=wattwise
BETTER_AUTH_SECRET=replace-with-a-strong-32plus-char-shared-secret
FRONTEND_URL=http://localhost:3000
```

Create **`frontend/.env.local`**:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=Cluster0
MONGODB_DB_NAME=wattwise
BETTER_AUTH_SECRET=replace-with-a-strong-32plus-char-shared-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

> [!IMPORTANT]
> `BETTER_AUTH_SECRET` in `frontend/.env.local` and `BETTER_AUTH_SECRET` (or `JWT_SECRET`) in `backend/.env` **must match** so JWT tokens minted by `/api/auth/token` verify cleanly on the backend.

### 3. Seed the Database
```bash
npm --prefix backend run seed
```

### 4. Run Backend & Frontend
```bash
# Terminal 1 — Express API on http://localhost:5000
npm --prefix backend run dev

# Terminal 2 — Next.js frontend on http://localhost:3000
npm --prefix frontend run dev
```

---

## Additional Documentation

- **[Database Design & Schema Reference](docs/DATABASE.md)** — Mermaid ER diagram, full field specifications for all collections, 21 MongoDB indexes, and sample dataset details.
- **[API Reference](docs/API.md)** — Complete route catalog, Better Auth token bridge flow, RBAC enforcement matrix, and query parameters.

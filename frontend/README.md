# RENALIS - Clinical Frontend

> **Digital Twin Challenge 2026**  
> Clinical Overview & Chronic Kidney Disease (CKD) Progression Digital Twin Dashboard.

---

## ⚠️ Synthetic Data & Clinical Validation Notice

**All data is synthetic and forecasts are not clinically validated.**  
- Patient demographics, baseline lab panels, longitudinal monthly telemetry, and disease trajectories are 100% synthetically generated for research, prototype demonstration, and algorithmic benchmarking.
- RENALIS is an investigational software prototype developed for the **Digital Twin Challenge 2026**. It must **not** be used for primary medical diagnosis, patient treatment planning, or acute clinical decisions without certified clinician validation.

---

## Tech Stack & Architecture

- **Core**: React 19 + TypeScript (scaffolded with Vite)
- **Routing**: `react-router-dom` v7 (Navigation shell with dynamic active links)
- **Charts & Telemetry**: `recharts`
- **Styling**: Vanilla CSS Design Tokens (Strict Light Theme Only)
  - Navy: `#152C3B`
  - Teal: `#176B63`
  - Blue: `#5279B9`
  - Canvas: `#F5F7F8`
  - Surface: `#FFFFFF`
  - Border: `#DCE5EA`
  - Typography: `Inter` (Google Fonts)
  - Clinical Risk Pills: High (Red), Medium (Amber), Low (Green) with circular status dot (`●`)

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)
- RENALIS FastAPI backend running locally (see [Backend Instructions](../backend/README.md))

### 2. Installation
Navigate into the `frontend/` directory and install dependencies:

```bash
cd frontend
npm install
```

### 3. Environment Configuration
The frontend connects to the FastAPI backend using `VITE_API_URL`.  
Copy the example environment file:

```bash
cp .env.example .env
```

Contents of `.env.example`:
```ini
VITE_API_URL=http://127.0.0.1:8000
```

### 4. Running the Development Server
Start the local Vite development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The backend CORS policy is preconfigured to accept requests from this origin.

### 5. Production Build & Type Checking
To validate types and bundle for production:

```bash
npm run build
```

The compiled output will be written to `frontend/dist/`. To preview the production bundle locally:

```bash
npm run preview
```

---

## Backend Endpoints Used

The frontend interacts with the FastAPI backend via `src/api/client.ts`:

| Method | Endpoint | Description | Dashboard Usage |
|---|---|---|---|
| `GET` | `/health` | Backend status & ML model availability | Service health checks |
| `GET` | `/patients` | Paginated synthetic patient cohort list | Computes **Total Patients** stat card & populates **Recent Patients** table |
| `GET` | `/patients/{id}` | Longitudinal telemetry (months 1–12) for a specific patient | Detailed twin inspection & trajectory analysis |
| `GET` | `/referrals` | Multidisciplinary referral queue | Computes **Referrals Pending** stat card |
| `POST` | `/referrals` | Submit a new referral record | Care team workflow triage |
| `POST` | `/assess-patient` | Evaluates 3-month risk of >10% eGFR decline | Progression simulation & KDIGO risk tiering |

> **Note on Stat Cards:**  
> In accordance with clinical system requirements, metrics without an active backend API source (such as *Pending Assessments* and *Follow-ups Due*) display an intentional `"–"` placeholder rather than simulated or fabricated values.

---

## Project Structure

```
frontend/
├── .env.example             # Base API environment template
├── .gitignore               # Ignores node_modules, dist, .env
├── index.html               # Main HTML entry with Inter font
├── package.json             # Minimal dependencies (React, react-router-dom, recharts)
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
├── README.md                # Frontend documentation
└── src/
    ├── main.tsx             # Root React DOM entry
    ├── App.tsx              # React Router route definitions
    ├── index.css            # Global CSS variables, design tokens, resets
    ├── api/
    │   └── client.ts        # Fully typed FastAPI HTTP client
    ├── components/
    │   ├── Layout.tsx       # Sidebar + TopBar + Page shell
    │   ├── Layout.css
    │   ├── Sidebar.tsx      # Dark teal-navy brand navigation & role selector
    │   ├── Sidebar.css
    │   ├── TopBar.tsx       # Search, date, notifications, Synthetic Data pill
    │   ├── TopBar.css
    │   ├── RiskBadge.tsx    # KDIGO High/Medium/Low pill with colored dot
    │   └── RiskBadge.css
    ├── pages/
    │   ├── OverviewPage.tsx # Clinical Overview screen (Stats, Table, Follow-ups)
    │   ├── OverviewPage.css
    │   ├── ComingSoonPage.tsx # Modular placeholder for non-overview routes
    │   └── ComingSoonPage.css
    └── utils/
        └── patientNames.ts  # Deterministic synthetic names & KDIGO risk helpers
```

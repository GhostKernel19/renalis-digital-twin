# RENALIS - Accessible Soft UI Frontend
 
> **Digital Twin Challenge 2026**  
> Chronic Kidney Disease (CKD) Computational Digital Twin & Care Coordination Interface.

---

## ⚠️ Synthetic Data & Clinical Notice

> **IMPORTANT: All patient data, vitals, laboratory panels, and progression scores are 100% synthetic.**
> - All persona records and telemetry are artificially generated research artifacts for the Digital Twin Challenge 2026.
> - Digital twin trajectory predictions and risk estimations are experimental prototypes and are **NOT clinically validated**. This software must not be used for clinical decision-making, diagnosis, or triage.
> - **Rule 5 Compliance**: Strictly zero drug names, dosages, or prescriptive treatment advice in the UI.

---

## Design System Tokens (Soft UI / Neumorphism)

The RENALIS frontend implements an accessible soft UI / neumorphic design system with high-contrast accessibility (WCAG AA compliant):

| Token | Value | Description |
|---|---|---|
| `--color-bg` | `#E8EDF2` | Neumorphic soft canvas background |
| `--color-border` | `#C9D3DC` | 1px border on cards and inputs |
| `--color-text-primary` | `#152C3B` | High contrast body and heading text |
| `--color-text-secondary` | `#44566A` | Accessible secondary text (contrast ratio > 4.5:1) |
| `--color-teal` | `#176B63` | Primary brand accent with white text |
| `--tag-green-bg` / `text` | `#D8ECE5` / `#0F5B4E` | Routine / Complete status tags with icon & word |
| `--tag-amber-bg` / `text` | `#FDEED9` / `#8A4A0A` | Current step / Moderate status tags with icon & word |
| `--tag-red-bg` / `text` | `#FDE3E0` / `#A6261B` | Urgent / High risk status tags with icon & word |
| `--shadow-raised` | Dual Shadow | Soft highlight top-left (`rgba(255,255,255,0.95)`), darker bottom-right (`rgba(166,180,198,0.5)`) |
| `--shadow-inset` | Inset Shadow | Sunken depth for form inputs and pressed / active states |
| Typography | `Inter` (Google Fonts) | Base font size 18px (with 22px larger mode), line height 1.5 |
| Radii | `20px` (`--radius-card`) | Consistent rounded corners |
| Touch Target | `48px` minimum | Accessible touch targets for buttons, inputs, and toggles |
| Focus Outlines | `2px solid #176B63` | Visible focus outline for keyboard accessibility |

---

## Roles & Navigation

- **View as Switch**: Located in the top bar (`Patient` vs `Care team`), state persisted in `localStorage`.
- **Patient Role (`YOUR CARE`)**:
  - **Patient Picker**: Searchable synthetic ID selector in the TopBar (populated dynamically from `GET /patients`), saved in `localStorage`.
  - **Routes**:
    1. `/` (Home)
    2. `/log-today` (Log today)
    3. `/my-kidney-health` (My kidney health)
    4. `/language-help` (Language & help)
- **Care Team Role (`CARE TEAM`)**:
  - **Routes**:
    1. `/patients` (Cohort directory & search)
    2. `/patients/:id` (Clinician patient view)
    3. `/patient-intake` (3-step intake workflow)
    4. `/referral-queue` (Care coordination referrals)
    5. `/follow-ups` (Appointment management)
    6. `/reports` (Cohort analytics & health diagnostics)
- **Responsive Navigation**: On viewports below `900px`, the sidebar automatically transforms into an accessible fixed bottom navigation bar, and multi-column grids collapse into a single column.

---

## 10 Active Pages Overview

| # | Route | Mode | Page | Description & API Integration |
|---|---|---|---|---|
| 1 | `/` | Patient | `OverviewPage` | Kidney score, risk tier, and plain trend sentence from `GET /patients/{id}/twin`; next scheduled appointment from `GET /follow-ups`; today's log summary from `GET /patients/{id}/logs`. Friendly empty state when no data exists. |
| 2 | `/log-today` | Patient | `LogTodayPage` | Daily vitals form that `POST`s to `/patients/{id}/logs`. Selecting "None of these" clears other symptoms. Displays high-visibility urgent banner (red, icon + text, Call 112) when `urgent=true`. Shows save confirmation and recent logs. |
| 3 | `/my-kidney-health` | Patient | `MyKidneyHealthPage` | Recharts longitudinal chart with solid measured line, clearly visible dotted 3-month estimate line, and light 95% uncertainty band. Includes plain-language progression summary, top 3 drivers, and "An estimate, not a diagnosis" card. |
| 4 | `/language-help` | Patient | `LanguageHelpPage` | Switcher for English, हिंदी, and मराठी translating all patient screens via `src/i18n` dictionaries. Text size toggle (18px and 22px) saved in `localStorage` scaling the entire UI. Emergency 112 card and demo health worker card. |
| 5 | `/patients` | Care Team | `PatientsPage` | Searchable and filterable table from `GET /patients` with risk tags and pagination. Row click navigates to clinician view. |
| 6 | `/patients/:id` | Care Team | `ClinicianPatientViewPage` | Kidney score trajectory with forecast line and uncertainty band, multi-metric BP/adherence/steps trends, top 3 drivers, model basis, recent logs, and action buttons: "Mark reviewed" (`PATCH /referrals`) and "Request repeat test" (`POST /follow-ups`). |
| 7 | `/patient-intake` | Care Team | `PatientIntakePage` | 3-step intake form submitting `POST /patients`. Calculates 2021 CKD-EPI eGFR, displays twin result and basis, with post-intake options to create a referral (Routine/Urgent) and follow-up. |
| 8 | `/referral-queue` | Care Team | `ReferralQueuePage` | Stat tiles from `GET /stats`, priority and status filters, search, table from `GET /referrals`. "Open" opens the clinician patient view. |
| 9 | `/follow-ups` | Care Team | `FollowUpsPage` | Lists scheduled care appointments from `GET /follow-ups`. Supports scheduling generic appointments (`POST /follow-ups`) and marking Completed/Cancelled (`PATCH /follow-ups/{id}`). |
| 10 | `/reports` | Care Team | `ReportsPage` | Visual charts from `GET /stats` (risk tier distribution, referrals by status, follow-ups) and digital twin model diagnostics from `GET /health`. |

---

## Running the Application

### 1. Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)
- Python FastAPI backend running at `http://127.0.0.1:8000`

### 2. Start Development Server
```bash
cd frontend
npm install
npm run dev
```

### 3. Build & Validate
```bash
npm run build
```
Type checks via `tsc -b` and bundles using Vite with zero errors.

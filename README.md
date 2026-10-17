# RENALIS: CKD Digital Twin & Care Coordination

RENALIS is a computational digital twin and care coordination prototype developed for the **Digital Twin Challenge 2026**. The platform constructs an interactive, longitudinal digital twin for Chronic Kidney Disease (CKD) patients to simulate disease trajectory under standard care, model counterfactual intervention scenarios (such as guideline-directed medical therapy titration and blood pressure targets), and support multidisciplinary care teams with proactive, risk-stratified alerts.

---

> ### ⚠️ Disclaimer & Synthetic Data Notice
> **All patient data, records, laboratory values, and longitudinal telemetry used, generated, or displayed by RENALIS are 100% synthetic** (derived from Synthea and specialized synthetic biological generators). No real patient or Protected Health Information (PHI) is present.
>
> **The disease progression trajectories, risk scores, and counterfactual simulation outputs are experimental research prototypes and are NOT clinically validated.** This software is developed solely for demonstration and research purposes in the Digital Twin Challenge 2026 and must not be used for clinical decision-making, medical diagnosis, or treatment planning.

---

## Planned Architecture

```
┌────────────────────────────────────────────────────────┐
│               Frontend (React + Vite + TS)             │
│  - Interactive Twin Profile & Longitudinal Lab Viewer │
│  - Counterfactual Intervention Simulator (Recharts)   │
│  - Care Coordination & KDIGO Alert Dashboard          │
└───────────────────────────▲────────────────────────────┘
                            │ REST APIs
┌───────────────────────────▼────────────────────────────┐
│                  Backend (Python FastAPI)              │
│  - Digital Twin State Manager & Simulation Service     │
│  - Care Guideline & Alert Evaluation Engine            │
│  - Patient Data Persistence & Ingestion Endpoints      │
└─────────────▲────────────────────────────▲─────────────┘
              │                            │
┌─────────────▼─────────────┐┌─────────────▼─────────────┐
│  ML Engine (scikit-learn) ││   Synthetic Data Layer    │
│  - Progression Forecasting││  - Synthea Cohorts        │
│  - eGFR Trajectory Models ││  - Longitudinal Generator │
└───────────────────────────┘└───────────────────────────┘
```

- **Frontend:** React + TypeScript powered by Vite, utilizing Recharts for multi-variate trajectory and lab visualization, styled with a modern vanilla CSS design system.
- **Backend:** Python FastAPI microservice providing REST APIs for patient state updates, simulation runs, and clinical alert dispatching.
- **Machine Learning:** scikit-learn models for multivariate CKD progression risk scoring, trajectory slope estimation, and counterfactual response forecasting.
- **Data Layer:** Synthetic patient profiles generated with Synthea, augmented by a custom longitudinal CKD telemetry generator simulating eGFR, uACR, creatinine, and vitals over time.

---

## Project Structure

```
renalis-digital-twin/
├── frontend/    # React + TypeScript (Vite) client application
├── backend/     # Python FastAPI backend & simulation services
├── ml/          # scikit-learn models and progression forecasting pipelines
├── data/        # Synthetic cohorts & longitudinal generator scripts
└── docs/        # Architecture specs, clinical notes, and challenge materials
```

---

## Setup Instructions

*To be added (pending dependency scaffolding phase).*

---

## Team

- **[Team Member 1]** - Role / Lead (e.g., Clinical Informatics & Architecture) - *[Affiliation / Contact]*
- **[Team Member 2]** - Role (e.g., ML Engineering & Simulation Models) - *[Affiliation / Contact]*
- **[Team Member 3]** - Role (e.g., Full-Stack & Frontend Development) - *[Affiliation / Contact]*
- **[Team Member 4]** - Role (e.g., Data Engineering & Synthetic Pipelines) - *[Affiliation / Contact]*

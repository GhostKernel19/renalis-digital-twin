# RENALIS - Backend

This directory contains the core API and digital twin simulation backend service for RENALIS.

## Planned Stack
- **Framework:** Python FastAPI
- **Data Serialization:** Pydantic models
- **Database:** SQLite (local development) / SQLAlchemy ORM

## Scope
- REST API endpoints for patient records, longitudinal biomarker tracking, and digital twin state management
- Simulation engine interfacing with ML progression models for counterfactual "what-if" scenarios
- Care coordination logic: guideline-directed alert rules (KDIGO guidelines) and risk stratification

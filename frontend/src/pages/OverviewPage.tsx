import React, { useEffect, useState } from 'react';
import {
  getPatients,
  getReferrals,
  type Patient,
  type Referral,
} from '../api/client';
import { RiskBadge, type RiskLevel } from '../components/RiskBadge';
import {
  getPatientDisplayName,
  getPatientRiskLevel,
} from '../utils/patientNames';
import './OverviewPage.css';

export const OverviewPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalPatients, setTotalPatients] = useState<number | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patientsRes, referralsRes] = await Promise.all([
        getPatients(10, 0),
        getReferrals(),
      ]);

      setPatients(patientsRes.patients || []);
      setTotalPatients(patientsRes.total ?? patientsRes.count ?? patientsRes.patients.length);
      setReferrals(referralsRes || []);
    } catch (err: any) {
      console.error('Failed to load overview data:', err);
      setError(
        err.message || 'Unable to connect to the RENALIS FastAPI backend service.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitial() {
      try {
        const [patientsRes, referralsRes] = await Promise.all([
          getPatients(10, 0),
          getReferrals(),
        ]);

        if (!ignore) {
          setPatients(patientsRes.patients || []);
          setTotalPatients(patientsRes.total ?? patientsRes.count ?? patientsRes.patients.length);
          setReferrals(referralsRes || []);
        }
      } catch (err: any) {
        if (!ignore) {
          console.error('Failed to load overview data:', err);
          setError(
            err.message || 'Unable to connect to the RENALIS FastAPI backend service.'
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitial();
    return () => {
      ignore = true;
    };
  }, []);

  // Compute pending referrals count from API
  const pendingReferralsCount = referrals.filter(
    (r) => r.status?.toLowerCase() === 'pending'
  ).length;

  // Format stage from eGFR
  const getCkdStage = (egfr: number): string => {
    if (egfr >= 90) return 'G1 (Normal)';
    if (egfr >= 60) return 'G2 (Mild)';
    if (egfr >= 45) return 'G3a (Moderate)';
    if (egfr >= 30) return 'G3b (Mod-Severe)';
    if (egfr >= 15) return 'G4 (Severe)';
    return 'G5 (Failure)';
  };

  return (
    <div className="overview-page">
      {/* Header Greeting */}
      <div className="overview-header">
        <div>
          <h1 className="overview-title">Clinical Overview</h1>
          <p className="overview-subtitle">
            Longitudinal CKD digital twin telemetry, progression alerts, and care coordination.
          </p>
        </div>
        <div className="overview-header-actions">
          <button
            type="button"
            onClick={handleRefresh}
            className="overview-refresh-btn"
            disabled={loading}
            title="Refresh clinical data"
          >
            <svg
              className={loading ? 'spinning' : ''}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="overview-error-banner" role="alert">
          <div className="overview-error-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="overview-error-content">
            <h2 className="overview-error-title">Backend Service Not Reachable</h2>
            <p className="overview-error-message">
              Cannot connect to the RENALIS backend at <code>http://127.0.0.1:8000</code>.
            </p>
            <div className="overview-error-steps">
              <strong>How to start the backend:</strong>
              <ol>
                <li>Open a new terminal in the project directory: <code>cd backend</code></li>
                <li>Activate virtual environment: <code>.\.venv\Scripts\activate</code> (Windows) or <code>source .venv/bin/activate</code> (Mac/Linux)</li>
                <li>Start FastAPI server: <code>uvicorn app.main:app --reload</code></li>
              </ol>
            </div>
            <button type="button" onClick={handleRefresh} className="overview-retry-btn">
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="overview-stats-grid">
        {/* Card 1: Total Patients */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Patients</span>
            <div className="stat-icon-wrapper icon-teal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">
              {loading && totalPatients === null ? (
                <span className="stat-placeholder-pulse" />
              ) : totalPatients !== null ? (
                totalPatients.toLocaleString()
              ) : (
                '–'
              )}
            </span>
            <span className="stat-card-subtext">Active synthetic cohort</span>
          </div>
        </div>

        {/* Card 2: Pending Assessments (No API source yet -> show "–") */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Pending Assessments</span>
            <div className="stat-icon-wrapper icon-blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M9 12h6" />
                <path d="M9 16h6" />
              </svg>
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">–</span>
            <span className="stat-card-subtext">Awaiting month 9 lab telemetry</span>
          </div>
        </div>

        {/* Card 3: Referrals Pending (Computed from GET /referrals) */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Referrals Pending</span>
            <div className="stat-icon-wrapper icon-amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">
              {loading && totalPatients === null ? (
                <span className="stat-placeholder-pulse" />
              ) : (
                pendingReferralsCount
              )}
            </span>
            <span className="stat-card-subtext">Requires care team triage</span>
          </div>
        </div>

        {/* Card 4: Follow-ups Due (No API source yet -> show "–") */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Follow-ups Due</span>
            <div className="stat-icon-wrapper icon-navy">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">–</span>
            <span className="stat-card-subtext">Scheduled this week</span>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Recent Patients Table (Left) + Upcoming Follow-ups (Right) */}
      <div className="overview-content-layout">
        {/* Left Column: Recent Patients Table */}
        <section className="overview-table-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent Patients</h2>
              <p className="card-subtitle">
                Synthetic CKD cohort baseline labs & progression risk classification
              </p>
            </div>
            {totalPatients !== null && (
              <span className="card-badge-count">{totalPatients} Total Cohort</span>
            )}
          </div>

          <div className="table-responsive">
            <table className="patients-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Risk Level</th>
                  <th>Latest eGFR</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {loading && patients.length === 0 ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="table-row-skeleton">
                      <td><div className="skeleton-bar w-16" /></td>
                      <td><div className="skeleton-bar w-28" /></td>
                      <td><div className="skeleton-bar w-12" /></td>
                      <td><div className="skeleton-bar w-20" /></td>
                      <td><div className="skeleton-bar w-24" /></td>
                      <td><div className="skeleton-bar w-16" /></td>
                    </tr>
                  ))
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-empty-cell">
                      {error ? 'No patient data loaded (backend unreachable).' : 'No patient records found.'}
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => {
                    const name = getPatientDisplayName(patient);
                    const risk: RiskLevel = getPatientRiskLevel(patient);
                    const egfrVal = patient.baseline_egfr ?? 60;
                    const stage = getCkdStage(egfrVal);

                    return (
                      <tr key={patient.patient_id} className="patient-row">
                        {/* Patient ID */}
                        <td>
                          <span className="patient-id-badge">{patient.patient_id}</span>
                        </td>

                        {/* Name */}
                        <td>
                          <div className="patient-name-cell">
                            <span className="patient-avatar-mini">
                              {name.charAt(0)}
                            </span>
                            <span className="patient-name-text">{name}</span>
                          </div>
                        </td>

                        {/* Age & Sex */}
                        <td>
                          <span className="patient-age-text">
                            {patient.age} yrs • {patient.sex}
                          </span>
                        </td>

                        {/* Risk Level Pill */}
                        <td>
                          <RiskBadge level={risk} />
                        </td>

                        {/* Latest eGFR */}
                        <td>
                          <div className="egfr-cell">
                            <span className="egfr-value">{egfrVal.toFixed(1)}</span>
                            <span className="egfr-unit">mL/min</span>
                            <span className="egfr-stage-tag">{stage.split(' ')[0]}</span>
                          </div>
                        </td>

                        {/* Last Updated */}
                        <td>
                          <span className="last-updated-text">Month 9</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Column: Upcoming Follow-ups list */}
        <aside className="overview-followups-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Upcoming Follow-ups</h2>
              <p className="card-subtitle">Scheduled care team touchpoints</p>
            </div>
            <span className="card-badge-count">4 Scheduled</span>
          </div>

          <div className="followups-list">
            {/* Follow-up Item 1 */}
            <div className="followup-item urgency-high">
              <div className="followup-time-badge due-today">Due Today</div>
              <div className="followup-body">
                <div className="followup-patient">
                  <span className="followup-pid">SYN-001</span>
                  <span className="followup-name">Arthur Pendelton</span>
                </div>
                <p className="followup-task">
                  Medication adherence review & SGLT2i / RASi titration check
                </p>
                <div className="followup-meta">
                  <span className="followup-provider">Dr. Sarah Lin (Lead)</span>
                  <span className="followup-status">Pending Review</span>
                </div>
              </div>
            </div>

            {/* Follow-up Item 2 */}
            <div className="followup-item urgency-medium">
              <div className="followup-time-badge due-soon">Tomorrow • 09:30 AM</div>
              <div className="followup-body">
                <div className="followup-patient">
                  <span className="followup-pid">SYN-002</span>
                  <span className="followup-name">Marcus Miller</span>
                </div>
                <p className="followup-task">
                  Repeat serum creatinine & proteinuria qualitative dipstick evaluation
                </p>
                <div className="followup-meta">
                  <span className="followup-provider">Nephrology Clinic</span>
                  <span className="followup-status">Lab Scheduled</span>
                </div>
              </div>
            </div>

            {/* Follow-up Item 3 */}
            <div className="followup-item urgency-low">
              <div className="followup-time-badge">Oct 20, 2026</div>
              <div className="followup-body">
                <div className="followup-patient">
                  <span className="followup-pid">SYN-004</span>
                  <span className="followup-name">Edward Reynolds</span>
                </div>
                <p className="followup-task">
                  Blood pressure target consultation (KDIGO guideline &lt;120 mmHg)
                </p>
                <div className="followup-meta">
                  <span className="followup-provider">Care Coordinator</span>
                  <span className="followup-status">Confirmed</span>
                </div>
              </div>
            </div>

            {/* Follow-up Item 4 */}
            <div className="followup-item urgency-low">
              <div className="followup-time-badge">Oct 22, 2026</div>
              <div className="followup-body">
                <div className="followup-patient">
                  <span className="followup-pid">SYN-007</span>
                  <span className="followup-name">Eleanor Vance</span>
                </div>
                <p className="followup-task">
                  Dietary sodium restriction & ambulatory care check-in
                </p>
                <div className="followup-meta">
                  <span className="followup-provider">Renal Dietitian</span>
                  <span className="followup-status">Scheduled</span>
                </div>
              </div>
            </div>
          </div>

          <div className="followups-footer">
            <button type="button" className="followups-action-btn">
              + Schedule Follow-up Touchpoint
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

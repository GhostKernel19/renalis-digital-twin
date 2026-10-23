import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPatientTwin,
  getPatientLogs,
  getFollowUps,
  API_BASE_URL,
  type TwinResultResponse,
  type DailyLogResponse,
  type FollowUp,
} from '../api/client';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import { PageHeader } from '../components/PageHeader';
import { DemoBanner } from '../components/DemoBanner';
import { useApp } from '../context/AppContext';
import './OverviewPage.css';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { patientId, t } = useApp();

  const [twin, setTwin] = useState<TwinResultResponse | null>(null);
  const [logs, setLogs] = useState<DailyLogResponse[] | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setNetworkError(null);

    try {
      const [twinRes, logsRes, followRes] = await Promise.allSettled([
        getPatientTwin(patientId),
        getPatientLogs(patientId),
        getFollowUps({ patient_id: patientId }),
      ]);

      const isTwinNetworkErr =
        twinRes.status === 'rejected' &&
        (twinRes.reason?.message?.includes('Failed to fetch') ||
          twinRes.reason?.name === 'TypeError');

      if (isTwinNetworkErr) {
        setNetworkError(
          `Cannot connect to the RENALIS backend at ${API_BASE_URL}. The server may be offline.`
        );
      }

      if (twinRes.status === 'fulfilled') {
        setTwin(twinRes.value);
      } else {
        setTwin(null);
      }

      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value);
      } else {
        setLogs(null);
      }

      if (followRes.status === 'fulfilled') {
        setFollowUps(followRes.value);
      } else {
        setFollowUps([]);
      }
    } catch (err: any) {
      console.error('Failed to load patient twin data:', err);
      setNetworkError(
        err?.message || `Cannot connect to the backend server at ${API_BASE_URL}.`
      );
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Find next scheduled follow-up
  const nextScheduledFollowUp = followUps.find((f) => f.status === 'Scheduled');

  // Determine latest daily log entry
  const latestLog = logs && logs.length > 0 ? logs[0] : null;

  // Format risk tag variant
  const getRiskVariant = (tier?: string) => {
    if (tier === 'High') return 'red';
    if (tier === 'Medium') return 'amber';
    return 'green';
  };

  return (
    <div className="patient-home-page">
      {/* Disclaimer Banner */}
      <DemoBanner text={t.demoNotice} />

      {/* Page Header */}
      <PageHeader
        title={t.homeTitle}
        subtitle={`${t.homeSubtitle} · ${patientId}`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchData}
            isLoading={loading}
            iconLeft={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            }
          >
            {loading ? t.refreshing : t.refresh}
          </Button>
        }
      />

      {/* Network Error State */}
      {networkError && (
        <Card variant="raised" padding="md" className="backend-offline-card">
          <div className="offline-icon-wrapper" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A6261B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="offline-content">
            <h2 className="offline-title">{t.serverOfflineTitle}</h2>
            <p className="offline-desc">
              Unable to reach the RENALIS FastAPI backend at <code>{API_BASE_URL}</code>.
            </p>
            <div className="offline-instructions">
              <strong>How to start the server:</strong>
              <ol>
                <li>Open a terminal in the project directory: <code>cd backend</code></li>
                <li>
                  Activate the virtual environment:
                  <br />
                  <code>.\.venv\Scripts\activate</code> (Windows PowerShell) or <code>source .venv/bin/activate</code> (macOS/Linux)
                </li>
                <li>
                  Launch the FastAPI server: <code>uvicorn app.main:app --reload</code>
                </li>
              </ol>
            </div>
            <div className="offline-actions">
              <Button variant="primary" size="sm" onClick={fetchData}>
                {t.retry}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Top 3 Metric Cards: Kidney Score, Latest Blood Pressure, Next Follow-up */}
      <div className="patient-metrics-row stats-cards-row">
        {/* Card 1: Kidney Score */}
        <Card variant="raised" padding="md" className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">{t.kidneyScoreLabel}</span>
            {twin ? (
              <StatusTag
                variant={getRiskVariant(twin.tier)}
                label={`${twin.tier} Risk · ${twin.ckd_stage.split(' ')[0]}`}
              />
            ) : (
              <StatusTag variant="amber" label={loading ? t.loading : 'Awaiting data'} />
            )}
          </div>
          <div className="metric-card-body">
            <span className="metric-value">
              {loading ? (
                <span className="metric-skeleton spinning">...</span>
              ) : twin?.latest_kidney_score != null ? (
                twin.latest_kidney_score
              ) : (
                '–'
              )}
            </span>
            <span className="metric-unit">mL/min/1.73 m²</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-subtext">
              {twin?.estimated_3m_egfr_trend?.summary || 'Trajectory projection computed by digital twin model.'}
            </span>
          </div>
        </Card>

        {/* Card 2: Blood Pressure / Daily Vitals */}
        <Card variant="raised" padding="md" className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">{t.latestBpLabel}</span>
            {latestLog ? (
              <StatusTag variant="green" label="Recorded" />
            ) : (
              <StatusTag variant="amber" label="Pending" />
            )}
          </div>
          <div className="metric-card-body">
            <span className="metric-value">
              {loading ? (
                <span className="metric-skeleton spinning">...</span>
              ) : latestLog ? (
                `${latestLog.systolic} / ${latestLog.diastolic}`
              ) : (
                '–'
              )}
            </span>
            <span className="metric-unit">mmHg</span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-subtext">
              {latestLog
                ? `Logged ${latestLog.created_at.split('T')[0]} · ${latestLog.steps.toLocaleString()} steps`
                : 'No blood pressure recorded yet today'}
            </span>
          </div>
        </Card>

        {/* Card 3: Next Follow-Up */}
        <Card variant="raised" padding="md" className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">{t.nextFollowUpLabel}</span>
            {nextScheduledFollowUp ? (
              <StatusTag variant="routine" label={nextScheduledFollowUp.status} />
            ) : (
              <StatusTag variant="amber" label="None active" />
            )}
          </div>
          <div className="metric-card-body">
            <span className="metric-value metric-value-visit">
              {loading ? (
                <span className="metric-skeleton spinning">...</span>
              ) : nextScheduledFollowUp ? (
                nextScheduledFollowUp.date
              ) : (
                '–'
              )}
            </span>
          </div>
          <div className="metric-card-footer">
            <span className="metric-subtext">
              {nextScheduledFollowUp
                ? `${t.scheduledOn} ${nextScheduledFollowUp.purpose}`
                : t.noScheduledFollowUp}
            </span>
          </div>
        </Card>
      </div>

      {/* Two Column Grid: Today's Action Check-in & Care Coordination Support */}
      <div className="two-column-grid">
        {/* Left: Today's Check-in / Log Summary */}
        <Card variant="raised" padding="md" className="action-card">
          <div className="action-card-header">
            <div className="action-header-text">
              <h2 className="action-card-title">{t.dailyCheckinTitle}</h2>
              <p className="action-card-desc">{t.dailyCheckinDesc}</p>
            </div>
            {latestLog ? (
              <StatusTag variant="complete" label="Complete" />
            ) : (
              <StatusTag variant="current" label="Due today" />
            )}
          </div>

          <div className="action-items-list">
            <div className="action-item">
              <span className="action-item-icon check-icon" aria-hidden="true">✓</span>
              <div className="action-item-text">
                <strong>{t.todayLogSummaryTitle}</strong>
                <p>
                  {latestLog
                    ? `${t.loggedToday}: BP ${latestLog.systolic}/${latestLog.diastolic} mmHg, ${latestLog.steps} steps, symptoms: ${
                        latestLog.symptoms && latestLog.symptoms.length > 0
                          ? latestLog.symptoms.join(', ')
                          : 'None'
                      }`
                    : t.notLoggedToday}
                </p>
              </div>
            </div>

            <div className="action-item">
              <span className="action-item-icon check-icon" aria-hidden="true">✓</span>
              <div className="action-item-text">
                <strong>{t.driversTitle}</strong>
                <p>
                  {twin?.top_drivers && twin.top_drivers.length > 0
                    ? twin.top_drivers.join(' · ')
                    : 'Awaiting longitudinal readings to evaluate top progression drivers.'}
                </p>
              </div>
            </div>
          </div>

          <div className="action-card-footer">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/log-today')}
              iconRight={<span>→</span>}
            >
              {t.logNowButton}
            </Button>
          </div>
        </Card>

        {/* Right: Talk to your health worker */}
        <Card variant="raised" padding="md" className="support-card">
          <div className="support-card-header">
            <div className="support-avatar-circle">HW</div>
            <div className="support-header-text">
              <h2 className="support-card-title">{t.healthWorkerTitle}</h2>
              <p className="support-card-role">{t.healthWorkerRole}</p>
            </div>
          </div>

          <p className="support-body-text">{t.healthWorkerDesc}</p>

          <div className="support-timing-box">
            <strong>{t.healthWorkerHours}</strong>
            <p>RENALIS Community Care Coordination</p>
          </div>

          <div className="support-card-actions">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/language-help')}
              iconLeft={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              }
            >
              {t.healthWorkerCallBtn}
            </Button>
            <p className="support-demo-note">{t.healthWorkerDemoNotice}</p>
          </div>
        </Card>
      </div>

      {/* Recent Health Logs Section */}
      <Card variant="raised" padding="md" className="logs-table-card">
        <div className="logs-header">
          <div>
            <h2 className="logs-title">{t.recentLogsTitle}</h2>
            <p className="logs-subtitle">{t.recentLogsSubtitle} (<code>{patientId}</code>)</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/log-today')}
          >
            + {t.logNowButton}
          </Button>
        </div>

        <div className="table-wrapper">
          <table className="logs-table">
            <thead>
              <tr>
                <th scope="col">{t.dateCol}</th>
                <th scope="col">{t.bpCol}</th>
                <th scope="col">{t.symptomsCol}</th>
                <th scope="col">{t.medsCol}</th>
                <th scope="col">{t.statusCol}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="table-loading-cell">
                    <span className="spinning">⏳</span> {t.loading}
                  </td>
                </tr>
              ) : logs && logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td><strong>{log.created_at.split('T')[0]}</strong></td>
                    <td>{`${log.systolic} / ${log.diastolic} mmHg`}</td>
                    <td>
                      {log.symptoms && log.symptoms.length > 0
                        ? log.symptoms.join(', ')
                        : 'None reported'}
                    </td>
                    <td>{log.medicines_taken ? 'Yes · Taken' : 'No'}</td>
                    <td>
                      {log.urgent ? (
                        <StatusTag variant="urgent" label="Urgent Alert" />
                      ) : (
                        <StatusTag variant="routine" label="Logged" />
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="table-empty-cell">
                    <div className="empty-logs-content">
                      <span className="empty-dash">–</span>
                      <p>No health logs returned from server for patient {patientId}.</p>
                      <span className="empty-subtext">Scores and log entries display "–" until submitted.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

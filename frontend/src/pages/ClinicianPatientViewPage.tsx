import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import { PageHeader } from '../components/PageHeader';
import { DemoBanner } from '../components/DemoBanner';
import {
  getPatientById,
  getPatientTwin,
  getPatientLogs,
  getReferrals,
  updateReferral,
  createReferral,
  createFollowUp,
  type Patient,
  type TwinResultResponse,
  type DailyLogResponse,
  type Referral,
} from '../api/client';
import './ClinicianPatientViewPage.css';

interface TrajectoryDataPoint {
  label: string;
  month: number;
  measured?: number | null;
  projected?: number | null;
  band?: [number, number] | null;
}

interface TelemetryPoint {
  month: string;
  systolic: number;
  diastolic: number;
  adherence: number;
  steps: number;
}

export const ClinicianPatientViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const patientId = id || 'SYN-001';

  const [patient, setPatient] = useState<Patient | null>(null);
  const [twin, setTwin] = useState<TwinResultResponse | null>(null);
  const [logs, setLogs] = useState<DailyLogResponse[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [patData, twinData, logsData, refsData] = await Promise.all([
        getPatientById(patientId),
        getPatientTwin(patientId),
        getPatientLogs(patientId),
        getReferrals({ patient_id: patientId }),
      ]);
      setPatient(patData);
      setTwin(twinData);
      setLogs(logsData || []);
      setReferrals(refsData || []);
    } catch (err: any) {
      console.error('Failed to load clinician patient view data:', err);
      setErrorMsg(err.message || 'Cannot connect to backend server at http://127.0.0.1:8000.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle "Mark reviewed" (PATCH referral)
  const handleMarkReviewed = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const activeRef = referrals.find((r) => r.status === 'Pending' || r.status === 'In Review');
      if (activeRef) {
        await updateReferral(activeRef.id, {
          status: 'Reviewed',
          note: 'Clinician reviewed progression trajectory and risk forecast.',
        });
        setActionMessage(`✓ Referral ${activeRef.id} marked as Reviewed.`);
      } else {
        // If no active referral, create a recorded review referral
        const newRef = await createReferral({
          patient_id: patientId,
          reason: 'Routine digital twin trajectory clinical check',
          priority: 'Routine',
          status: 'Reviewed',
          note: 'Clinician reviewed progression trajectory and confirmed monitoring plan.',
        });
        setActionMessage(`✓ Created and recorded review for referral ${newRef.id}.`);
      }
      fetchData();
    } catch (err: any) {
      setActionMessage(`Error updating referral: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle "Request repeat test" (creates follow-up)
  const handleRequestRepeatTest = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      // Schedule follow-up 2 weeks out (YYYY-MM-DD)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);
      const dateStr = targetDate.toISOString().split('T')[0];

      await createFollowUp({
        patient_id: patientId,
        purpose: 'Repeat blood test',
        date: dateStr,
        status: 'Scheduled',
      });

      setActionMessage(`✓ Scheduled follow-up "Repeat blood test" for ${dateStr}.`);
      fetchData();
    } catch (err: any) {
      setActionMessage(`Error requesting repeat test: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Trajectory points for kidney score
  const trajectoryPoints: TrajectoryDataPoint[] = [];
  const telemetryPoints: TelemetryPoint[] = [];

  if (patient && twin) {
    const readings = patient.readings || [];
    const sorted = [...readings].sort((a, b) => a.month - b.month);

    sorted.forEach((r) => {
      trajectoryPoints.push({
        label: `M${r.month}`,
        month: r.month,
        measured: r.egfr,
        projected: null,
        band: null,
      });

      telemetryPoints.push({
        month: `M${r.month}`,
        systolic: r.systolic_bp || 120,
        diastolic: r.diastolic_bp || 80,
        adherence: r.adherence_pct || 90,
        steps: r.daily_steps || 5000,
      });
    });

    const lastR = sorted[sorted.length - 1];
    const lastM = lastR ? lastR.month : 0;
    const lastEgfr = lastR ? lastR.egfr : patient.baseline_egfr;

    if (trajectoryPoints.length > 0) {
      trajectoryPoints[trajectoryPoints.length - 1].projected = lastEgfr;
      trajectoryPoints[trajectoryPoints.length - 1].band = [lastEgfr, lastEgfr];
    }

    const projectedReadings = twin.estimated_3m_egfr_trend?.projected_readings || [];
    projectedReadings.forEach((p) => {
      const low = p.lower_bound != null ? p.lower_bound : p.projected_egfr - 5;
      const high = p.upper_bound != null ? p.upper_bound : p.projected_egfr + 5;
      trajectoryPoints.push({
        label: `M${p.month || (lastM + 1)} (Est)`,
        month: p.month || (lastM + 1),
        measured: null,
        projected: p.projected_egfr,
        band: [low, high],
      });
    });
  }

  return (
    <div className="clinician-view-page">
      <DemoBanner text="Demo only · Synthetic patient records · Non-clinical experimental prototype" />

      <PageHeader
        title="Clinician Patient View"
        subtitle={`Longitudinal digital twin assessment and clinical telemetry for synthetic patient ${patientId}`}
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/patients')}>
            ← Back to Patients
          </Button>
        }
      />

      {actionMessage && (
        <div className="action-status-toast toast-success" role="status">
          {actionMessage}
        </div>
      )}

      {errorMsg && (
        <Card variant="raised" padding="md" style={{ borderLeft: '6px solid var(--tag-red-text)', backgroundColor: '#FDF4F3' }}>
          <strong style={{ color: 'var(--tag-red-text)', display: 'block', marginBottom: '4px' }}>
            Server isn't reachable
          </strong>
          <p style={{ fontSize: '15px' }}>{errorMsg}</p>
        </Card>
      )}

      {/* Patient Hero Summary Card */}
      <Card variant="raised" padding="md" className="clinician-hero-card">
        <div className="clinician-hero-left">
          <div className="clinician-avatar">
            {patientId.slice(0, 7)}
          </div>
          <div className="clinician-hero-info">
            <h2>{patientId}</h2>
            <div className="clinician-hero-meta">
              {patient
                ? `${patient.age} years · ${patient.sex === 'F' ? 'Female' : 'Male'} · BMI ${patient.bmi} · Creatinine ${patient.baseline_creatinine} mg/dL`
                : 'Loading synthetic patient details...'}
            </div>
          </div>
        </div>

        <div className="clinician-actions-cluster">
          {twin && (
            <StatusTag
              variant={twin.tier === 'High' ? 'red' : twin.tier === 'Medium' ? 'amber' : 'green'}
              label={`${twin.tier} Risk Tier`}
            />
          )}

          {/* Action Button: Mark reviewed */}
          <Button
            variant="primary"
            size="md"
            onClick={handleMarkReviewed}
            isLoading={actionLoading}
            iconLeft={<span>✓</span>}
          >
            Mark reviewed
          </Button>

          {/* Action Button: Request repeat test */}
          <Button
            variant="secondary"
            size="md"
            onClick={handleRequestRepeatTest}
            isLoading={actionLoading}
            iconLeft={<span>📅</span>}
          >
            Request repeat test
          </Button>
        </div>
      </Card>

      {/* Grid: Trajectory Chart & Multi-Telemetry Trends */}
      <div className="clinician-charts-grid">
        {/* Trajectory Forecast Chart */}
        <Card variant="raised" padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                eGFR Trajectory (Measured vs 3-Month Forecast)
              </h2>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Basis: <strong style={{ color: 'var(--color-teal)' }}>{twin?.basis || 'trend model'}</strong>
              </span>
            </div>

            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 8px',
              backgroundColor: 'var(--tag-amber-bg)',
              color: 'var(--tag-amber-text)',
              border: '1px solid var(--tag-amber-border)',
              borderRadius: 'var(--radius-pill)',
            }}>
              Estimate, not a diagnosis
            </span>
          </div>

          <div style={{ height: '320px', width: '100%' }}>
            {loading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinning">⏳</span> Loading trajectory...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trajectoryPoints} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D1DCE5" />
                  <XAxis dataKey="label" fontSize={12} stroke="#44566A" />
                  <YAxis fontSize={12} stroke="#44566A" domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as TrajectoryDataPoint;
                        return (
                          <div style={{
                            backgroundColor: '#E8EDF2',
                            border: '1px solid #C9D3DC',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '12px',
                          }}>
                            <strong>Month {d.month}</strong>
                            {d.measured != null && <div>Measured: {d.measured} mL/min</div>}
                            {d.projected != null && <div>Forecast: {d.projected} mL/min</div>}
                            {d.band != null && <div>95% Bound: [{d.band[0]} – {d.band[1]}]</div>}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="band"
                    fill="rgba(23, 107, 99, 0.12)"
                    stroke="rgba(23, 107, 99, 0.3)"
                    strokeDasharray="2 2"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="measured"
                    stroke="#176B63"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="projected"
                    stroke="#B85D19"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 4 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Multi-Telemetry Trends: BP, Adherence, Steps */}
        <Card variant="raised" padding="md" className="clinician-drivers-card">
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Blood Pressure & Adherence Trends
          </h2>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetryPoints} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D1DCE5" />
                <XAxis dataKey="month" fontSize={11} stroke="#44566A" />
                <YAxis fontSize={11} stroke="#44566A" />
                <Tooltip />
                <Line type="monotone" dataKey="systolic" stroke="#A6261B" strokeWidth={2} name="Systolic BP" dot={false} />
                <Line type="monotone" dataKey="diastolic" stroke="#8A4A0A" strokeWidth={2} name="Diastolic BP" dot={false} />
                <Line type="monotone" dataKey="adherence" stroke="#176B63" strokeWidth={2} name="Adherence %" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: '4px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Top 3 Progression Drivers
            </h3>
            {twin?.top_drivers && twin.top_drivers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {twin.top_drivers.map((driver, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.45)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}>
                    <strong style={{ color: 'var(--color-teal)' }}>#{i + 1}</strong>
                    <span>{driver}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Baseline progression inference active.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Patient Logs Table */}
      <Card variant="raised" padding="md">
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '14px' }}>
          Recent Patient Daily Telemetry Logs
        </h2>

        <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Blood Pressure</th>
                <th style={{ padding: '12px 16px' }}>Steps</th>
                <th style={{ padding: '12px 16px' }}>Regimen Taken</th>
                <th style={{ padding: '12px 16px' }}>Reported Symptoms</th>
                <th style={{ padding: '12px 16px' }}>Safety Alert</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{log.created_at.split('T')[0]}</td>
                    <td style={{ padding: '12px 16px' }}>{`${log.systolic}/${log.diastolic} mmHg`}</td>
                    <td style={{ padding: '12px 16px' }}>{log.steps.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>{log.medicines_taken ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {log.symptoms && log.symptoms.length > 0 ? log.symptoms.join(', ') : 'None'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {log.urgent ? (
                        <StatusTag variant="urgent" label="Urgent Alert" />
                      ) : (
                        <StatusTag variant="routine" label="Normal" />
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>
                    <span style={{ fontSize: '28px', display: 'block', marginBottom: '4px' }}>–</span>
                    No daily telemetry logs submitted for patient {patientId}.
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

import React, { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card } from '../components/Card';
import { StatusTag } from '../components/StatusTag';
import { PageHeader } from '../components/PageHeader';
import { DemoBanner } from '../components/DemoBanner';
import { useApp } from '../context/AppContext';
import {
  getPatientById,
  getPatientTwin,
  type TwinResultResponse,
  type Patient,
} from '../api/client';
import './MyKidneyHealthPage.css';

interface ChartDataPoint {
  label: string;
  month: number;
  measured?: number | null;
  projected?: number | null;
  lower_bound?: number | null;
  upper_bound?: number | null;
  band?: [number, number] | null;
}

export const MyKidneyHealthPage: React.FC = () => {
  const { patientId, t } = useApp();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [twin, setTwin] = useState<TwinResultResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [patData, twinData] = await Promise.all([
        getPatientById(patientId),
        getPatientTwin(patientId),
      ]);
      setPatient(patData);
      setTwin(twinData);
    } catch (err: any) {
      console.error('Failed to load kidney health data:', err);
      setErrorMsg(err.message || 'Cannot connect to backend server at http://127.0.0.1:8000.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build unified trajectory chart series
  const chartPoints: ChartDataPoint[] = [];

  if (patient && twin) {
    const readings = patient.readings || [];
    const sortedReadings = [...readings].sort((a, b) => a.month - b.month);

    // 1. Observed months
    sortedReadings.forEach((r) => {
      chartPoints.push({
        label: `M${r.month}`,
        month: r.month,
        measured: r.egfr,
        projected: null,
        lower_bound: null,
        upper_bound: null,
        band: null,
      });
    });

    // 2. Projected months
    const lastReading = sortedReadings[sortedReadings.length - 1];
    const lastMonth = lastReading ? lastReading.month : 0;
    const lastEgfr = lastReading ? lastReading.egfr : patient.baseline_egfr;

    // Connect observed to forecast at the boundary
    if (chartPoints.length > 0) {
      chartPoints[chartPoints.length - 1].projected = lastEgfr;
      chartPoints[chartPoints.length - 1].lower_bound = lastEgfr;
      chartPoints[chartPoints.length - 1].upper_bound = lastEgfr;
      chartPoints[chartPoints.length - 1].band = [lastEgfr, lastEgfr];
    }

    const projectedReadings = twin.estimated_3m_egfr_trend?.projected_readings || [];
    projectedReadings.forEach((p) => {
      const mNum = p.month || (lastMonth + 1);
      const low = p.lower_bound != null ? p.lower_bound : p.projected_egfr - 5;
      const high = p.upper_bound != null ? p.upper_bound : p.projected_egfr + 5;

      chartPoints.push({
        label: `M${mNum} (Est)`,
        month: mNum,
        measured: null,
        projected: p.projected_egfr,
        lower_bound: low,
        upper_bound: high,
        band: [low, high],
      });
    });
  }

  return (
    <div className="kidney-health-page">
      <DemoBanner text={t.demoNotice} />

      <PageHeader
        title={t.kidneyHealthTitle}
        subtitle={`${t.kidneyHealthSubtitle} · Patient ${patientId}`}
        actions={
          twin && (
            <StatusTag
              variant={twin.tier === 'High' ? 'red' : twin.tier === 'Medium' ? 'amber' : 'green'}
              label={`${twin.tier} Risk · ${twin.ckd_stage.split(' ')[0]}`}
            />
          )
        }
      />

      {errorMsg && (
        <Card variant="raised" padding="md" style={{ borderLeft: '6px solid var(--tag-red-text)', backgroundColor: '#FDF4F3' }}>
          <strong style={{ color: 'var(--tag-red-text)', display: 'block', marginBottom: '4px' }}>
            {t.serverOfflineTitle}
          </strong>
          <p style={{ fontSize: '15px' }}>{errorMsg}</p>
        </Card>
      )}

      {/* Trajectory Forecast Chart Card */}
      <Card variant="raised" padding="md" className="chart-card">
        <div className="chart-header">
          <div>
            <h2 className="chart-title">{t.chartTitle}</h2>
            <p className="chart-subtitle">
              Measured monthly laboratory readings with 3-month model projection & 95% uncertainty interval.
            </p>
          </div>

          <div className="chart-legend-custom">
            <div className="legend-item">
              <span className="legend-line-solid" />
              <span>{t.measuredLineLabel}</span>
            </div>
            <div className="legend-item">
              <span className="legend-line-dotted" />
              <span>{t.projectedLineLabel}</span>
            </div>
            <div className="legend-item">
              <span className="legend-band-box" />
              <span>{t.uncertaintyBandLabel}</span>
            </div>
          </div>
        </div>

        <div className="chart-container-box">
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
              <span className="spinning" style={{ marginRight: '8px' }}>⏳</span> {t.loading}
            </div>
          ) : chartPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartPoints} margin={{ top: 15, right: 25, bottom: 25, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D1DCE5" />
                <XAxis
                  dataKey="label"
                  stroke="#44566A"
                  fontSize={12}
                  tickMargin={8}
                />
                <YAxis
                  stroke="#44566A"
                  domain={['dataMin - 10', 'dataMax + 10']}
                  fontSize={12}
                  tickMargin={8}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ChartDataPoint;
                      return (
                        <div style={{
                          backgroundColor: '#E8EDF2',
                          border: '1px solid #C9D3DC',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '13px',
                        }}>
                          <strong>Month {data.month}</strong>
                          {data.measured != null && (
                            <div style={{ color: '#176B63', marginTop: '4px' }}>
                              Measured: <strong>{data.measured} mL/min/1.73 m²</strong>
                            </div>
                          )}
                          {data.projected != null && (
                            <div style={{ color: '#B85D19', marginTop: '4px' }}>
                              Estimated: <strong>{data.projected} mL/min/1.73 m²</strong>
                            </div>
                          )}
                          {data.lower_bound != null && data.upper_bound != null && (
                            <div style={{ color: '#5E7287', fontSize: '12px', marginTop: '2px' }}>
                              95% Bound: [{data.lower_bound} – {data.upper_bound}]
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* 95% Uncertainty Band */}
                <Area
                  type="monotone"
                  dataKey="band"
                  fill="rgba(23, 107, 99, 0.12)"
                  stroke="rgba(23, 107, 99, 0.3)"
                  strokeDasharray="2 2"
                  connectNulls
                />

                {/* Measured Historical Line */}
                <Line
                  type="monotone"
                  dataKey="measured"
                  stroke="#176B63"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#176B63' }}
                  activeDot={{ r: 7, fill: '#176B63' }}
                  connectNulls={false}
                />

                {/* Projected 3-Month Estimate Line */}
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="#B85D19"
                  strokeWidth={3}
                  strokeDasharray="6 6"
                  dot={{ r: 4, fill: '#B85D19' }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
              <span style={{ fontSize: '32px', marginBottom: '8px' }}>–</span>
              <p>{t.noData}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Grid: Plain Language Summary & "Estimate, Not a Diagnosis" Card */}
      <div className="kidney-info-grid">
        {/* Left: Plain-language summary & Top 3 Drivers */}
        <Card variant="raised" padding="md" className="plain-explanation-card">
          <h2 className="explanation-title">{t.plainSummaryTitle}</h2>

          <div className="summary-callout">
            {twin?.estimated_3m_egfr_trend?.summary || (
              <span>Your kidney score history is being tracked to simulate progression risk.</span>
            )}
          </div>

          <div style={{ marginTop: '8px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              {t.driversTitle}
            </h3>
            {twin?.top_drivers && twin.top_drivers.length > 0 ? (
              <div className="drivers-list">
                {twin.top_drivers.map((driver, idx) => (
                  <div key={idx} className="driver-pill">
                    <span className="driver-number">{idx + 1}</span>
                    <span>{driver}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                Baseline digital twin assessment loaded.
              </p>
            )}
          </div>

          <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            <strong>Current Classification:</strong> {twin?.ckd_stage || 'KDIGO CKD Staging in evaluation'}
            <br />
            <strong>Inference Basis:</strong> {twin?.basis || 'trend model'}
          </div>
        </Card>

        {/* Right: "An estimate, not a diagnosis" Card */}
        <Card variant="raised" padding="md" className="estimate-card">
          <div className="estimate-card-header">
            <span className="estimate-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </span>
            <h2 className="estimate-card-title">{t.notDiagnosisTitle}</h2>
          </div>

          <p className="estimate-card-text">
            {t.notDiagnosisText}
          </p>

          <ul className="estimate-points-list">
            <li>
              <strong>100% Synthetic Cohort:</strong> Telemetry values reflect artificially generated biological simulations, not real patient telemetry.
            </li>
            <li>
              <strong>Statistical Approximation:</strong> 3-month forecast uses ordinary least squares trend projection with a 95% prediction interval.
            </li>
            <li>
              <strong>Zero Prescription Advice:</strong> RENALIS strictly prohibits automatic drug dispensing, dosage titration, or therapeutic adjustments.
            </li>
            <li>
              <strong>Supervised Review:</strong> All clinical referrals and repeat test requests must be reviewed by qualified nephrologists.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

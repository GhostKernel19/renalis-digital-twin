import React, { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import { PageHeader } from '../components/PageHeader';
import { DemoBanner } from '../components/DemoBanner';
import {
  getStats,
  getHealth,
  type StatsResponse,
  type HealthResponse,
} from '../api/client';
import './ReportsPage.css';

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [statsData, healthData] = await Promise.all([
        getStats(),
        getHealth(),
      ]);
      setStats(statsData);
      setHealth(healthData);
    } catch (err: any) {
      console.error('Failed to load platform reports:', err);
      setErrorMsg(err.message || 'Cannot connect to backend server at http://127.0.0.1:8000.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Risk Tier Chart Data
  const riskTierData = stats
    ? [
        { name: 'Low Risk', tier: 'Low', count: stats.risk_tier_distribution['Low'] || 0, color: '#0F5B4E' },
        { name: 'Medium Risk', tier: 'Medium', count: stats.risk_tier_distribution['Medium'] || 0, color: '#8A4A0A' },
        { name: 'High Risk', tier: 'High', count: stats.risk_tier_distribution['High'] || 0, color: '#A6261B' },
      ]
    : [];

  // Referrals by Status Chart Data
  const referralsData = stats
    ? [
        { status: 'Pending', count: stats.referrals_by_status['Pending'] || 0, color: '#8A4A0A' },
        { status: 'In Review', count: stats.referrals_by_status['In Review'] || 0, color: '#176B63' },
        { status: 'Reviewed', count: stats.referrals_by_status['Reviewed'] || 0, color: '#0F5B4E' },
        { status: 'Completed', count: stats.referrals_by_status['Completed'] || 0, color: '#44566A' },
      ]
    : [];

  return (
    <div className="reports-page">
      <DemoBanner text="Demo only · Platform operational statistics and research analytics · Non-clinical prototype" />

      <PageHeader
        title="Reports & Analytics"
        subtitle="Platform-wide cohort risk distribution, referral coordination status, and digital twin model diagnostics."
        actions={
          <Button variant="secondary" size="sm" onClick={fetchData} isLoading={loading}>
            Refresh
          </Button>
        }
      />

      {errorMsg && (
        <Card variant="raised" padding="md" style={{ borderLeft: '6px solid var(--tag-red-text)', backgroundColor: '#FDF4F3' }}>
          <strong style={{ color: 'var(--tag-red-text)', display: 'block', marginBottom: '4px' }}>
            Server isn't reachable
          </strong>
          <p style={{ fontSize: '15px' }}>{errorMsg}</p>
        </Card>
      )}

      {/* Operational Totals Cards */}
      <div className="reports-totals-grid">
        <Card variant="raised" padding="md" className="report-total-card">
          <span className="report-total-number">{stats?.totals.patients ?? '–'}</span>
          <span className="report-total-label">Total Cohort Patients</span>
        </Card>
        <Card variant="raised" padding="md" className="report-total-card">
          <span className="report-total-number">{stats?.totals.assessments ?? '–'}</span>
          <span className="report-total-label">Digital Twin Assessments</span>
        </Card>
        <Card variant="raised" padding="md" className="report-total-card">
          <span className="report-total-number">{stats?.totals.daily_logs ?? '–'}</span>
          <span className="report-total-label">Telemetry Daily Logs</span>
        </Card>
        <Card variant="raised" padding="md" className="report-total-card">
          <span className="report-total-number">{stats?.totals.referrals ?? '–'}</span>
          <span className="report-total-label">Active Referrals</span>
        </Card>
        <Card variant="raised" padding="md" className="report-total-card">
          <span className="report-total-number">{stats?.totals.follow_ups ?? '–'}</span>
          <span className="report-total-label">Care Follow-ups Scheduled</span>
        </Card>
      </div>

      {/* Charts Grid: Risk Tier Distribution & Referrals by Status */}
      <div className="reports-charts-grid">
        {/* Chart 1: Risk Tier Distribution */}
        <Card variant="raised" padding="md" className="report-chart-card">
          <div className="report-chart-header">
            <h2 className="report-chart-title">Cohort Risk Tier Stratification</h2>
            <StatusTag variant="routine" label="500 Patients" />
          </div>

          <div className="report-chart-container">
            {loading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinning">⏳</span> Loading risk distribution...
              </div>
            ) : riskTierData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskTierData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D1DCE5" />
                  <XAxis dataKey="name" fontSize={13} stroke="#44566A" />
                  <YAxis fontSize={12} stroke="#44566A" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div style={{
                            backgroundColor: '#E8EDF2',
                            border: '1px solid #C9D3DC',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '13px',
                          }}>
                            <strong>{d.name}: {d.count} patients</strong>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {riskTierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                No cohort distribution data.
              </div>
            )}
          </div>
        </Card>

        {/* Chart 2: Referrals by Status */}
        <Card variant="raised" padding="md" className="report-chart-card">
          <div className="report-chart-header">
            <h2 className="report-chart-title">Care Coordination Referrals by Status</h2>
            <StatusTag variant="amber" label="Queue Status" />
          </div>

          <div className="report-chart-container">
            {loading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinning">⏳</span> Loading referral analytics...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={referralsData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D1DCE5" />
                  <XAxis dataKey="status" fontSize={13} stroke="#44566A" />
                  <YAxis fontSize={12} stroke="#44566A" allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div style={{
                            backgroundColor: '#E8EDF2',
                            border: '1px solid #C9D3DC',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '13px',
                          }}>
                            <strong>{d.status}: {d.count} referrals</strong>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {referralsData.map((entry, index) => (
                      <Cell key={`ref-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Model Diagnostics Card */}
      <Card variant="raised" padding="md">
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
          Digital Twin Engine & Model Health Status
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}>
          <div style={{
            padding: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong>Longitudinal Risk Model</strong>
              <StatusTag
                variant={health?.model_loaded ? 'routine' : 'red'}
                label={health?.model_loaded ? 'Ready' : 'Missing'}
              />
            </div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              risk_model.joblib
            </span>
          </div>

          <div style={{
            padding: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong>Static Baseline Model</strong>
              <StatusTag
                variant={health?.baseline_model_loaded ? 'routine' : 'red'}
                label={health?.baseline_model_loaded ? 'Ready' : 'Missing'}
              />
            </div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              baseline_model.joblib
            </span>
          </div>

          <div style={{
            padding: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong>Synthetic Cohort Data</strong>
              <StatusTag
                variant={health?.synthetic_data_available ? 'routine' : 'red'}
                label={health?.synthetic_data_available ? '500 Loaded' : 'Missing'}
              />
            </div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
              data/synthetic/patients.csv
            </span>
          </div>
        </div>

        <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          {health?.message || 'Digital twin simulation backend is active.'}
        </p>
      </Card>
    </div>
  );
};

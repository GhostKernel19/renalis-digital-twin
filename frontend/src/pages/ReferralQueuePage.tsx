import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import { Field, Input, Select } from '../components/Field';
import { PageHeader } from '../components/PageHeader';
import { DemoBanner } from '../components/DemoBanner';
import {
  getReferrals,
  getStats,
  updateReferral,
  type Referral,
  type StatsResponse,
} from '../api/client';
import './ReferralQueuePage.css';

export const ReferralQueuePage: React.FC = () => {
  const navigate = useNavigate();

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [refs, statsData] = await Promise.all([
        getReferrals({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        }),
        getStats(),
      ]);
      setReferrals(refs || []);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load referral queue:', err);
      setErrorMsg(err.message || 'Cannot connect to backend server at http://127.0.0.1:8000.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side search by synthetic patient_id or referral reason
  const filteredReferrals = referrals.filter((r) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      r.patient_id.toLowerCase().includes(query) ||
      r.id.toLowerCase().includes(query) ||
      r.reason.toLowerCase().includes(query)
    );
  });

  const handleStatusUpdate = async (id: string, newStatus: 'Pending' | 'In Review' | 'Reviewed' | 'Completed') => {
    try {
      await updateReferral(id, { status: newStatus });
      fetchData();
    } catch (err: any) {
      alert(`Error updating referral status: ${err.message}`);
    }
  };

  const pendingCount = stats?.referrals_by_status?.['Pending'] ?? 0;
  const inReviewCount = stats?.referrals_by_status?.['In Review'] ?? 0;
  const reviewedCount = (stats?.referrals_by_status?.['Reviewed'] ?? 0) + (stats?.referrals_by_status?.['Completed'] ?? 0);

  return (
    <div className="referral-queue-page">
      <DemoBanner text="Demo only · Care coordination referrals for synthetic cohort · Non-clinical prototype" />

      <PageHeader
        title="Referral Queue"
        subtitle="Prioritized care coordination review queue for patients flagged with accelerated progression risk."
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

      {/* Top 3 Stat Cards from /stats */}
      <div className="referral-stats-row stats-cards-row">
        <Card variant="raised" padding="md" className="stat-metric-card">
          <div className="stat-metric-body">
            <span className="stat-number">{pendingCount}</span>
            <span className="stat-title">Awaiting Review</span>
          </div>
        </Card>

        <Card variant="raised" padding="md" className="stat-metric-card">
          <div className="stat-metric-body">
            <span className="stat-number">{inReviewCount}</span>
            <span className="stat-title">In Review</span>
          </div>
        </Card>

        <Card variant="raised" padding="md" className="stat-metric-card">
          <div className="stat-metric-body">
            <span className="stat-number">{reviewedCount}</span>
            <span className="stat-title">Reviewed / Completed</span>
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card variant="raised" padding="md" className="filter-card">
        <h2 className="filter-title">Filter Referrals</h2>
        <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px' }}>
          <Field label="Search by Patient ID or Keyword">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. SYN-001 or reason..."
              iconRight={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              }
            />
          </Field>

          <Field label="Priority">
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All priorities' },
                { value: 'Urgent', label: 'Urgent' },
                { value: 'Routine', label: 'Routine' },
              ]}
            />
          </Field>

          <Field label="Status">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'Pending', label: 'Pending' },
                { value: 'In Review', label: 'In Review' },
                { value: 'Reviewed', label: 'Reviewed' },
                { value: 'Completed', label: 'Completed' },
              ]}
            />
          </Field>
        </div>
      </Card>

      {/* Referrals Table */}
      <Card variant="raised" padding="md">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Active Referrals ({filteredReferrals.length})
          </h2>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '14px 18px' }}>Referral ID</th>
                <th style={{ padding: '14px 18px' }}>Patient ID</th>
                <th style={{ padding: '14px 18px' }}>Staff Priority</th>
                <th style={{ padding: '14px 18px' }}>Suggested Tier</th>
                <th style={{ padding: '14px 18px' }}>Clinical Reason</th>
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px' }}>Created</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-secondary)' }}>
                    <span className="spinning">⏳</span> Loading referrals...
                  </td>
                </tr>
              ) : filteredReferrals.length > 0 ? (
                filteredReferrals.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.id}</td>
                    <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)', color: 'var(--color-teal)', fontWeight: 700 }}>
                      {r.patient_id}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <StatusTag
                        variant={r.priority === 'Urgent' ? 'urgent' : 'routine'}
                        label={r.priority}
                      />
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <StatusTag
                        variant={r.suggested_tier === 'High' ? 'red' : r.suggested_tier === 'Medium' ? 'amber' : 'green'}
                        label={r.suggested_tier || 'Medium'}
                      />
                    </td>
                    <td style={{ padding: '14px 18px', maxWidth: '280px' }}>
                      <div>{r.reason}</div>
                      {r.note && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{r.note}</div>}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusUpdate(r.id, e.target.value as any)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-bg)',
                          fontSize: '13px',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Review">In Review</option>
                        <option value="Reviewed">Reviewed</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {r.created_at.split('T')[0]}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/patients/${r.patient_id}`)}
                      >
                        Open Clinician View →
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                    <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>–</span>
                    <p style={{ fontWeight: 600 }}>No care coordination referrals found</p>
                    <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      Referrals created from patient intake or risk alerts will appear here.
                    </span>
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

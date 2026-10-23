import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import { Field, Input, Select } from '../components/Field';
import { PageHeader } from '../components/PageHeader';
import { DemoBanner } from '../components/DemoBanner';
import { getPatients, type Patient } from '../api/client';
import './PatientsPage.css';

export const PatientsPage: React.FC = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [riskTier, setRiskTier] = useState<string>('all');
  const [offset, setOffset] = useState<number>(0);
  const limit = 15;

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCohort = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getPatients({
        search: search.trim() || undefined,
        risk_tier: riskTier !== 'all' ? riskTier : undefined,
        limit,
        offset,
      });
      setPatients(res.patients || []);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load patient cohort:', err);
      setErrorMsg(err.message || 'Cannot connect to backend server at http://127.0.0.1:8000.');
    } finally {
      setLoading(false);
    }
  }, [search, riskTier, offset]);

  useEffect(() => {
    fetchCohort();
  }, [fetchCohort]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setOffset(0);
  };

  const handleTierChange = (val: string) => {
    setRiskTier(val);
    setOffset(0);
  };

  const handlePrevPage = () => {
    if (offset >= limit) {
      setOffset(offset - limit);
    }
  };

  const handleNextPage = () => {
    if (offset + limit < totalCount) {
      setOffset(offset + limit);
    }
  };

  const getTierVariant = (tier?: string) => {
    if (tier === 'High') return 'red';
    if (tier === 'Medium') return 'amber';
    return 'green';
  };

  return (
    <div className="patients-page">
      <DemoBanner text="Demo only: all patient records are synthetic · Care Team Portal" />

      <PageHeader
        title="Patients"
        subtitle="Search synthetic patient cohort, view risk stratification, and launch individual digital twins."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/patient-intake')}
            iconLeft={<span>+</span>}
          >
            New Patient Intake
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

      {/* Filter & Search Bar */}
      <Card variant="raised" padding="md" className="patients-filter-card">
        <div className="patients-controls-grid">
          <Field label="Search by Patient ID">
            <Input
              type="text"
              placeholder="Filter e.g. SYN-001, SYN-042..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              iconRight={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              }
            />
          </Field>

          <Field label="Filter by Risk Action Tier">
            <Select
              value={riskTier}
              onChange={(e) => handleTierChange(e.target.value)}
              options={[
                { value: 'all', label: 'All risk tiers' },
                { value: 'High', label: 'High risk' },
                { value: 'Medium', label: 'Medium risk' },
                { value: 'Low', label: 'Low risk' },
              ]}
            />
          </Field>
        </div>
      </Card>

      {/* Patients Table Card */}
      <Card variant="raised" padding="md" className="patients-table-card">
        <div className="patients-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Cohort Directory
            </h2>
            <span className="patients-count-badge">
              {totalCount} total synthetic records
            </span>
          </div>

          <Button variant="secondary" size="sm" onClick={fetchCohort} isLoading={loading}>
            Refresh
          </Button>
        </div>

        <div className="patients-table-wrapper">
          <table className="patients-table">
            <thead>
              <tr>
                <th scope="col">Patient ID</th>
                <th scope="col">Demographics</th>
                <th scope="col">Baseline eGFR</th>
                <th scope="col">Creatinine</th>
                <th scope="col">Proteinuria</th>
                <th scope="col">Model Tier</th>
                <th scope="col">Progression Risk</th>
                <th scope="col">Basis</th>
                <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-secondary)' }}>
                    <span className="spinning" style={{ marginRight: '8px' }}>⏳</span> Loading patient records...
                  </td>
                </tr>
              ) : patients.length > 0 ? (
                patients.map((p) => {
                  const tier = p.tier || p.risk_tier || 'Low';
                  const prob = p.probability ?? p.risk_probability ?? 0;
                  return (
                    <tr
                      key={p.patient_id}
                      className="patient-row-clickable"
                      onClick={() => navigate(`/patients/${p.patient_id}`)}
                      title={`Open clinician twin for ${p.patient_id}`}
                    >
                      <td className="patient-id-cell">{p.patient_id}</td>
                      <td>{`${p.age}y · ${p.sex === 'F' ? 'Female' : 'Male'} · BMI ${p.bmi}`}</td>
                      <td>
                        <strong>{p.baseline_egfr}</strong> <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>mL/min</span>
                      </td>
                      <td>{`${p.baseline_creatinine} mg/dL`}</td>
                      <td>{p.urine_protein}</td>
                      <td>
                        <StatusTag variant={getTierVariant(tier)} label={tier} />
                      </td>
                      <td>
                        <strong>{(prob * 100).toFixed(1)}%</strong>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        {p.basis || 'trend model'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patients/${p.patient_id}`);
                          }}
                        >
                          View Twin →
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                    <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>–</span>
                    <p style={{ fontWeight: 600 }}>No synthetic patients found</p>
                    <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      Try adjusting your search query or risk tier filter.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="pagination-footer">
          <span className="pagination-info">
            Showing {totalCount > 0 ? offset + 1 : 0}–{Math.min(offset + limit, totalCount)} of {totalCount} patients
          </span>
          <div className="pagination-buttons">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrevPage}
              disabled={offset === 0 || loading}
            >
              ← Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNextPage}
              disabled={offset + limit >= totalCount || loading}
            >
              Next →
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

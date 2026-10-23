import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import { Field, Input, Select } from '../components/Field';
import { PageHeader } from '../components/PageHeader';
import { DemoBanner } from '../components/DemoBanner';
import {
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  type FollowUp,
} from '../api/client';
import './FollowUpsPage.css';

export const FollowUpsPage: React.FC = () => {
  const navigate = useNavigate();

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchPatient, setSearchPatient] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states for scheduling
  const [patientIdInput, setPatientIdInput] = useState<string>('SYN-001');
  const [purpose, setPurpose] = useState<string>('Repeat blood test');
  const [customPurpose, setCustomPurpose] = useState<string>('');
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const fetchFollowUpsList = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const items = await getFollowUps({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        patient_id: searchPatient.trim() || undefined,
      });
      setFollowUps(items || []);
    } catch (err: any) {
      console.error('Failed to load follow-ups:', err);
      setErrorMsg(err.message || 'Cannot connect to backend server at http://127.0.0.1:8000.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchPatient]);

  useEffect(() => {
    fetchFollowUpsList();
  }, [fetchFollowUpsList]);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleSuccess(null);
    setScheduleError(null);

    const pid = patientIdInput.trim();
    if (!pid) {
      setScheduleError('Please enter a synthetic patient ID.');
      return;
    }

    const selectedPurpose = purpose === 'custom' ? customPurpose.trim() : purpose;
    if (!selectedPurpose || selectedPurpose.length < 3) {
      setScheduleError('Appointment purpose must be at least 3 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await createFollowUp({
        patient_id: pid,
        purpose: selectedPurpose,
        date,
        status: 'Scheduled',
      });
      setScheduleSuccess(`✓ Follow-up scheduled for patient ${pid} on ${date}.`);
      fetchFollowUpsList();
    } catch (err: any) {
      setScheduleError(err.message || 'Failed to schedule follow-up.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'Scheduled' | 'Completed' | 'Cancelled') => {
    try {
      await updateFollowUp(id, { status: newStatus });
      fetchFollowUpsList();
    } catch (err: any) {
      alert(`Error updating follow-up: ${err.message}`);
    }
  };

  const getStatusVariant = (s: string) => {
    if (s === 'Completed') return 'complete';
    if (s === 'Cancelled') return 'red';
    return 'amber';
  };

  return (
    <div className="follow-ups-page">
      <DemoBanner text="Demo only · Synthetic care team appointments · Non-clinical experimental prototype" />

      <PageHeader
        title="Care Team Follow-ups"
        subtitle="Manage routine appointments, repeat laboratory testing requests, and blood pressure surveillance."
      />

      {errorMsg && (
        <Card variant="raised" padding="md" style={{ borderLeft: '6px solid var(--tag-red-text)', backgroundColor: '#FDF4F3' }}>
          <strong style={{ color: 'var(--tag-red-text)', display: 'block', marginBottom: '4px' }}>
            Server isn't reachable
          </strong>
          <p style={{ fontSize: '15px' }}>{errorMsg}</p>
        </Card>
      )}

      <div className="follow-ups-grid">
        {/* Left: Schedule New Follow-up Card */}
        <Card variant="raised" padding="md" className="schedule-card">
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Schedule New Follow-up
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Appointments must use generic clinical purposes (Rule 5: No drug names or treatment advice).
          </p>

          {scheduleSuccess && (
            <div style={{
              backgroundColor: 'var(--tag-green-bg)',
              color: 'var(--tag-green-text)',
              border: '1px solid var(--tag-green-border)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '14px',
              fontWeight: 600,
            }}>
              {scheduleSuccess}
            </div>
          )}

          {scheduleError && (
            <div style={{
              backgroundColor: 'var(--tag-red-bg)',
              color: 'var(--tag-red-text)',
              border: '1px solid var(--tag-red-border)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '14px',
              fontWeight: 600,
            }}>
              {scheduleError}
            </div>
          )}

          <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field label="Synthetic Patient ID">
              <Input
                placeholder="e.g. SYN-001"
                value={patientIdInput}
                onChange={(e) => setPatientIdInput(e.target.value)}
                required
              />
            </Field>

            <Field label="Appointment Purpose">
              <Select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                options={[
                  { value: 'Repeat blood test', label: 'Repeat blood test (eGFR / Creatinine)' },
                  { value: 'Blood pressure check', label: 'Blood pressure check & telemetry review' },
                  { value: 'Urinalysis review', label: 'Urinalysis review (Proteinuria dipstick)' },
                  { value: 'General care coordination', label: 'General care coordination check-in' },
                  { value: 'custom', label: 'Other generic purpose (Specify below)' },
                ]}
              />
            </Field>

            {purpose === 'custom' && (
              <Field label="Custom Generic Purpose" helperText="Strictly no medication or prescription advice">
                <Input
                  placeholder="e.g. Biometric review..."
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  required
                />
              </Field>
            )}

            <Field label="Appointment Date">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>

            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={submitting}
              iconLeft={<span>+</span>}
            >
              {submitting ? 'Scheduling...' : 'Schedule Follow-up'}
            </Button>
          </form>
        </Card>

        {/* Right: Follow-ups List & Filters */}
        <Card variant="raised" padding="md" className="follow-ups-list-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Scheduled Appointments ({followUps.length})
            </h2>

            <Button variant="secondary" size="sm" onClick={fetchFollowUpsList} isLoading={loading}>
              Refresh
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <Field label="Filter by Patient ID">
              <Input
                placeholder="Search patient..."
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
              />
            </Field>

            <Field label="Status">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'Scheduled', label: 'Scheduled' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Cancelled', label: 'Cancelled' },
                ]}
              />
            </Field>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
            <table className="follow-ups-table">
              <thead>
                <tr>
                  <th scope="col">Patient</th>
                  <th scope="col">Purpose</th>
                  <th scope="col">Date</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>
                      <span className="spinning">⏳</span> Loading appointments...
                    </td>
                  </tr>
                ) : followUps.length > 0 ? (
                  followUps.map((f) => (
                    <tr key={f.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-teal)', fontWeight: 700 }}>
                        <span
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => navigate(`/patients/${f.patient_id}`)}
                          title="Open Clinician View"
                        >
                          {f.patient_id}
                        </span>
                      </td>
                      <td>{f.purpose}</td>
                      <td><strong>{f.date}</strong></td>
                      <td>
                        <StatusTag variant={getStatusVariant(f.status)} label={f.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {f.status === 'Scheduled' && (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleStatusChange(f.id, 'Completed')}
                            >
                              ✓ Complete
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(f.id, 'Cancelled')}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                        {f.status !== 'Scheduled' && (
                          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                            {f.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                      <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>–</span>
                      <p style={{ fontWeight: 600 }}>No follow-up appointments scheduled</p>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        Use the form on the left to schedule a generic follow-up.
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

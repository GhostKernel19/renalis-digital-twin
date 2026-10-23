import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import { Field, Input } from '../components/Field';
import { PageHeader } from '../components/PageHeader';
import { DemoBanner } from '../components/DemoBanner';
import { useApp } from '../context/AppContext';
import {
  createPatientLog,
  getPatientLogs,
  type DailyLogResponse,
} from '../api/client';
import './LogTodayPage.css';

export const LogTodayPage: React.FC = () => {
  const { patientId, t } = useApp();

  const [systolic, setSystolic] = useState<string>('128');
  const [diastolic, setDiastolic] = useState<string>('82');
  const [steps, setSteps] = useState<string>('5420');
  const [medsTaken, setMedsTaken] = useState<boolean>(true);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [urgentBannerData, setUrgentBannerData] = useState<{
    urgent: boolean;
    message: string;
  } | null>(null);
  const [pastLogs, setPastLogs] = useState<DailyLogResponse[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const symptomOptions = [
    { key: 'swelling', label: t.sympSwelling },
    { key: 'shortness_of_breath', label: t.sympShortBreath },
    { key: 'fatigue', label: t.sympFatigue },
    { key: 'nausea', label: t.sympNausea },
    { key: 'none', label: t.sympNone },
  ];

  // Handle symptom checkbox toggle with "None of these" clearing logic
  const handleSymptomToggle = (key: string) => {
    if (key === 'none') {
      // "None of these" clears all other symptoms
      if (selectedSymptoms.includes('none')) {
        setSelectedSymptoms([]);
      } else {
        setSelectedSymptoms(['none']);
      }
    } else {
      // If toggling another symptom, uncheck "None of these"
      let updated: string[];
      if (selectedSymptoms.includes(key)) {
        updated = selectedSymptoms.filter((s) => s !== key);
      } else {
        updated = [...selectedSymptoms.filter((s) => s !== 'none'), key];
      }
      setSelectedSymptoms(updated);
    }
  };

  const fetchPastLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const logs = await getPatientLogs(patientId);
      setPastLogs(logs || []);
    } catch {
      setPastLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPastLogs();
  }, [fetchPastLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaveSuccess(false);

    const sVal = parseInt(systolic, 10);
    const dVal = parseInt(diastolic, 10);
    const stepVal = parseInt(steps, 10) || 0;

    if (isNaN(sVal) || sVal < 70 || sVal > 240) {
      setFormError('Please enter a valid systolic blood pressure (70–240 mmHg).');
      return;
    }
    if (isNaN(dVal) || dVal < 40 || dVal > 150) {
      setFormError('Please enter a valid diastolic blood pressure (40–150 mmHg).');
      return;
    }

    // Map selected symptom keys to backend string labels
    const formattedSymptoms = selectedSymptoms
      .filter((s) => s !== 'none')
      .map((k) => {
        const found = symptomOptions.find((opt) => opt.key === k);
        return found ? found.label : k;
      });

    setIsSubmitting(true);
    try {
      const res = await createPatientLog(patientId, {
        systolic: sVal,
        diastolic: dVal,
        steps: stepVal,
        medicines_taken: medsTaken,
        symptoms: formattedSymptoms,
      });

      setSaveSuccess(true);
      if (res.urgent) {
        setUrgentBannerData({
          urgent: true,
          message:
            res.urgent_message ||
            'Emergency: High blood pressure or shortness of breath detected. Please seek urgent care and call 112 immediately.',
        });
      } else {
        setUrgentBannerData(null);
      }

      // Refresh log history
      fetchPastLogs();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit daily telemetry. Server may be offline.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="log-today-page">
      <DemoBanner text={t.demoNotice} />

      <PageHeader
        title={t.logTodayTitle}
        subtitle={`${t.logTodaySubtitle} · Patient ${patientId}`}
      />

      {/* Save Confirmation Banner */}
      {saveSuccess && (
        <div className="save-success-banner" role="status">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div>
            <strong>{t.logSuccessTitle}:</strong> {t.logSuccessMsg}
          </div>
        </div>
      )}

      {/* Urgent Emergency Banner (Red with icon and text, Call 112) */}
      {urgentBannerData && (
        <div className="urgent-banner" role="alert">
          <div className="urgent-banner-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A6261B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="urgent-banner-content">
            <h3>{t.urgentAlertTitle}</h3>
            <p>{urgentBannerData.message}</p>
            <div className="urgent-call-btn-wrapper">
              <Button
                variant="danger"
                size="md"
                onClick={() => window.open('tel:112')}
                iconLeft={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                }
              >
                {t.emergencyCallBtn}
              </Button>
            </div>
          </div>
        </div>
      )}

      {formError && (
        <div className="urgent-banner" role="alert">
          <p>{formError}</p>
        </div>
      )}

      <div className="log-today-grid">
        {/* Left: Telemetry Log Form */}
        <Card variant="raised" padding="md" className="log-form-card">
          <h2 className="log-form-title">Enter daily vitals & check-in</h2>
          <p className="log-form-desc">
            All telemetry is recorded against your synthetic digital twin.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="bp-inputs-row">
              <Field label={t.systolicLabel} helperText="Target: < 130 mmHg">
                <Input
                  type="number"
                  min={70}
                  max={240}
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  required
                />
              </Field>
              <Field label={t.diastolicLabel} helperText="Target: < 80 mmHg">
                <Input
                  type="number"
                  min={40}
                  max={150}
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  required
                />
              </Field>
            </div>

            <Field label={t.stepsLabel} helperText="Daily physical activity">
              <Input
                type="number"
                min={0}
                max={50000}
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
              />
            </Field>

            <Field label={t.medsTakenLabel}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  minHeight: '48px',
                  padding: '8px 14px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-raised-sm)',
                }}
              >
                <input
                  type="checkbox"
                  checked={medsTaken}
                  onChange={(e) => setMedsTaken(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--color-teal)' }}
                />
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {t.medsTakenPrompt}
                </span>
              </label>
            </Field>

            <fieldset className="symptoms-fieldset">
              <legend className="symptoms-legend">{t.symptomsLabel}</legend>
              <div className="symptoms-options-grid">
                {symptomOptions.map((opt) => {
                  const isChecked = selectedSymptoms.includes(opt.key);
                  return (
                    <label
                      key={opt.key}
                      className={`symptom-checkbox-label ${isChecked ? 'is-checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="symptom-checkbox-input"
                        checked={isChecked}
                        onChange={() => handleSymptomToggle(opt.key)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <Button
                variant="primary"
                size="lg"
                type="submit"
                isLoading={isSubmitting}
                iconRight={<span>→</span>}
              >
                {isSubmitting ? t.saving : t.saveLogButton}
              </Button>
            </div>
          </form>
        </Card>

        {/* Right: History for this synthetic patient */}
        <Card variant="raised" padding="md" className="log-history-card">
          <h2 className="log-history-title">{t.recentLogsTitle}</h2>

          {loadingLogs ? (
            <p style={{ color: 'var(--color-text-secondary)', padding: '20px' }}>{t.loading}</p>
          ) : pastLogs.length > 0 ? (
            <div className="log-history-list">
              {pastLogs.map((log) => (
                <div key={log.id} className="log-history-item">
                  <div className="log-history-item-header">
                    <span className="log-history-date">{log.created_at.split('T')[0]}</span>
                    {log.urgent ? (
                      <StatusTag variant="urgent" label="Urgent Alert" />
                    ) : (
                      <StatusTag variant="routine" label="Logged" />
                    )}
                  </div>
                  <div className="log-history-bp">
                    {log.systolic} / {log.diastolic} mmHg
                  </div>
                  <div className="log-history-details">
                    <span>{log.steps.toLocaleString()} steps · {log.medicines_taken ? 'Regimen taken' : 'Regimen missed'}</span>
                    {log.symptoms && log.symptoms.length > 0 && (
                      <div style={{ marginTop: '2px', color: 'var(--tag-red-text)' }}>
                        Symptoms: {log.symptoms.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--color-text-secondary)' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>–</span>
              <p>{t.noData}</p>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Your submitted logs will appear here.
              </span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

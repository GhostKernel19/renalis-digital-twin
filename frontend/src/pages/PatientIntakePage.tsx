import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusTag } from '../components/StatusTag';
import { Field, Input, Select } from '../components/Field';
import { PageHeader } from '../components/PageHeader';
import { DemoBanner } from '../components/DemoBanner';
import {
  createPatientIntake,
  createReferral,
  createFollowUp,
  type TwinResultResponse,
} from '../api/client';
import { useApp } from '../context/AppContext';
import './PatientIntakePage.css';

export const PatientIntakePage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshPatientList } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form Fields
  const [patientIdInput, setPatientIdInput] = useState<string>('');
  const [age, setAge] = useState<string>('58');
  const [sex, setSex] = useState<string>('F');
  const [bmi, setBmi] = useState<string>('24.8');

  const [hypertension, setHypertension] = useState<string>('1');
  const [diabetes, setDiabetes] = useState<string>('0');
  const [creatinine, setCreatinine] = useState<string>('1.35');
  const [urineProtein, setUrineProtein] = useState<string>('+1');

  const [consentAgreed, setConsentAgreed] = useState<boolean>(true);

  // Submission & Result States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [twinResult, setTwinResult] = useState<TwinResultResponse | null>(null);

  // Post-intake optional actions
  const [referralPriority, setReferralPriority] = useState<'Routine' | 'Urgent'>('Routine');
  const [referralCreated, setReferralCreated] = useState<boolean>(false);
  const [followUpCreated, setFollowUpCreated] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const handleSubmitIntake = async () => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const ageNum = parseInt(age, 10);
      const bmiNum = parseFloat(bmi);
      const crNum = parseFloat(creatinine);

      if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
        throw new Error('Age must be between 18 and 100.');
      }
      if (isNaN(bmiNum) || bmiNum < 12 || bmiNum > 65) {
        throw new Error('BMI must be between 12.0 and 65.0 kg/m².');
      }
      if (isNaN(crNum) || crNum < 0.3 || crNum > 15.0) {
        throw new Error('Serum creatinine must be between 0.3 and 15.0 mg/dL.');
      }

      const res = await createPatientIntake({
        patient_id: patientIdInput.trim() || undefined,
        age: ageNum,
        sex: sex.toUpperCase() === 'M' ? 'M' : 'F',
        diabetes: parseInt(diabetes, 10) || 0,
        hypertension: parseInt(hypertension, 10) || 0,
        bmi: bmiNum,
        baseline_creatinine: crNum,
        urine_protein: urineProtein,
      });

      setTwinResult(res);
      refreshPatientList();
    } catch (err: any) {
      setFormError(err.message || 'Error onboarding patient into digital twin engine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReferral = async () => {
    if (!twinResult) return;
    setActionLoading(true);
    try {
      await createReferral({
        patient_id: twinResult.patient_id,
        reason: `New intake risk evaluation (${twinResult.ckd_stage}, ${twinResult.tier} risk)`,
        priority: referralPriority,
        suggested_tier: twinResult.tier,
        status: 'Pending',
        note: 'Submitted during patient intake workflow.',
      });
      setReferralCreated(true);
    } catch (err: any) {
      alert(`Error creating referral: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateFollowUp = async () => {
    if (!twinResult) return;
    setActionLoading(true);
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);
      const dateStr = targetDate.toISOString().split('T')[0];

      await createFollowUp({
        patient_id: twinResult.patient_id,
        purpose: 'Repeat blood test',
        date: dateStr,
        status: 'Scheduled',
      });
      setFollowUpCreated(true);
    } catch (err: any) {
      alert(`Error creating follow-up: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="patient-intake-page">
      <DemoBanner text="Demo only · Synthetic patient records · Research prototype for Digital Twin Challenge 2026" />

      <PageHeader
        title="Patient Intake"
        subtitle="Onboard a synthetic patient profile, compute CKD-EPI 2021 baseline eGFR, and generate digital twin state."
      />

      {/* Stepper Bar */}
      <div className="intake-stepper-card">
        <div className={`stepper-step ${currentStep > 1 || twinResult ? 'is-complete' : currentStep === 1 ? 'is-active' : ''}`}>
          <div className="stepper-indicator">{currentStep > 1 || twinResult ? '✓' : '1'}</div>
          <div className="stepper-step-info">
            <span className="step-label">1 · Demographics</span>
            <span className="step-state">{currentStep > 1 || twinResult ? 'Complete' : 'Current step'}</span>
          </div>
        </div>

        <div className={`stepper-step ${currentStep > 2 || twinResult ? 'is-complete' : currentStep === 2 ? 'is-active' : ''}`}>
          <div className="stepper-indicator">{currentStep > 2 || twinResult ? '✓' : '2'}</div>
          <div className="stepper-step-info">
            <span className="step-label">2 · Laboratory & Health</span>
            <span className="step-state">{currentStep > 2 || twinResult ? 'Complete' : currentStep === 2 ? 'Current step' : 'Pending'}</span>
          </div>
        </div>

        <div className={`stepper-step ${twinResult ? 'is-complete' : currentStep === 3 ? 'is-active' : ''}`}>
          <div className="stepper-indicator">{twinResult ? '✓' : '3'}</div>
          <div className="stepper-step-info">
            <span className="step-label">3 · Review & Twin Result</span>
            <span className="step-state">{twinResult ? 'Generated' : currentStep === 3 ? 'Current step' : 'Pending'}</span>
          </div>
        </div>
      </div>

      {formError && (
        <Card variant="raised" padding="md" style={{ borderLeft: '6px solid var(--tag-red-text)', backgroundColor: '#FDF4F3' }}>
          <strong style={{ color: 'var(--tag-red-text)' }}>Validation Error</strong>
          <p style={{ fontSize: '15px', marginTop: '4px' }}>{formError}</p>
        </Card>
      )}

      {/* Twin Result Display after Submission */}
      {twinResult ? (
        <Card variant="raised" padding="md" style={{ borderLeft: '6px solid var(--color-teal)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-teal)' }}>
                ✓ Digital Twin Generated: {twinResult.patient_id}
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Baseline eGFR calculated via 2021 CKD-EPI Creatinine equation (without race).
              </p>
            </div>
            <StatusTag
              variant={twinResult.tier === 'High' ? 'red' : twinResult.tier === 'Medium' ? 'amber' : 'green'}
              label={`${twinResult.tier} Risk Tier`}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '20px',
            padding: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
          }}>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'block' }}>Calculated Baseline eGFR</span>
              <strong style={{ fontSize: '24px', color: 'var(--color-text-primary)' }}>{twinResult.latest_kidney_score}</strong>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}> mL/min/1.73m²</span>
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'block' }}>KDIGO CKD Stage</span>
              <strong style={{ fontSize: '18px', color: 'var(--color-text-primary)' }}>{twinResult.ckd_stage}</strong>
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'block' }}>Inference Basis</span>
              <strong style={{ fontSize: '18px', color: 'var(--color-teal)' }}>{twinResult.basis}</strong>
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'block' }}>Progression Probability</span>
              <strong style={{ fontSize: '24px', color: 'var(--color-text-primary)' }}>{(twinResult.probability * 100).toFixed(1)}%</strong>
            </div>
          </div>

          {/* Top Drivers */}
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Progression Drivers (Explainable Basis):
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twinResult.top_drivers.map((driver, idx) => (
                <div key={idx} style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}>
                  <strong style={{ color: 'var(--color-teal)', marginRight: '8px' }}>#{idx + 1}</strong>
                  {driver}
                </div>
              ))}
            </div>
          </div>

          {/* Post-Intake Care Coordination Actions */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
              Care Coordination Actions
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {/* Action 1: Create Referral */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
              }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Referral Priority:</span>
                <select
                  value={referralPriority}
                  onChange={(e) => setReferralPriority(e.target.value as 'Routine' | 'Urgent')}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg)',
                    fontFamily: 'var(--font-sans)',
                  }}
                  disabled={referralCreated}
                >
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                </select>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateReferral}
                  disabled={referralCreated || actionLoading}
                >
                  {referralCreated ? '✓ Referral Created' : '+ Create Referral'}
                </Button>
              </div>

              {/* Action 2: Schedule Follow-Up */}
              <Button
                variant="secondary"
                size="md"
                onClick={handleCreateFollowUp}
                disabled={followUpCreated || actionLoading}
                iconLeft={<span>📅</span>}
              >
                {followUpCreated ? '✓ Follow-Up Scheduled' : 'Schedule Repeat Blood Test'}
              </Button>

              {/* Action 3: Go to Clinician View */}
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate(`/patients/${twinResult.patient_id}`)}
              >
                Open Clinician Twin View →
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Multi-Step Intake Form */
        <div>
          {/* Step 1: Demographics */}
          {currentStep === 1 && (
            <Card variant="raised" padding="md" className="intake-card">
              <div className="intake-card-header">
                <h2 className="intake-card-title">1 · Patient Demographics</h2>
                <StatusTag variant="amber" label="Step 1 of 3" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Field label="Synthetic Patient ID" helperText="Leave empty to auto-generate (e.g. SYN-USR-...)">
                  <Input
                    placeholder="e.g. SYN-USR-001"
                    value={patientIdInput}
                    onChange={(e) => setPatientIdInput(e.target.value)}
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="Age (years)">
                    <Input
                      type="number"
                      min={18}
                      max={100}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Biological Sex">
                    <Select
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                      options={[
                        { value: 'F', label: 'Female' },
                        { value: 'M', label: 'Male' },
                      ]}
                    />
                  </Field>
                </div>

                <Field label="Body Mass Index (BMI)" helperText="kg/m² (normal range: 18.5 – 24.9)">
                  <Input
                    type="number"
                    step="0.1"
                    min={12}
                    max={65}
                    value={bmi}
                    onChange={(e) => setBmi(e.target.value)}
                    required
                  />
                </Field>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <Button variant="primary" size="md" onClick={() => setCurrentStep(2)}>
                    Next: Health Details →
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Step 2: Health Details */}
          {currentStep === 2 && (
            <Card variant="raised" padding="md" className="intake-card">
              <div className="intake-card-header">
                <h2 className="intake-card-title">2 · Clinical & Laboratory Measurements</h2>
                <StatusTag variant="amber" label="Step 2 of 3" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field label="Hypertension Diagnosis">
                    <Select
                      value={hypertension}
                      onChange={(e) => setHypertension(e.target.value)}
                      options={[
                        { value: '1', label: 'Yes (Diagnosed)' },
                        { value: '0', label: 'No' },
                      ]}
                    />
                  </Field>
                  <Field label="Type 2 Diabetes">
                    <Select
                      value={diabetes}
                      onChange={(e) => setDiabetes(e.target.value)}
                      options={[
                        { value: '0', label: 'No' },
                        { value: '1', label: 'Yes (Diagnosed)' },
                      ]}
                    />
                  </Field>
                </div>

                <Field label="Serum Creatinine (mg/dL)" helperText="Used to compute 2021 CKD-EPI eGFR">
                  <Input
                    type="number"
                    step="0.01"
                    min={0.3}
                    max={15.0}
                    value={creatinine}
                    onChange={(e) => setCreatinine(e.target.value)}
                    required
                  />
                </Field>

                <Field label="Urine Protein Dipstick" helperText="Qualitative proteinuria tier">
                  <Select
                    value={urineProtein}
                    onChange={(e) => setUrineProtein(e.target.value)}
                    options={[
                      { value: 'negative', label: 'Negative' },
                      { value: 'trace', label: 'Trace' },
                      { value: '+1', label: '+1 (Mild)' },
                      { value: '+2', label: '+2 (Moderate)' },
                      { value: '+3', label: '+3 (Heavy)' },
                      { value: '+4', label: '+4 (Severe)' },
                    ]}
                  />
                </Field>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <Button variant="secondary" size="md" onClick={() => setCurrentStep(1)}>
                    ← Back to Demographics
                  </Button>
                  <Button variant="primary" size="md" onClick={() => setCurrentStep(3)}>
                    Next: Review & Submit →
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Step 3: Review & Consent */}
          {currentStep === 3 && (
            <Card variant="raised" padding="md" className="intake-card">
              <div className="intake-card-header">
                <h2 className="intake-card-title">3 · Review & Intake Submission</h2>
                <StatusTag variant="current" label="Final Step" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.45)',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  fontSize: '15px',
                }}>
                  <div><strong>Patient ID:</strong> {patientIdInput || '(Auto-generated)'}</div>
                  <div><strong>Age / Sex:</strong> {age} years · {sex === 'M' ? 'Male' : 'Female'}</div>
                  <div><strong>BMI:</strong> {bmi} kg/m²</div>
                  <div><strong>Creatinine:</strong> {creatinine} mg/dL</div>
                  <div><strong>Hypertension:</strong> {hypertension === '1' ? 'Yes' : 'No'}</div>
                  <div><strong>Diabetes:</strong> {diabetes === '1' ? 'Yes' : 'No'}</div>
                  <div><strong>Urine Protein:</strong> {urineProtein}</div>
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  padding: '12px 14px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <input
                    type="checkbox"
                    checked={consentAgreed}
                    onChange={(e) => setConsentAgreed(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--color-teal)' }}
                  />
                  <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    Confirm that synthetic intake parameters have been reviewed and agree to generate the computational digital twin state.
                  </span>
                </label>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <Button variant="secondary" size="md" onClick={() => setCurrentStep(2)}>
                    ← Back to Health Details
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSubmitIntake}
                    isLoading={isSubmitting}
                    disabled={!consentAgreed || isSubmitting}
                  >
                    {isSubmitting ? 'Generating Twin...' : 'Submit & Generate Twin →'}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

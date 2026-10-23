/**
 * RENALIS API Client
 * Digital Twin Challenge 2026
 *
 * Connects to the FastAPI backend using VITE_API_URL (default: http://127.0.0.1:8000).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface Reading {
  patient_id?: string;
  month: number;
  egfr: number;
  systolic_bp: number;
  diastolic_bp: number;
  adherence_pct: number;
  daily_steps: number;
}

export interface Patient {
  patient_id: string;
  age: number;
  sex: string;
  diabetes: number;
  hypertension: number;
  bmi: number;
  baseline_creatinine: number;
  baseline_egfr: number;
  urine_protein: string;
  readings?: Reading[];
}

export interface PatientsResponse {
  total: number;
  count: number;
  offset: number;
  patients: Patient[];
}

export interface Referral {
  id: string;
  patient_id: string;
  reason: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Review' | 'Reviewed';
  created_at: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  model_loaded: boolean;
  model_file_exists: boolean;
  message: string;
}

export interface TrendProjectionPoint {
  month: number;
  projected_egfr: number;
}

export interface EstimatedTrend {
  projected_slope: number;
  projected_3m_change_pct: number;
  projected_readings: TrendProjectionPoint[];
  summary: string;
}

export interface AssessResponse {
  probability: number;
  tier: 'Low' | 'Medium' | 'High';
  top_features: string[];
  estimated_3m_egfr_trend: EstimatedTrend;
  feature_contributions?: Array<{
    feature: string;
    contribution?: number;
    importance_score?: number;
    value?: number;
  }>;
}

/**
 * Handle API responses with clear error message extraction.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string'
          ? errorJson.detail
          : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorDetail);
  }
  return response.json();
}

/**
 * Check backend service and ML model health.
 */
export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`);
  return handleResponse<HealthResponse>(res);
}

/**
 * Fetch patient cohort list with optional pagination.
 */
export async function getPatients(limit: number = 50, offset: number = 0): Promise<PatientsResponse> {
  const url = new URL(`${API_BASE_URL}/patients`);
  if (limit) url.searchParams.append('limit', limit.toString());
  if (offset) url.searchParams.append('offset', offset.toString());

  const res = await fetch(url.toString());
  return handleResponse<PatientsResponse>(res);
}

/**
 * Fetch specific patient details including longitudinal readings.
 */
export async function getPatientById(patientId: string): Promise<Patient> {
  const res = await fetch(`${API_BASE_URL}/patients/${encodeURIComponent(patientId)}`);
  return handleResponse<Patient>(res);
}

/**
 * Fetch care coordination referral queue.
 */
export async function getReferrals(statusFilter?: string, patientId?: string): Promise<Referral[]> {
  const url = new URL(`${API_BASE_URL}/referrals`);
  if (statusFilter) url.searchParams.append('status_filter', statusFilter);
  if (patientId) url.searchParams.append('patient_id', patientId);

  const res = await fetch(url.toString());
  return handleResponse<Referral[]>(res);
}

/**
 * Create a new referral.
 */
export async function createReferral(payload: Omit<Referral, 'id' | 'created_at'>): Promise<Referral> {
  const res = await fetch(`${API_BASE_URL}/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Referral>(res);
}

/**
 * Run risk assessment for a patient and readings.
 */
export async function assessPatient(payload: {
  patient: Partial<Patient>;
  readings: Reading[];
}): Promise<AssessResponse> {
  const res = await fetch(`${API_BASE_URL}/assess-patient`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<AssessResponse>(res);
}

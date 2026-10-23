/**
 * RENALIS API Client
 * Digital Twin Challenge 2026
 *
 * Connects to the FastAPI backend using VITE_API_URL (default: http://127.0.0.1:8000).
 * All patient records and telemetry are synthetic.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface Reading {
  patient_id?: string;
  month: number;
  egfr: number;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  adherence_pct?: number | null;
  daily_steps?: number | null;
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
  risk_tier?: 'Low' | 'Medium' | 'High';
  tier?: 'Low' | 'Medium' | 'High';
  risk_probability?: number;
  probability?: number;
  basis?: string;
  readings?: Reading[];
}

export interface PatientsResponse {
  total: number;
  count: number;
  offset: number;
  patients: Patient[];
}

export interface TrendProjectionPoint {
  month: number;
  projected_egfr: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface EstimatedTrend {
  method: string;
  projected_slope: number;
  projected_3m_egfr?: number;
  lower_bound?: number;
  upper_bound?: number;
  projected_3m_change_pct: number;
  projected_readings: TrendProjectionPoint[];
  summary: string;
}

export interface TwinResultResponse {
  patient_id: string;
  latest_kidney_score: number;
  ckd_stage: string;
  probability: number;
  tier: 'Low' | 'Medium' | 'High';
  basis: 'trend model' | 'baseline only';
  top_drivers: string[];
  top_features: string[];
  estimated_3m_egfr_trend: EstimatedTrend;
  feature_contributions?: Array<{
    feature: string;
    contribution?: number;
    value?: number;
  }>;
}

export interface DailyLogCreate {
  systolic: number;
  diastolic: number;
  steps: number;
  medicines_taken: boolean;
  symptoms: string[] | string;
}

export interface DailyLogResponse {
  id: string;
  patient_id: string;
  systolic: number;
  diastolic: number;
  steps: number;
  medicines_taken: boolean;
  symptoms: string[];
  urgent: boolean;
  urgent_message?: string;
  created_at: string;
}

export interface Referral {
  id: string;
  patient_id: string;
  reason: string;
  priority: 'Routine' | 'Urgent';
  suggested_tier?: string;
  status: 'Pending' | 'In Review' | 'Reviewed' | 'Completed';
  note?: string;
  created_at: string;
  updated_at?: string;
}

export interface ReferralCreate {
  patient_id: string;
  reason: string;
  priority?: 'Routine' | 'Urgent';
  suggested_tier?: string;
  status?: 'Pending' | 'In Review' | 'Reviewed' | 'Completed';
  note?: string;
}

export interface ReferralUpdate {
  status?: 'Pending' | 'In Review' | 'Reviewed' | 'Completed';
  priority?: 'Routine' | 'Urgent';
  note?: string;
}

export interface FollowUp {
  id: string;
  patient_id: string;
  purpose: string;
  date: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  created_at: string;
  updated_at: string;
}

export interface FollowUpCreate {
  patient_id: string;
  purpose: string;
  date: string;
  status?: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface FollowUpUpdate {
  purpose?: string;
  date?: string;
  status?: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface StatsResponse {
  totals: {
    patients: number;
    assessments: number;
    daily_logs: number;
    referrals: number;
    follow_ups: number;
  };
  risk_tier_distribution: Record<string, number>;
  referrals_by_status: Record<string, number>;
  follow_ups_due_this_week: number;
}

export interface PatientIntakeRequest {
  patient_id?: string;
  age: number;
  sex: string;
  diabetes: number;
  hypertension: number;
  bmi: number;
  baseline_creatinine: number;
  urine_protein: string;
  earlier_scores?: Reading[];
}

export interface HealthResponse {
  status: string;
  service: string;
  synthetic_data_available: boolean;
  patients_data_path: string;
  model_loaded: boolean;
  model_file_exists: boolean;
  model_path: string;
  baseline_model_loaded: boolean;
  baseline_model_file_exists: boolean;
  baseline_model_path: string;
  message: string;
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
 * Fetch patient cohort list with optional search, tier filter, and pagination.
 */
export async function getPatients(params?: {
  search?: string;
  risk_tier?: string;
  limit?: number;
  offset?: number;
}): Promise<PatientsResponse> {
  const url = new URL(`${API_BASE_URL}/patients`);
  if (params?.search) url.searchParams.append('search', params.search);
  if (params?.risk_tier && params.risk_tier !== 'all') {
    url.searchParams.append('risk_tier', params.risk_tier);
  }
  if (params?.limit) url.searchParams.append('limit', params.limit.toString());
  if (params?.offset != null) url.searchParams.append('offset', params.offset.toString());

  const res = await fetch(url.toString());
  return handleResponse<PatientsResponse>(res);
}

/**
 * Fetch specific patient details including baseline demographics and longitudinal readings.
 */
export async function getPatientById(patientId: string): Promise<Patient> {
  const res = await fetch(`${API_BASE_URL}/patients/${encodeURIComponent(patientId)}`);
  return handleResponse<Patient>(res);
}

/**
 * Fetch monthly longitudinal readings for a patient.
 */
export async function getPatientReadings(patientId: string): Promise<Reading[]> {
  const res = await fetch(`${API_BASE_URL}/patients/${encodeURIComponent(patientId)}/readings`);
  return handleResponse<Reading[]>(res);
}

/**
 * Fetch digital twin progression state and 3-month forecast from GET /patients/{id}/twin
 */
export async function getPatientTwin(patientId: string): Promise<TwinResultResponse> {
  const res = await fetch(`${API_BASE_URL}/patients/${encodeURIComponent(patientId)}/twin`);
  return handleResponse<TwinResultResponse>(res);
}

/**
 * Create a new patient via intake endpoint POST /patients
 */
export async function createPatientIntake(payload: PatientIntakeRequest): Promise<TwinResultResponse> {
  const res = await fetch(`${API_BASE_URL}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<TwinResultResponse>(res);
}

/**
 * Submit daily telemetry log POST /patients/{id}/logs
 */
export async function createPatientLog(patientId: string, payload: DailyLogCreate): Promise<DailyLogResponse> {
  const res = await fetch(`${API_BASE_URL}/patients/${encodeURIComponent(patientId)}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<DailyLogResponse>(res);
}

/**
 * Fetch patient daily telemetry logs from GET /patients/{id}/logs
 */
export async function getPatientLogs(patientId: string): Promise<DailyLogResponse[]> {
  const res = await fetch(`${API_BASE_URL}/patients/${encodeURIComponent(patientId)}/logs`);
  return handleResponse<DailyLogResponse[]>(res);
}

/**
 * Fetch care coordination referral queue.
 */
export async function getReferrals(params?: {
  status?: string;
  priority?: string;
  patient_id?: string;
}): Promise<Referral[]> {
  const url = new URL(`${API_BASE_URL}/referrals`);
  if (params?.status && params.status !== 'all') {
    url.searchParams.append('status', params.status);
  }
  if (params?.priority && params.priority !== 'all') {
    url.searchParams.append('priority', params.priority);
  }
  if (params?.patient_id) {
    url.searchParams.append('patient_id', params.patient_id);
  }

  const res = await fetch(url.toString());
  return handleResponse<Referral[]>(res);
}

/**
 * Create a new referral.
 */
export async function createReferral(payload: ReferralCreate): Promise<Referral> {
  const res = await fetch(`${API_BASE_URL}/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Referral>(res);
}

/**
 * Update an existing referral status, priority, or note.
 */
export async function updateReferral(referralId: string, payload: ReferralUpdate): Promise<Referral> {
  const res = await fetch(`${API_BASE_URL}/referrals/${encodeURIComponent(referralId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Referral>(res);
}

/**
 * Fetch scheduled care team follow-ups.
 */
export async function getFollowUps(params?: {
  patient_id?: string;
  status?: string;
  due_this_week?: boolean;
}): Promise<FollowUp[]> {
  const url = new URL(`${API_BASE_URL}/follow-ups`);
  if (params?.patient_id) {
    url.searchParams.append('patient_id', params.patient_id);
  }
  if (params?.status && params.status !== 'all') {
    url.searchParams.append('status', params.status);
  }
  if (params?.due_this_week != null) {
    url.searchParams.append('due_this_week', params.due_this_week.toString());
  }

  const res = await fetch(url.toString());
  return handleResponse<FollowUp[]>(res);
}

/**
 * Schedule a generic follow-up appointment.
 */
export async function createFollowUp(payload: FollowUpCreate): Promise<FollowUp> {
  const res = await fetch(`${API_BASE_URL}/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<FollowUp>(res);
}

/**
 * Update follow-up status, purpose, or date.
 */
export async function updateFollowUp(followUpId: string, payload: FollowUpUpdate): Promise<FollowUp> {
  const res = await fetch(`${API_BASE_URL}/follow-ups/${encodeURIComponent(followUpId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<FollowUp>(res);
}

/**
 * Fetch platform totals, risk distribution, and care coordination metrics.
 */
export async function getStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE_URL}/stats`);
  return handleResponse<StatsResponse>(res);
}

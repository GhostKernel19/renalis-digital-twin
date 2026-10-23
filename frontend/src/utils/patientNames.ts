/**
 * Synthetic Patient Display Name & Clinical Risk Helper
 * Digital Twin Challenge 2026
 */

import type { Patient } from '../api/client';

const MALE_FIRST_NAMES = [
  'Arthur', 'Marcus', 'Edward', 'Julian', 'David', 'Robert', 'Thomas',
  'William', 'James', 'Charles', 'George', 'Henry', 'Samuel', 'Alexander',
  'Benjamin', 'Daniel', 'Richard', 'Joseph', 'Vincent', 'Oliver', 'Franklin',
  'Leonard', 'Raymond', 'Walter', 'Harold', 'Patrick', 'Timothy', 'Lawrence',
];

const FEMALE_FIRST_NAMES = [
  'Eleanor', 'Margaret', 'Beatrice', 'Clara', 'Evelyn', 'Dorothy', 'Alice',
  'Helen', 'Ruth', 'Florence', 'Grace', 'Martha', 'Rose', 'Virginia',
  'Frances', 'Lillian', 'Edna', 'Catherine', 'Hazel', 'Genevieve', 'Marian',
  'Bernice', 'Loretta', 'Constance', 'Theresa', 'Sylvia', 'Joanne', 'Miriam',
];

const LAST_NAMES = [
  'Pendelton', 'Vance', 'Reynolds', 'Miller', 'Harper', 'Kaufman', 'Sinclair',
  'Donovan', 'Sterling', 'Mercer', 'Gallagher', 'Prescott', 'Thornton', 'Blackwood',
  'Winslow', 'Montgomery', 'Carrington', 'Ellsworth', 'Fairchild', 'Harrington',
  'Kensington', 'Livingston', 'Radcliffe', 'Stanhope', 'Wakefield', 'Whitmore',
];

/**
 * Deterministically generate a realistic clinical display name from synthetic patient_id.
 */
export function getPatientDisplayName(patient: Partial<Patient>): string {
  const pid = patient.patient_id || 'SYN-001';
  // Parse trailing integer e.g. SYN-042 -> 42
  const numMatch = pid.match(/\d+/);
  const idNum = numMatch ? parseInt(numMatch[0], 10) : 1;

  const isFemale = patient.sex?.toUpperCase() === 'F';
  const firstNames = isFemale ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES;

  const firstName = firstNames[(idNum * 7) % firstNames.length];
  const lastName = LAST_NAMES[(idNum * 13) % LAST_NAMES.length];

  return `${firstName} ${lastName}`;
}

/**
 * Determine clinical risk level (High, Medium, Low) for overview display.
 * Uses clinical KDIGO matrix thresholds (eGFR categories & proteinuria tier).
 */
export function getPatientRiskLevel(patient: Partial<Patient>): 'High' | 'Medium' | 'Low' {
  const egfr = patient.baseline_egfr ?? 60;
  const protein = (patient.urine_protein || 'negative').toLowerCase();

  // Severe CKD stage (Stage 3b/4/5: eGFR < 45) or heavy proteinuria (+2, +3, +4)
  if (egfr < 45 || protein === '+2' || protein === '+3' || protein === '+4') {
    return 'High';
  }

  // Moderate CKD stage (Stage 3a: eGFR 45-59) or microalbuminuria (+1)
  if (egfr < 60 || protein === '+1') {
    return 'Medium';
  }

  // Mild or normal (Stage 1-2: eGFR >= 60 with trace/negative proteinuria)
  return 'Low';
}

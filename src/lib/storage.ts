import { AssessmentRecord } from '@/types';

const STORAGE_KEY = 'adhd_records';
const DOCTOR_MODE_KEY = 'adhd_doctor_mode';

export function saveRecords(records: AssessmentRecord[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
}

export function loadRecords(): AssessmentRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function addRecord(record: AssessmentRecord): void {
  const records = loadRecords();
  records.unshift(record);
  saveRecords(records);
}

export function clearRecords(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getDoctorMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DOCTOR_MODE_KEY) === 'true';
}

export function setDoctorMode(mode: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DOCTOR_MODE_KEY, String(mode));
  }
}

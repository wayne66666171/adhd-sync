export interface DoctorRecord {
  province: string;
  city: string;
  hospital: string;
  department: string;
  notes?: string;
}

export const doctorData: DoctorRecord[] = [];

export function getDoctorsByProvince(province: string): DoctorRecord[] {
  return doctorData.filter((doctor) => doctor.province === province);
}

export function getDoctorsByCity(province: string, city: string): DoctorRecord[] {
  return doctorData.filter((doctor) => doctor.province === province && doctor.city === city);
}

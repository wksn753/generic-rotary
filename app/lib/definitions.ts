export type Submission = {
  fullName: string;
  phone: string;
  email: string;
  rotaryClub: string;
  classification: string;
  purpose: string;
  otherPurpose: string;
  event: string;
  date: string;
  attendanceDate: string;
  venue: string;
  submittedAt: string;
  checkInSource?: string;
};

export type RegistrationResponse = {
  success: boolean;
  message: string;
  code?: 'VALIDATION' | 'DUPLICATE' | 'UNAVAILABLE' | 'UNKNOWN' | 'NOT_FOUND' | 'LOOKUP_FAILED';
  alreadyRegistered?: boolean;
};

export type ReturningVisitor = {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  rotaryClub: string;
  classification: string;
};

export type LookupResponse = {
  success: boolean;
  message?: string;
  code?: 'VALIDATION' | 'NOT_FOUND' | 'LOOKUP_FAILED' | 'UNAVAILABLE' | 'UNKNOWN';
  visitor?: ReturningVisitor;
};

export type AttendanceRecord = Submission & {
  ID?: number;
  id?: number;
  CreatedAt?: string;
  createdAt?: string;
};

export type AttendanceResponse = {
  success: boolean;
  date?: string;
  count?: number;
  records?: AttendanceRecord[];
  message?: string;
  code?: 'UNAVAILABLE' | 'UNKNOWN' | 'UNAUTHORIZED' | 'BACKEND_UNAUTHORIZED';
};

/**
 * Backward-compatible alias in case old files still import registrationResponse.
 */
export type registrationResponse = RegistrationResponse;

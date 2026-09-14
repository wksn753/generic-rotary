export type Submission = {
  fullName: string;
  phone: string;
  email: string;
  rotaryClub: string;
  baseRotaryClub?: string;
  buddyGroup?: string;
  invitedBy?: string;
  customClub?: boolean;
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
  record?: AttendanceRecord;
};

export type ReturningVisitor = {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  rotaryClub: string;
  baseRotaryClub?: string;
  buddyGroup?: string;
  invitedBy?: string;
  customClub?: boolean;
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

export type AttendanceLeaderboardEntry = {
  name: string;
  uniquePeople: number;
  attendanceCount: number;
};

export type PersonAttendanceLeaderboardEntry = {
  name: string;
  email: string;
  phone: string;
  rotaryClub: string;
  buddyGroup: string;
  attendanceCount: number;
  lastAttendance: string;
};

export type AttendanceSummary = {
  totalAttendance: number;
  uniqueVisitors: number;
  customClubAttendance: number;
  buddyGroupAttendance: number;
  referredAttendance: number;
  buddyGroups: AttendanceLeaderboardEntry[];
  clubs: AttendanceLeaderboardEntry[];
};

export type AttendanceResponse = {
  success: boolean;
  date?: string;
  count?: number;
  records?: AttendanceRecord[];
  summary?: AttendanceSummary;
  message?: string;
  code?: 'UNAVAILABLE' | 'UNKNOWN' | 'UNAUTHORIZED' | 'BACKEND_UNAUTHORIZED';
};

export type ClubMember = {
  ID: number;
  fullName: string;
  phone: string;
  email: string;
  rotaryClub: string;
  buddyGroup: string;
  classification: string;
  active: boolean;
  source: string;
  joinedAt?: string | null;
  lastSeenAt?: string | null;
};

export type Donation = {
  ID: number;
  attendanceDate: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  memberId?: number | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  reference: string;
  notes: string;
  recordedBy: string;
};

export type ClubGoal = {
  ID: number;
  title: string;
  description: string;
  metric: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  dueDate: string;
  status: string;
};

export type RotaryProject = {
  ID: number;
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  goalId?: number | null;
};

export type ProjectTransaction = {
  ID: number;
  projectId: number;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  category: string;
  description: string;
  transactionDate: string;
  reference: string;
  recordedBy: string;
};

export type ProjectInvoice = {
  ID: number;
  projectId: number;
  invoiceNumber: string;
  vendor: string;
  customer: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string | null;
  fileUrl: string;
};

export type ProjectSummary = {
  project: RotaryProject;
  income: number;
  expenses: number;
  balance: number;
  transactions?: ProjectTransaction[];
  invoices?: ProjectInvoice[];
};

export type EmailCampaign = {
  ID: number;
  name: string;
  audience: string;
  subject: string;
  body: string;
  attendanceDate: string;
  scheduledAt: string;
  status: string;
  createdBy: string;
  sentCount: number;
  failedCount: number;
  completedAt?: string | null;
};

export type OperationsDashboard = {
  totalMembers: number;
  activeMembers: number;
  totalAttendance: number;
  uniqueAttendees: number;
  visitorAttendance: number;
  totalDonations: number;
  donationCurrency: string;
  activeGoals: number;
  activeProjects: number;
  pendingMailJobs: number;
  topAttendees: PersonAttendanceLeaderboardEntry[];
  buddyGroups: AttendanceLeaderboardEntry[];
};

/** Backward-compatible alias in case old files still import registrationResponse. */
export type registrationResponse = RegistrationResponse;

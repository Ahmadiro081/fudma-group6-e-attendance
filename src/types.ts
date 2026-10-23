export type UserRole = 'admin' | 'lecturer' | 'student';
export type UserStatus = 'active' | 'deactivated';

export interface User {
  uid: string;
  fullName: string;
  staffId?: string;
  matricNumber?: string;
  email: string;
  role: UserRole;
  department?: string;
  level?: string;
  status: UserStatus;
  createdAt: string;
}

export interface Course {
  id: string;
  courseCode: string;
  courseTitle: string;
  lecturerUid: string;
  academicSession: string;
  semester?: string;
  department?: string;
  creditUnits: number;
  enrolledStudentIds: string[];
  createdAt: string;
}

export type SessionStatus = 'active' | 'paused' | 'closed' | 'finalized';

export interface LectureSession {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  lecturerUid: string;
  lecturerName: string;
  venue: string;
  date: string;
  startTime: string;
  lateThreshold: string;
  closeTime: string;
  status: SessionStatus;
  manualCode: string;
  qrToken?: string;
  allowManualCode: boolean;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'late' | 'absent';
export type VerificationMethod = 'qr_scan' | 'manual_code' | 'finalized_absence';

export interface AttendanceRecord {
  id: string;
  lectureSessionId: string;
  studentUid: string;
  studentName: string;
  matricNumber: string;
  courseId: string;
  courseCode: string;
  courseTitle?: string;
  checkInTime: string;
  timestamp: string;
  status: AttendanceStatus;
  isLate: boolean;
  verificationMethod: VerificationMethod;
}

export interface AuditLog {
  id: string;
  eventType: string;
  actorUid: string;
  actorName: string;
  targetId: string;
  timestamp: string;
  metadata: string;
}

export interface TeamMember {
  id: number;
  name: string;
  matricNumber: string;
  role: string;
  dept: string;
}

export interface FirebaseConfigState {
  apiKey: string;
  projectId: string;
  authDomain: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  functionsRegion?: string;
}

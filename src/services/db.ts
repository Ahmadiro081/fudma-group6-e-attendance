import {
  User,
  Course,
  LectureSession,
  AttendanceRecord,
  AuditLog,
  TeamMember,
  FirebaseConfigState,
  SessionStatus
} from '../types';

const DB_STORAGE_PREFIX = 'fudma_db_';
const STORAGE_KEY_TEAM_MEMBERS = 'fudma_group6_team_members_v1';
const STORAGE_KEY_FIREBASE_CONFIG = 'fudma_firebase_config_v1';
const STORAGE_KEY_ENGINE_MODE = 'fudma_engine_mode_v1';

class DbService {
  private collections = {
    users: 'users',
    courses: 'courses',
    sessions: 'lectureSessions',
    attendance: 'attendanceRecords',
    audit: 'auditLogs',
  };

  constructor() {
    this.initializeDefaultData();
  }

  private _getLocal<T>(collection: string): T[] {
    try {
      const data = localStorage.getItem(DB_STORAGE_PREFIX + collection);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading ${collection} from storage:`, e);
      return [];
    }
  }

  private _setLocal<T>(collection: string, items: T[]): void {
    try {
      localStorage.setItem(DB_STORAGE_PREFIX + collection, JSON.stringify(items));
    } catch (e) {
      console.error(`Error saving ${collection} to storage:`, e);
    }
  }

  public initializeDefaultData(): void {
    const existingUsers = this._getLocal<User>(this.collections.users);
    if (!existingUsers || existingUsers.length === 0) {
      const defaultUsers: User[] = [
        {
          uid: 'admin_001',
          fullName: 'FUDMA Academic Registry Admin',
          staffId: 'FUDMA/STAFF/ADM/014',
          email: 'admin@fudma.edu.ng',
          role: 'admin',
          department: 'Academic Affairs Division',
          status: 'active',
          createdAt: '2026-09-01T08:00:00Z',
        },
        {
          uid: 'lecturer_nura',
          fullName: 'Malam Nura Muhammad',
          staffId: 'FUDMA/STAFF/ENG/082',
          email: 'nura.muhammad@fudma.edu.ng',
          role: 'lecturer',
          department: 'Computer & Engineering Sciences',
          status: 'active',
          createdAt: '2026-09-01T08:30:00Z',
        },
        {
          uid: 'student_001',
          fullName: 'Ibrahim Musa',
          matricNumber: 'FUDMA/2022/UG/ENG/0061',
          email: 'student1@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:00:00Z',
        },
        {
          uid: 'student_002',
          fullName: 'Fatima Aliyu',
          matricNumber: 'FUDMA/2022/UG/ENG/0062',
          email: 'student2@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:05:00Z',
        },
        {
          uid: 'student_003',
          fullName: 'Usman Bello',
          matricNumber: 'FUDMA/2022/UG/ENG/0063',
          email: 'student3@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:10:00Z',
        },
        {
          uid: 'student_004',
          fullName: 'Zainab Hassan',
          matricNumber: 'FUDMA/2022/UG/ENG/0064',
          email: 'student4@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:15:00Z',
        },
        {
          uid: 'student_005',
          fullName: 'Abdullahi Garba',
          matricNumber: 'FUDMA/2022/UG/ENG/0065',
          email: 'student5@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:20:00Z',
        },
      ];
      this._setLocal(this.collections.users, defaultUsers);

      const defaultCourses: Course[] = [
        {
          id: 'course_get411',
          courseCode: 'GET 411',
          courseTitle: 'Artificial Intelligence Mini Project',
          lecturerUid: 'lecturer_nura',
          academicSession: '2026/2027',
          semester: 'First Semester',
          department: 'Faculty of Engineering & Technology',
          creditUnits: 3,
          enrolledStudentIds: [
            'student_001',
            'student_002',
            'student_003',
            'student_004',
            'student_005',
          ],
          createdAt: '2026-09-05T09:00:00Z',
        },
        {
          id: 'course_cpe401',
          courseCode: 'CPE 401',
          courseTitle: 'Embedded Systems Design',
          lecturerUid: 'lecturer_nura',
          academicSession: '2026/2027',
          semester: 'First Semester',
          department: 'Computer Engineering',
          creditUnits: 3,
          enrolledStudentIds: ['student_001', 'student_002', 'student_003'],
          createdAt: '2026-09-05T09:30:00Z',
        },
      ];
      this._setLocal(this.collections.courses, defaultCourses);

      const today = new Date().toISOString().split('T')[0];
      const defaultSessions: LectureSession[] = [
        {
          id: 'session_demo_active',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          courseTitle: 'Artificial Intelligence Mini Project',
          lecturerUid: 'lecturer_nura',
          lecturerName: 'Malam Nura Muhammad',
          venue: 'FUDMA Lecture Hall 3B',
          date: today,
          startTime: '08:00',
          lateThreshold: '08:15',
          closeTime: '23:59',
          status: 'active',
          manualCode: 'AI4116',
          qrToken: 'fudma-token-session_demo_active-live',
          allowManualCode: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'session_past_01',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          courseTitle: 'Artificial Intelligence Mini Project',
          lecturerUid: 'lecturer_nura',
          lecturerName: 'Malam Nura Muhammad',
          venue: 'AI Research Laboratory',
          date: '2026-10-15',
          startTime: '08:00',
          lateThreshold: '08:15',
          closeTime: '09:00',
          status: 'finalized',
          manualCode: 'GET015',
          qrToken: 'fudma-token-session_past_01-archived',
          allowManualCode: true,
          createdAt: '2026-10-15T08:00:00Z',
        },
      ];
      this._setLocal(this.collections.sessions, defaultSessions);

      const defaultAttendance: AttendanceRecord[] = [
        {
          id: 'session_past_01_student_001',
          lectureSessionId: 'session_past_01',
          studentUid: 'student_001',
          studentName: 'Ibrahim Musa',
          matricNumber: 'FUDMA/2022/UG/ENG/0061',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          courseTitle: 'Artificial Intelligence Mini Project',
          checkInTime: '08:08:24',
          timestamp: '2026-10-15T08:08:24Z',
          status: 'present',
          isLate: false,
          verificationMethod: 'qr_scan',
        },
        {
          id: 'session_past_01_student_002',
          lectureSessionId: 'session_past_01',
          studentUid: 'student_002',
          studentName: 'Fatima Aliyu',
          matricNumber: 'FUDMA/2022/UG/ENG/0062',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          courseTitle: 'Artificial Intelligence Mini Project',
          checkInTime: '08:19:10',
          timestamp: '2026-10-15T08:19:10Z',
          status: 'late',
          isLate: true,
          verificationMethod: 'qr_scan',
        },
        {
          id: 'session_past_01_student_003',
          lectureSessionId: 'session_past_01',
          studentUid: 'student_003',
          studentName: 'Usman Bello',
          matricNumber: 'FUDMA/2022/UG/ENG/0063',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          courseTitle: 'Artificial Intelligence Mini Project',
          checkInTime: '08:05:00',
          timestamp: '2026-10-15T08:05:00Z',
          status: 'present',
          isLate: false,
          verificationMethod: 'manual_code',
        },
        {
          id: 'session_past_01_student_004',
          lectureSessionId: 'session_past_01',
          studentUid: 'student_004',
          studentName: 'Zainab Hassan',
          matricNumber: 'FUDMA/2022/UG/ENG/0064',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          courseTitle: 'Artificial Intelligence Mini Project',
          checkInTime: 'N/A',
          timestamp: '2026-10-15T09:01:00Z',
          status: 'absent',
          isLate: false,
          verificationMethod: 'finalized_absence',
        },
        {
          id: 'session_past_01_student_005',
          lectureSessionId: 'session_past_01',
          studentUid: 'student_005',
          studentName: 'Abdullahi Garba',
          matricNumber: 'FUDMA/2022/UG/ENG/0065',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          courseTitle: 'Artificial Intelligence Mini Project',
          checkInTime: 'N/A',
          timestamp: '2026-10-15T09:01:00Z',
          status: 'absent',
          isLate: false,
          verificationMethod: 'finalized_absence',
        },
      ];
      this._setLocal(this.collections.attendance, defaultAttendance);

      const defaultAudit: AuditLog[] = [
        {
          id: 'audit_001',
          eventType: 'SYSTEM_INITIALIZATION',
          actorUid: 'admin_001',
          actorName: 'Registry Admin',
          targetId: 'academic_session_2026_2027',
          timestamp: new Date().toISOString(),
          metadata: 'System seeded with FUDMA GET 411 Group 6 parameters.',
        },
      ];
      this._setLocal(this.collections.audit, defaultAudit);
    }
  }

  // --- Users Operations ---
  public getUsers(role: string | null = null): User[] {
    const all = this._getLocal<User>(this.collections.users);
    return role ? all.filter(u => u.role === role) : all;
  }

  public getUserById(uid: string): User | null {
    const all = this._getLocal<User>(this.collections.users);
    return all.find(u => u.uid === uid) || null;
  }

  public getUserByEmail(email: string): User | null {
    const clean = email.toLowerCase().trim();
    const all = this._getLocal<User>(this.collections.users);
    return all.find(u => u.email.toLowerCase().trim() === clean) || null;
  }

  public saveUser(userData: Partial<User> & { fullName: string; email: string }): User {
    const uid = userData.uid || 'usr_' + Date.now();
    const user: User = {
      uid,
      fullName: userData.fullName,
      email: userData.email,
      role: userData.role || 'student',
      staffId: userData.staffId,
      matricNumber: userData.matricNumber,
      department: userData.department || 'Engineering',
      level: userData.level || '400L',
      status: userData.status || 'active',
      createdAt: userData.createdAt || new Date().toISOString(),
    };

    const all = this._getLocal<User>(this.collections.users);
    const idx = all.findIndex(u => u.uid === uid);
    if (idx >= 0) all[idx] = { ...all[idx], ...user };
    else all.push(user);
    this._setLocal(this.collections.users, all);

    this.addAuditLog({
      eventType: 'USER_SAVED',
      actorUid: 'system',
      actorName: 'Admin/System',
      targetId: uid,
      metadata: `Saved account for ${user.fullName} (${user.role})`,
    });

    return user;
  }

  // --- Courses Operations ---
  public getCourses(lecturerUid: string | null = null): Course[] {
    const all = this._getLocal<Course>(this.collections.courses);
    return lecturerUid ? all.filter(c => c.lecturerUid === lecturerUid) : all;
  }

  public getCourseById(courseId: string): Course | null {
    const all = this._getLocal<Course>(this.collections.courses);
    return all.find(c => c.id === courseId) || null;
  }

  public saveCourse(courseData: Partial<Course> & { courseCode: string; courseTitle: string }): Course {
    const id = courseData.id || 'course_' + Date.now();
    const course: Course = {
      id,
      courseCode: courseData.courseCode,
      courseTitle: courseData.courseTitle,
      lecturerUid: courseData.lecturerUid || 'lecturer_nura',
      academicSession: courseData.academicSession || '2026/2027',
      semester: courseData.semester || 'First Semester',
      department: courseData.department || 'Faculty of Engineering & Technology',
      creditUnits: courseData.creditUnits || 3,
      enrolledStudentIds: courseData.enrolledStudentIds || [],
      createdAt: courseData.createdAt || new Date().toISOString(),
    };

    const all = this._getLocal<Course>(this.collections.courses);
    const idx = all.findIndex(c => c.id === id);
    if (idx >= 0) all[idx] = { ...all[idx], ...course };
    else all.push(course);
    this._setLocal(this.collections.courses, all);

    this.addAuditLog({
      eventType: 'COURSE_SAVED',
      actorUid: 'system',
      actorName: 'System',
      targetId: id,
      metadata: `Saved course ${course.courseCode} - ${course.courseTitle}`,
    });

    return course;
  }

  // --- Lecture Sessions Operations ---
  public getSessions(filterCourseId: string | null = null, filterLecturerUid: string | null = null): LectureSession[] {
    let all = this._getLocal<LectureSession>(this.collections.sessions);
    if (filterCourseId) all = all.filter(s => s.courseId === filterCourseId);
    if (filterLecturerUid) all = all.filter(s => s.lecturerUid === filterLecturerUid);
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getSessionById(sessionId: string): LectureSession | null {
    const all = this._getLocal<LectureSession>(this.collections.sessions);
    return all.find(s => s.id === sessionId) || null;
  }

  public saveSession(sessionData: Partial<LectureSession> & { courseId: string; courseCode: string }): LectureSession {
    const id = sessionData.id || 'session_' + Date.now();
    const session: LectureSession = {
      id,
      courseId: sessionData.courseId,
      courseCode: sessionData.courseCode,
      courseTitle: sessionData.courseTitle || '',
      lecturerUid: sessionData.lecturerUid || 'lecturer_nura',
      lecturerName: sessionData.lecturerName || 'Malam Nura Muhammad',
      venue: sessionData.venue || 'FUDMA Lecture Hall 3B',
      date: sessionData.date || new Date().toISOString().split('T')[0],
      startTime: sessionData.startTime || '08:00',
      lateThreshold: sessionData.lateThreshold || '08:15',
      closeTime: sessionData.closeTime || '09:00',
      status: sessionData.status || 'active',
      manualCode: sessionData.manualCode || ('AI' + Math.floor(1000 + Math.random() * 9000)),
      qrToken: sessionData.qrToken || `fudma-token-${id}-live`,
      allowManualCode: sessionData.allowManualCode !== false,
      createdAt: sessionData.createdAt || new Date().toISOString(),
    };

    const all = this._getLocal<LectureSession>(this.collections.sessions);
    const idx = all.findIndex(s => s.id === id);
    if (idx >= 0) all[idx] = { ...all[idx], ...session };
    else all.unshift(session);
    this._setLocal(this.collections.sessions, all);

    this.addAuditLog({
      eventType: 'SESSION_SAVED',
      actorUid: session.lecturerUid,
      actorName: session.lecturerName,
      targetId: id,
      metadata: `Session ${session.status} for ${session.courseCode}`,
    });

    return session;
  }

  public updateSessionStatus(sessionId: string, status: SessionStatus): LectureSession {
    const session = this.getSessionById(sessionId);
    if (!session) throw new Error('Session not found');
    session.status = status;
    return this.saveSession(session);
  }

  // --- Attendance Operations & Atomic Validation ---
  public getAttendance(filterSessionId: string | null = null, filterStudentUid: string | null = null): AttendanceRecord[] {
    let all = this._getLocal<AttendanceRecord>(this.collections.attendance);
    if (filterSessionId) all = all.filter(a => a.lectureSessionId === filterSessionId);
    if (filterStudentUid) all = all.filter(a => a.studentUid === filterStudentUid);
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public recordAttendanceSubmission({
    sessionId,
    studentUid,
    verificationMethod = 'qr_scan',
  }: {
    sessionId: string;
    studentUid: string;
    verificationMethod?: 'qr_scan' | 'manual_code';
  }): AttendanceRecord {
    // 1. Fetch Session
    const session = this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Lecture session does not exist or has expired.');
    }

    if (session.status !== 'active') {
      if (session.status === 'paused') {
        throw new Error('Attendance session is currently PAUSED by the lecturer. Please wait.');
      }
      throw new Error('This attendance session is CLOSED and is no longer accepting submissions.');
    }

    // 2. Fetch Student
    const student = this.getUserById(studentUid);
    if (!student || student.role !== 'student') {
      throw new Error('Invalid student identity. Only authenticated students may register attendance.');
    }

    if (student.status === 'deactivated') {
      throw new Error('Your student account has been deactivated. Please contact the administrator.');
    }

    // 3. Fetch Course and check Enrollment
    const course = this.getCourseById(session.courseId);
    if (!course) {
      throw new Error('Associated course record was not found.');
    }

    const isEnrolled = course.enrolledStudentIds && course.enrolledStudentIds.includes(studentUid);
    if (!isEnrolled) {
      throw new Error(`You are not registered for ${course.courseCode} (${course.courseTitle}). Attendance cannot be recorded.`);
    }

    // 4. Duplicate Check with Compound Doc ID
    const compoundDocId = `${sessionId}_${studentUid}`;
    const allAttendance = this._getLocal<AttendanceRecord>(this.collections.attendance);
    const existing = allAttendance.find(a => a.id === compoundDocId);
    if (existing) {
      throw new Error('Your attendance has already been recorded for this lecture.');
    }

    // 5. Evaluate check-in time against late threshold
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isLate = currentTimeStr >= session.lateThreshold;
    const status = isLate ? 'late' : 'present';

    const newRecord: AttendanceRecord = {
      id: compoundDocId,
      lectureSessionId: sessionId,
      studentUid: student.uid,
      studentName: student.fullName,
      matricNumber: student.matricNumber || 'N/A',
      courseId: course.id,
      courseCode: course.courseCode,
      courseTitle: course.courseTitle,
      checkInTime: now.toLocaleTimeString(),
      timestamp: now.toISOString(),
      status,
      isLate,
      verificationMethod,
    };

    allAttendance.unshift(newRecord);
    this._setLocal(this.collections.attendance, allAttendance);

    this.addAuditLog({
      eventType: 'ATTENDANCE_RECORDED',
      actorUid: student.uid,
      actorName: student.fullName,
      targetId: compoundDocId,
      metadata: `Status: ${status.toUpperCase()} (${isLate ? 'Late' : 'On-time'}) for ${course.courseCode}`,
    });

    return newRecord;
  }

  public finalizeSessionAbsences(sessionId: string): { absentCount: number } {
    const session = this.getSessionById(sessionId);
    if (!session) throw new Error('Session not found');

    const course = this.getCourseById(session.courseId);
    if (!course) throw new Error('Course not found');

    const existingAttendance = this.getAttendance(sessionId);
    const attendedStudentUids = new Set(existingAttendance.map(a => a.studentUid));

    const absentStudents: AttendanceRecord[] = [];
    const allUsers = this.getUsers('student');

    for (const studentUid of course.enrolledStudentIds || []) {
      if (!attendedStudentUids.has(studentUid)) {
        const student = allUsers.find(u => u.uid === studentUid);
        if (student) {
          const compoundDocId = `${sessionId}_${studentUid}`;
          const absentRecord: AttendanceRecord = {
            id: compoundDocId,
            lectureSessionId: sessionId,
            studentUid: student.uid,
            studentName: student.fullName,
            matricNumber: student.matricNumber || 'N/A',
            courseId: course.id,
            courseCode: course.courseCode,
            courseTitle: course.courseTitle,
            checkInTime: 'N/A',
            timestamp: new Date().toISOString(),
            status: 'absent',
            isLate: false,
            verificationMethod: 'finalized_absence',
          };
          absentStudents.push(absentRecord);
        }
      }
    }

    if (absentStudents.length > 0) {
      const allAttendance = this._getLocal<AttendanceRecord>(this.collections.attendance);
      for (const rec of absentStudents) {
        if (!allAttendance.find(a => a.id === rec.id)) {
          allAttendance.push(rec);
        }
      }
      this._setLocal(this.collections.attendance, allAttendance);
    }

    this.updateSessionStatus(sessionId, 'finalized');

    this.addAuditLog({
      eventType: 'SESSION_FINALIZED',
      actorUid: session.lecturerUid,
      actorName: session.lecturerName,
      targetId: sessionId,
      metadata: `Session finalized for ${session.courseCode}. ${absentStudents.length} students marked absent.`,
    });

    return { absentCount: absentStudents.length };
  }

  // --- Audit Logs Operations ---
  public getAuditLogs(limit = 100): AuditLog[] {
    const all = this._getLocal<AuditLog>(this.collections.audit);
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  public addAuditLog({
    eventType,
    actorUid,
    actorName,
    targetId,
    metadata,
  }: {
    eventType: string;
    actorUid?: string;
    actorName?: string;
    targetId?: string;
    metadata?: string;
  }): AuditLog {
    const log: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      eventType,
      actorUid: actorUid || 'anonymous',
      actorName: actorName || 'Unknown',
      targetId: targetId || 'N/A',
      timestamp: new Date().toISOString(),
      metadata: metadata || '',
    };

    const all = this._getLocal<AuditLog>(this.collections.audit);
    all.unshift(log);
    this._setLocal(this.collections.audit, all.slice(0, 500));
    return log;
  }

  // --- Group 6 Team Roster ---
  public getTeamMembers(): TeamMember[] {
    const defaultTeamSlots: TeamMember[] = [
      { id: 1, name: 'Group 6 Member 1', matricNumber: 'FUDMA/2022/UG/ENG/XXXX', role: 'Team Lead / Full-Stack Integration', dept: 'Engineering' },
      { id: 2, name: 'Group 6 Member 2', matricNumber: 'FUDMA/2022/UG/ENG/XXXX', role: 'Firebase & Database Architecture', dept: 'Engineering' },
      { id: 3, name: 'Group 6 Member 3', matricNumber: 'FUDMA/2022/UG/ENG/XXXX', role: 'Frontend UI/UX & Responsive Design', dept: 'Engineering' },
      { id: 4, name: 'Group 6 Member 4', matricNumber: 'FUDMA/2022/UG/ENG/XXXX', role: 'QR Code Engine & Camera Scanner', dept: 'Engineering' },
      { id: 5, name: 'Group 6 Member 5', matricNumber: 'FUDMA/2022/UG/ENG/XXXX', role: 'Security Rules & Quality Assurance', dept: 'Engineering' },
    ];

    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEAM_MEMBERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading team members:', e);
    }
    return defaultTeamSlots;
  }

  public saveTeamMembers(members: TeamMember[]): void {
    localStorage.setItem(STORAGE_KEY_TEAM_MEMBERS, JSON.stringify(members));
  }

  // --- Firebase Config & Engine Mode ---
  public getEngineMode(): 'mock' | 'firebase' {
    return (localStorage.getItem(STORAGE_KEY_ENGINE_MODE) as 'mock' | 'firebase') || 'mock';
  }

  public setEngineMode(mode: 'mock' | 'firebase'): void {
    localStorage.setItem(STORAGE_KEY_ENGINE_MODE, mode);
  }

  public getFirebaseConfig(): FirebaseConfigState {
    try {
      const data = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading firebase config:', e);
    }
    return {
      apiKey: '',
      projectId: '',
      authDomain: '',
      appId: '',
      storageBucket: '',
      messagingSenderId: '',
      functionsRegion: 'us-central1',
    };
  }

  public saveFirebaseConfig(config: FirebaseConfigState, mode: 'mock' | 'firebase'): void {
    localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
    localStorage.setItem(STORAGE_KEY_ENGINE_MODE, mode);
  }
}

export const dbService = new DbService();

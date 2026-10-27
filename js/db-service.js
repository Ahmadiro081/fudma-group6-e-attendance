/**
 * FUDMA E-Attendance System - Database Service
 * Cloud Firestore & High-Fidelity Local Engine Abstraction
 * Course: GET 411 | Group 6 | Academic Session: 2026/2027
 */

const DB_STORAGE_PREFIX = 'fudma_db_';

class DbService {
  constructor() {
    this.collections = {
      users: 'users',
      courses: 'courses',
      sessions: 'lectureSessions',
      attendance: 'attendanceRecords',
      audit: 'auditLogs',
      settings: 'settings'
    };
  }

  isLiveFirestore() {
    const mode = localStorage.getItem('fudma_engine_mode_v1');
    return mode === 'firebase' && window.firebaseManager && window.firebaseManager.firestore;
  }

  isLiveSupabase() {
    const mode = localStorage.getItem('fudma_engine_mode_v1');
    if (mode === 'firebase' || mode === 'mock') {
      return false;
    }
    // If explicitly 'supabase' or default/unset
    return !!(window.supabaseBridge && window.supabaseBridge.isReady());
  }


  async _withTimeout(promise, ms = 7000, fallbackMessage = 'Firestore operation timed out') {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const err = new Error(fallbackMessage);
        err.isTimeout = true;
        reject(err);
      }, ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // --- Local Storage Helpers ---
  _getLocal(collection) {
    try {
      const data = localStorage.getItem(DB_STORAGE_PREFIX + collection);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading ${collection} from storage:`, e);
      return [];
    }
  }

  _setLocal(collection, items) {
    try {
      localStorage.setItem(DB_STORAGE_PREFIX + collection, JSON.stringify(items));
    } catch (e) {
      console.error(`Error saving ${collection} to storage:`, e);
    }
  }

  // --- Seed Initial Data ---
  initializeDefaultData() {
    const existingUsers = this._getLocal(this.collections.users);
    if (!existingUsers || existingUsers.length === 0) {
      console.log('Seeding initial FUDMA GET 411 Group 6 database records...');

      const defaultUsers = [
        {
          uid: 'admin_001',
          fullName: 'FUDMA Academic Registry Admin',
          staffId: 'FUDMA/STAFF/ADM/014',
          email: 'admin@fudma.edu.ng',
          role: 'admin',
          department: 'Academic Affairs Division',
          status: 'active',
          createdAt: '2026-09-01T08:00:00Z'
        },
        {
          uid: 'lecturer_nura',
          fullName: 'Malam Nura Muhammad',
          staffId: 'FUDMA/STAFF/ENG/082',
          email: 'nura.muhammad@fudma.edu.ng',
          role: 'lecturer',
          department: 'Computer & Engineering Sciences',
          status: 'active',
          createdAt: '2026-09-01T08:30:00Z'
        },
        {
          uid: 'student_001',
          fullName: 'Nura HAMZA MASARI',
          matricNumber: 'ENG/2025/37401',
          email: 'nura.masari@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:00:00Z'
        },
        {
          uid: 'student_002',
          fullName: 'Abdullahi Nuhu',
          matricNumber: 'ENG/2024/31912',
          email: 'abdullahi.nuhu@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:05:00Z'
        },
        {
          uid: 'student_003',
          fullName: 'Adamu Jibril',
          matricNumber: 'ENG/2024/32388',
          email: 'adamu.jibril@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:10:00Z'
        },
        {
          uid: 'student_004',
          fullName: 'Dahiru Umar Karofi',
          matricNumber: 'ENG/2024/34360',
          email: 'dahiru.karofi@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:15:00Z'
        },
        {
          uid: 'student_005',
          fullName: 'OLOYEDE PROMISE ISSAC',
          matricNumber: 'ENG/2024/35303',
          email: 'oloyede.promise@fudma.edu.ng',
          role: 'student',
          department: 'Mechatronics',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:20:00Z'
        },
        {
          uid: 'student_006',
          fullName: 'TAIYE JOHN OLONITOLA',
          matricNumber: 'ENG/2024/34750',
          email: 'taiye.olonitola@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:25:00Z'
        },
        {
          uid: 'student_007',
          fullName: 'BAKIR MUHAMMAD MUSTAPHA',
          matricNumber: 'ENG/2024/35485',
          email: 'bakir.mustapha@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:30:00Z'
        }
      ];
      this._setLocal(this.collections.users, defaultUsers);

      const defaultCourses = [
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
            'student_006',
            'student_007'
          ],
          createdAt: '2026-09-05T09:00:00Z'
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
          enrolledStudentIds: [
            'student_001',
            'student_002',
            'student_003',
            'student_004',
            'student_005',
            'student_006',
            'student_007'
          ],
          createdAt: '2026-09-05T09:30:00Z'
        }
      ];
      this._setLocal(this.collections.courses, defaultCourses);

      const today = new Date().toISOString().split('T')[0];
      const defaultSessions = [
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
          createdAt: new Date().toISOString()
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
          createdAt: '2026-10-15T08:00:00Z'
        }
      ];
      this._setLocal(this.collections.sessions, defaultSessions);

      const defaultAttendance = [
        {
          id: 'session_past_01_student_001',
          lectureSessionId: 'session_past_01',
          studentUid: 'student_001',
          studentName: 'Nura HAMZA MASARI',
          matricNumber: 'ENG/2025/37401',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          checkInTime: '08:08:24',
          timestamp: '2026-10-15T08:08:24Z',
          status: 'present',
          isLate: false,
          verificationMethod: 'qr_scan'
        },
        {
          id: 'session_past_01_student_002',
          lectureSessionId: 'session_past_01',
          studentUid: 'student_002',
          studentName: 'Abdullahi Nuhu',
          matricNumber: 'ENG/2024/31912',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          checkInTime: '08:19:10',
          timestamp: '2026-10-15T08:19:10Z',
          status: 'late',
          isLate: true,
          verificationMethod: 'qr_scan'
        },
        {
          id: 'session_past_01_student_003',
          lectureSessionId: 'session_past_01',
          studentUid: 'student_003',
          studentName: 'Adamu Jibril',
          matricNumber: 'ENG/2024/32388',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          checkInTime: '08:05:00',
          timestamp: '2026-10-15T08:05:00Z',
          status: 'present',
          isLate: false,
          verificationMethod: 'manual_code'
        },
        {
          id: 'session_past_01_student_004',
          lectureSessionId: 'session_past_01',
          studentUid: 'student_004',
          studentName: 'Dahiru Umar Karofi',
          matricNumber: 'ENG/2024/34360',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          checkInTime: '08:12:00',
          timestamp: '2026-10-15T08:12:00Z',
          status: 'present',
          isLate: false,
          verificationMethod: 'qr_scan'
        },
        {
          id: 'session_past_01_student_005',
          lectureSessionId: 'session_past_01',
          studentUid: 'student_005',
          studentName: 'OLOYEDE PROMISE ISSAC',
          matricNumber: 'ENG/2024/35303',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          checkInTime: '08:06:45',
          timestamp: '2026-10-15T08:06:45Z',
          status: 'present',
          isLate: false,
          verificationMethod: 'qr_scan'
        },
        {
          id: 'session_past_01_student_006',
          lectureSessionId: 'session_past_01',
          studentUid: 'student_006',
          studentName: 'TAIYE JOHN OLONITOLA',
          matricNumber: 'ENG/2024/34750',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          checkInTime: '08:21:30',
          timestamp: '2026-10-15T08:21:30Z',
          status: 'late',
          isLate: true,
          verificationMethod: 'qr_scan'
        },
        {
          id: 'session_past_01_student_007',
          lectureSessionId: 'session_past_01',
          studentUid: 'student_007',
          studentName: 'BAKIR MUHAMMAD MUSTAPHA',
          matricNumber: 'ENG/2024/35485',
          courseId: 'course_get411',
          courseCode: 'GET 411',
          checkInTime: '08:04:12',
          timestamp: '2026-10-15T08:04:12Z',
          status: 'present',
          isLate: false,
          verificationMethod: 'manual_code'
        }
      ];
      this._setLocal(this.collections.attendance, defaultAttendance);

      const defaultAudit = [
        {
          id: 'audit_001',
          eventType: 'SYSTEM_INITIALIZATION',
          actorUid: 'admin_001',
          actorName: 'Registry Admin',
          targetId: 'academic_session_2026_2027',
          timestamp: new Date().toISOString(),
          metadata: 'System seeded with FUDMA GET 411 Group 6 parameters.'
        }
      ];
      this._setLocal(this.collections.audit, defaultAudit);
    }

    // Migration Sync: Ensure any existing browser session with old mock users is updated to the official 7 students
    const storedUsers = this._getLocal(this.collections.users);
    if (storedUsers && storedUsers.length > 0 && !storedUsers.some(u => (u.matricNumber || '').toUpperCase().includes('35303'))) {
      const nonStudents = storedUsers.filter(u => u.role !== 'student');
      const updatedStudents = [
        {
          uid: 'student_001',
          fullName: 'Nura HAMZA MASARI',
          matricNumber: 'ENG/2025/37401',
          email: 'nura.masari@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:00:00Z'
        },
        {
          uid: 'student_002',
          fullName: 'Abdullahi Nuhu',
          matricNumber: 'ENG/2024/31912',
          email: 'abdullahi.nuhu@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:05:00Z'
        },
        {
          uid: 'student_003',
          fullName: 'Adamu Jibril',
          matricNumber: 'ENG/2024/32388',
          email: 'adamu.jibril@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:10:00Z'
        },
        {
          uid: 'student_004',
          fullName: 'Dahiru Umar Karofi',
          matricNumber: 'ENG/2024/34360',
          email: 'dahiru.karofi@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:15:00Z'
        },
        {
          uid: 'student_005',
          fullName: 'OLOYEDE PROMISE ISSAC',
          matricNumber: 'ENG/2024/35303',
          email: 'oloyede.promise@fudma.edu.ng',
          role: 'student',
          department: 'Mechatronics',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:20:00Z'
        },
        {
          uid: 'student_006',
          fullName: 'TAIYE JOHN OLONITOLA',
          matricNumber: 'ENG/2024/34750',
          email: 'taiye.olonitola@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:25:00Z'
        },
        {
          uid: 'student_007',
          fullName: 'BAKIR MUHAMMAD MUSTAPHA',
          matricNumber: 'ENG/2024/35485',
          email: 'bakir.mustapha@fudma.edu.ng',
          role: 'student',
          department: 'Engineering',
          level: '400L',
          status: 'active',
          createdAt: '2026-09-02T10:30:00Z'
        }
      ];
      this._setLocal(this.collections.users, [...nonStudents, ...updatedStudents]);

      // Ensure courses enroll all 7 students
      const storedCourses = this._getLocal(this.collections.courses);
      if (storedCourses && storedCourses.length > 0) {
        const studentIds = ['student_001', 'student_002', 'student_003', 'student_004', 'student_005', 'student_006', 'student_007'];
        storedCourses.forEach(c => {
          c.enrolledStudentIds = Array.from(new Set([...(c.enrolledStudentIds || []), ...studentIds]));
        });
        this._setLocal(this.collections.courses, storedCourses);
      }
    }

    // Ensure Oloyede Promise Issac department is updated to Mechatronics in stored users
    const currentUsers = this._getLocal(this.collections.users);
    if (currentUsers && currentUsers.length > 0) {
      let updatedUser = false;
      currentUsers.forEach(u => {
        if ((u.matricNumber || '').toUpperCase().includes('35303') && u.department !== 'Mechatronics') {
          u.department = 'Mechatronics';
          updatedUser = true;
        }
      });
      if (updatedUser) {
        this._setLocal(this.collections.users, currentUsers);
      }
    }
  }

  // --- Users Operations ---
  async getUsers(role = null) {
    if (this.isLiveSupabase()) {
      try {
        return await window.supabaseBridge.getUsers(role);
      } catch (err) {
        console.warn('Supabase fetch users failed, falling back to local DB:', err);
      }
    }
    if (this.isLiveFirestore()) {
      try {
        let query = window.firebaseManager.firestore.collection(this.collections.users);
        if (role) query = query.where('role', '==', role);
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn('Firestore fetch users failed, falling back to local DB:', err);
      }
    }
    const all = this._getLocal(this.collections.users);
    return role ? all.filter(u => u.role === role) : all;
  }

  async getUserById(uid) {
    if (this.isLiveSupabase()) {
      try {
        const user = await window.supabaseBridge.getUserById(uid);
        if (user) return user;
      } catch (err) {
        console.warn('Supabase fetch user failed:', err);
      }
    }
    if (this.isLiveFirestore()) {
      try {
        const doc = await window.firebaseManager.firestore.collection(this.collections.users).doc(uid).get();
        if (doc.exists) return { uid: doc.id, ...doc.data() };
      } catch (err) {
        console.warn('Firestore fetch user failed:', err);
      }
    }
    const all = this._getLocal(this.collections.users);
    return all.find(u => u.uid === uid) || null;
  }

  async getUserByEmail(email) {
    if (this.isLiveSupabase()) {
      try {
        const user = await window.supabaseBridge.getUserByEmail(email);
        if (user) return user;
      } catch (err) {
        console.warn('Supabase getUserByEmail failed:', err);
      }
    }
    if (this.isLiveFirestore()) {
      try {
        const snap = await window.firebaseManager.firestore.collection(this.collections.users)
          .where('email', '==', email.toLowerCase().trim()).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          return { uid: doc.id, ...doc.data() };
        }
      } catch (err) {
        console.warn('Firestore getUserByEmail failed:', err);
      }
    }
    const all = this._getLocal(this.collections.users);
    return all.find(u => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
  }

  async getUserByMatricNumber(matric) {
    if (!matric) return null;
    if (this.isLiveSupabase()) {
      try {
        const user = await window.supabaseBridge.getUserByMatricNumber(matric);
        if (user) return user;
      } catch (err) {
        console.warn('Supabase getUserByMatricNumber failed:', err);
      }
    }
    const cleanMatric = matric.trim().toUpperCase().replace(/\s+/g, '');
    if (this.isLiveFirestore()) {
      try {
        // Query Firestore by exact matricNumber
        const snap = await window.firebaseManager.firestore.collection(this.collections.users)
          .where('matricNumber', '==', matric.trim()).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          return { uid: doc.id, ...doc.data() };
        }
      } catch (err) {
        console.warn('Firestore getUserByMatricNumber failed:', err);
      }
    }
    const all = this._getLocal(this.collections.users);
    return all.find(u => {
      const uMatric = (u.matricNumber || '').trim().toUpperCase().replace(/\s+/g, '');
      return uMatric === cleanMatric;
    }) || null;
  }

  async saveUser(userData) {
    if (this.isLiveSupabase()) {
      return await window.supabaseBridge.saveUser(userData);
    }
    const uid = userData.uid || 'usr_' + Date.now();
    const user = {
      ...userData,
      uid,
      status: userData.status || 'active',
      createdAt: userData.createdAt || new Date().toISOString()
    };


    if (this.isLiveFirestore()) {
      try {
        await window.firebaseManager.firestore.collection(this.collections.users).doc(uid).set(user, { merge: true });
      } catch (err) {
        console.error('[DbService] Firestore save user failed:', err);
        throw new Error(`Cloud user write failed: ${err.message || 'Permission denied'}`);
      }
    }

    const all = this._getLocal(this.collections.users);
    const idx = all.findIndex(u => u.uid === uid);
    if (idx >= 0) all[idx] = { ...all[idx], ...user };
    else all.push(user);
    this._setLocal(this.collections.users, all);

    try {
      await this.addAuditLog({
        eventType: 'USER_SAVED',
        actorUid: window.authService?.currentUser?.uid || 'system',
        actorName: window.authService?.currentUser?.fullName || 'System',
        targetId: uid,
        metadata: `Saved account for ${user.fullName} (${user.role})`
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    return user;
  }

  // --- Courses Operations ---
  async getCourses(lecturerUid = null) {
    if (this.isLiveSupabase()) {
      try {
        return await window.supabaseBridge.getCourses(lecturerUid);
      } catch (err) {
        console.warn('Supabase fetch courses failed, falling back:', err);
      }
    }
    if (this.isLiveFirestore()) {
      try {
        let query = window.firebaseManager.firestore.collection(this.collections.courses);
        if (lecturerUid) query = query.where('lecturerUid', '==', lecturerUid);
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn('Firestore getCourses failed:', err);
      }
    }
    const all = this._getLocal(this.collections.courses);
    return lecturerUid ? all.filter(c => c.lecturerUid === lecturerUid) : all;
  }

  async getCourseById(courseId) {
    if (this.isLiveSupabase()) {
      try {
        const c = await window.supabaseBridge.getCourseById(courseId);
        if (c) return c;
      } catch (err) {
        console.warn('Supabase getCourseById failed:', err);
      }
    }
    if (this.isLiveFirestore()) {
      try {
        const doc = await window.firebaseManager.firestore.collection(this.collections.courses).doc(courseId).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
      } catch (err) {
        console.warn('Firestore getCourseById failed:', err);
      }
    }
    const all = this._getLocal(this.collections.courses);
    return all.find(c => c.id === courseId) || null;
  }

  async saveCourse(courseData) {
    if (this.isLiveSupabase()) {
      return await window.supabaseBridge.saveCourse(courseData);
    }
    const id = courseData.id || 'course_' + Date.now();
    const course = {
      ...courseData,
      id,
      enrolledStudentIds: courseData.enrolledStudentIds || [],
      createdAt: courseData.createdAt || new Date().toISOString()
    };

    if (this.isLiveFirestore()) {
      try {
        await window.firebaseManager.firestore.collection(this.collections.courses).doc(id).set(course, { merge: true });
      } catch (err) {
        console.error('[DbService] Firestore saveCourse failed:', err);
        throw new Error(`Cloud course write failed: ${err.message || 'Permission denied'}`);
      }
    }

    const all = this._getLocal(this.collections.courses);
    const idx = all.findIndex(c => c.id === id);
    if (idx >= 0) all[idx] = { ...all[idx], ...course };
    else all.push(course);
    this._setLocal(this.collections.courses, all);

    try {
      await this.addAuditLog({
        eventType: 'COURSE_SAVED',
        actorUid: window.authService?.currentUser?.uid || 'system',
        actorName: window.authService?.currentUser?.fullName || 'System',
        targetId: id,
        metadata: `Saved course ${course.courseCode} - ${course.courseTitle}`
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    return course;
  }

  // --- Lecture Sessions Operations ---
  async getSessions(filterCourseId = null, filterLecturerUid = null) {
    if (this.isLiveSupabase()) {
      try {
        return await window.supabaseBridge.getSessions(filterCourseId, filterLecturerUid);
      } catch (err) {
        console.warn('Supabase getSessions failed, falling back:', err);
      }
    }
    if (this.isLiveFirestore()) {
      try {
        let query = window.firebaseManager.firestore.collection(this.collections.sessions);
        if (filterCourseId) query = query.where('courseId', '==', filterCourseId);
        if (filterLecturerUid) query = query.where('lecturerUid', '==', filterLecturerUid);
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn('Firestore getSessions failed:', err);
      }
    }
    const all = this._getLocal(this.collections.sessions);
    if (filterCourseId) all = all.filter(s => s.courseId === filterCourseId);
    if (filterLecturerUid) all = all.filter(s => s.lecturerUid === filterLecturerUid);
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getSessionById(sessionId) {
    if (this.isLiveSupabase()) {
      try {
        const s = await window.supabaseBridge.getSessionById(sessionId);
        if (s) return s;
      } catch (err) {
        console.warn('Supabase getSessionById failed:', err);
      }
    }
    if (this.isLiveFirestore()) {
      try {
        const doc = await window.firebaseManager.firestore.collection(this.collections.sessions).doc(sessionId).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
      } catch (err) {
        console.warn('Firestore getSessionById failed:', err);
      }
    }
    const all = this._getLocal(this.collections.sessions);
    return all.find(s => s.id === sessionId) || null;
  }

  async saveSession(sessionData) {
    if (this.isLiveSupabase()) {
      return await window.supabaseBridge.saveSession(sessionData);
    }
    const id = sessionData.id || 'session_' + Date.now();
    const session = {
      ...sessionData,
      id,
      status: sessionData.status || 'active',
      createdAt: sessionData.createdAt || new Date().toISOString()
    };

    if (this.isLiveFirestore()) {
      try {
        await window.firebaseManager.firestore.collection(this.collections.sessions).doc(id).set(session, { merge: true });
      } catch (err) {
        console.error('[DbService] Firestore saveSession failed:', err);
        throw new Error(`Cloud session write failed: ${err.message || 'Permission denied'}`);
      }
    }

    const all = this._getLocal(this.collections.sessions);
    const idx = all.findIndex(s => s.id === id);
    if (idx >= 0) all[idx] = { ...all[idx], ...session };
    else all.unshift(session);
    this._setLocal(this.collections.sessions, all);

    try {
      await this.addAuditLog({
        eventType: 'SESSION_SAVED',
        actorUid: window.authService?.currentUser?.uid || session.lecturerUid,
        actorName: window.authService?.currentUser?.fullName || session.lecturerName,
        targetId: id,
        metadata: `Session ${session.status} for ${session.courseCode}`
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }

    return session;
  }

  async updateSessionStatus(sessionId, status) {
    if (this.isLiveSupabase()) {
      return await window.supabaseBridge.updateSessionStatus(sessionId, status);
    }
    const session = await this.getSessionById(sessionId);
    if (!session) throw new Error('Session not found');
    session.status = status;
    return this.saveSession(session);
  }

  // --- Attendance Operations & Atomic Validation ---
  async getAttendance(filterSessionId = null, filterStudentUid = null) {
    if (this.isLiveSupabase()) {
      try {
        return await window.supabaseBridge.getAttendance(filterSessionId, filterStudentUid);
      } catch (err) {
        console.warn('Supabase getAttendance failed:', err);
      }
    }
    if (this.isLiveFirestore()) {
      try {
        let query = window.firebaseManager.firestore.collection(this.collections.attendance);
        if (filterSessionId) query = query.where('lectureSessionId', '==', filterSessionId);
        if (filterStudentUid) query = query.where('studentUid', '==', filterStudentUid);
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn('Firestore getAttendance failed:', err);
      }
    }
    let all = this._getLocal(this.collections.attendance);
    if (filterSessionId) all = all.filter(a => a.lectureSessionId === filterSessionId);
    if (filterStudentUid) all = all.filter(a => a.studentUid === filterStudentUid);
    return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }


  /**
   * Trusted Attendance Recorder with Atomic Duplicate Prevention
   * Enforces:
   * 1. In live mode: authenticated Firebase user matches submitted student UID.
   * 2. Session must exist and be 'active'.
   * 3. Session must not have passed its configured closeTime.
   * 4. Student must be registered for course.
   * 5. Student must NOT have already checked in (Compound doc ID: `${sessionId}_${studentUid}`).
   * 6. Live mode writes strictly to Cloud Firestore; never falls back to localStorage on failure.
   * 7. Timeouts are treated as uncertain outcomes requiring verification, not fake successes.
   */
  async recordAttendanceSubmission({ sessionId, studentUid, verificationMethod = 'qr_scan', manualCode = null, qrToken = null }) {
    if (this.isLiveSupabase()) {
      return await window.supabaseBridge.recordAttendanceSubmission({
        sessionId,
        verificationMethod,
        manualCode,
        qrToken
      });
    }

    // 1. In live Firebase mode, verify authenticated user identity matches studentUid
    if (this.isLiveFirestore()) {
      const fbUser = window.firebaseManager.auth ? window.firebaseManager.auth.currentUser : null;
      if (!fbUser) {
        throw new Error('Authentication required: No active Firebase Authentication session was found. Please sign in again.');
      }
      if (fbUser.uid !== studentUid) {
        throw new Error('Security identity mismatch: Submitted student UID does not match authenticated Firebase user identity.');
      }
    }

    // 2. Fetch Session
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Lecture session does not exist or has expired.');
    }

    if (session.status !== 'active') {
      if (session.status === 'paused') {
        throw new Error('Attendance session is currently PAUSED by the lecturer. Please wait.');
      }
      throw new Error('This attendance session is CLOSED and is no longer accepting submissions.');
    }

    // 3. Check Session Closing Time
    const now = new Date();
    const currentTimeStr = now.toTimeString().substring(0, 5); // "HH:MM"
    const currentDateStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"

    if (session.closeTime) {
      const isPastDate = session.date && currentDateStr > session.date;
      const isPastTimeSameDay = (!session.date || currentDateStr === session.date) && currentTimeStr > session.closeTime;
      if (isPastDate || isPastTimeSameDay) {
        throw new Error(`The attendance window for this lecture closed at ${session.closeTime}. Submissions are no longer accepted.`);
      }
    }

    // 4. Fetch Student Profile
    const student = await this.getUserById(studentUid);
    if (!student || student.role !== 'student') {
      throw new Error('Invalid student identity. Only authenticated students may register attendance.');
    }
    if (student.status === 'deactivated') {
      throw new Error('Student account has been deactivated by administrator.');
    }

    // 5. Fetch Course and check Enrollment
    const course = await this.getCourseById(session.courseId);
    if (!course) {
      throw new Error('Associated course record was not found.');
    }

    const isEnrolled = course.enrolledStudentIds && course.enrolledStudentIds.includes(studentUid);
    if (!isEnrolled) {
      throw new Error(`You are not registered for ${course.courseCode} (${course.courseTitle}). Attendance cannot be recorded.`);
    }

    // 6. Compound Document ID for atomic uniqueness
    const compoundDocId = `${sessionId}_${studentUid}`;

    // 7. Calculate late arrival based on late threshold
    // (Note: Client-direct architecture evaluates this in client JS; see documented architectural limitations)
    const isLate = session.lateThreshold ? (currentTimeStr >= session.lateThreshold) : false;
    const status = isLate ? 'late' : 'present';

    // 8. Live Cloud Firestore write with atomic transaction
    if (this.isLiveFirestore()) {
      const firestore = window.firebaseManager.firestore;
      const recordRef = firestore.collection(this.collections.attendance).doc(compoundDocId);

      let liveRecord;
      try {
        liveRecord = await this._withTimeout(
          firestore.runTransaction(async (transaction) => {
            const docSnap = await transaction.get(recordRef);
            if (docSnap.exists) {
              const dupErr = new Error('Your attendance has already been recorded for this lecture.');
              dupErr.isDuplicate = true;
              throw dupErr;
            }

            const newRecord = {
              id: compoundDocId,
              lectureSessionId: sessionId,
              studentUid: student.uid,
              studentName: student.fullName,
              matricNumber: student.matricNumber || 'N/A',
              courseId: course.id,
              courseCode: course.courseCode,
              courseTitle: course.courseTitle,
              checkInTime: now.toLocaleTimeString(),
              timestamp: new Date().toISOString(),
              status: status,
              isLate: isLate,
              verificationMethod: verificationMethod
            };

            transaction.set(recordRef, newRecord);
            return newRecord;
          }),
          7000,
          'ATTENDANCE_TIMEOUT'
        );
      } catch (txErr) {
        if (txErr.isDuplicate || (txErr.message && txErr.message.includes('already been recorded'))) {
          throw new Error('Your attendance has already been recorded for this lecture.');
        }
        if (txErr.isTimeout || txErr.message === 'ATTENDANCE_TIMEOUT') {
          // Treat timeout as uncertain outcome - DO NOT fallback to localStorage and claim success!
          throw new Error('Attendance request timed out. The server outcome is uncertain. Please check your network connection and verify your attendance roster before retrying.');
        }
        console.error('[DbService] Firestore attendance transaction rejected:', txErr);
        // Explicitly NEVER write failed cloud attendance to localStorage and report success
        throw new Error(`Official cloud attendance submission failed: ${txErr.message || 'Permission denied or network failure'}`);
      }

      if (liveRecord) {
        // Sync with local memory cache only after cloud success confirmed
        const allAttendance = this._getLocal(this.collections.attendance);
        if (!allAttendance.find(a => a.id === compoundDocId)) {
          allAttendance.unshift(liveRecord);
          this._setLocal(this.collections.attendance, allAttendance);
        }
        try {
          await this.addAuditLog({
            eventType: 'ATTENDANCE_RECORDED',
            actorUid: student.uid,
            actorName: student.fullName,
            targetId: compoundDocId,
            metadata: `Status: ${liveRecord.status.toUpperCase()} (${liveRecord.isLate ? 'Late' : 'On-time'}) for ${course.courseCode}`
          });
        } catch (e) {
          console.warn('[DbService] Audit log write notice:', e);
        }
        return liveRecord;
      }
    }

    // 9. Local DB Atomic Simulation (Explicit Presentation Demo Mode ONLY)
    const allAttendance = this._getLocal(this.collections.attendance);
    const existing = allAttendance.find(a => a.id === compoundDocId);
    if (existing) {
      throw new Error('Your attendance has already been recorded for this lecture.');
    }

    const newRecord = {
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
      status: status,
      isLate: isLate,
      verificationMethod: verificationMethod
    };

    allAttendance.unshift(newRecord);
    this._setLocal(this.collections.attendance, allAttendance);

    try {
      await this.addAuditLog({
        eventType: 'ATTENDANCE_RECORDED',
        actorUid: student.uid,
        actorName: student.fullName,
        targetId: compoundDocId,
        metadata: `Status: ${status.toUpperCase()} (${isLate ? 'Late' : 'On-time'}) for ${course.courseCode}`
      });
    } catch (e) {
      console.warn('[DbService] Audit log write notice:', e);
    }

    return newRecord;
  }

  /**
   * Finalize Session: Marks all registered students who did not check in as ABSENT.
   * As specified: "Do not mark a student absent merely because they have not checked in
   * while the session is still open. Red: Absent, where the lecturer has finalized the session."
   */
  async finalizeSessionAbsences(sessionId) {
    if (this.isLiveSupabase()) {
      return await window.supabaseBridge.finalizeSession(sessionId);
    }

    const session = await this.getSessionById(sessionId);
    if (!session) throw new Error('Session not found');

    const course = await this.getCourseById(session.courseId);
    if (!course) throw new Error('Course not found');

    const existingAttendance = await this.getAttendance(sessionId);
    const attendedStudentUids = new Set(existingAttendance.map(a => a.studentUid));

    const absentStudents = [];
    const allUsers = await this.getUsers('student');

    for (const studentUid of course.enrolledStudentIds || []) {
      if (!attendedStudentUids.has(studentUid)) {
        const student = allUsers.find(u => u.uid === studentUid);
        if (student) {
          const compoundDocId = `${sessionId}_${studentUid}`;
          const absentRecord = {
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
            verificationMethod: 'finalized_absence'
          };
          absentStudents.push(absentRecord);
        }
      }
    }

    if (absentStudents.length > 0) {
      const allAttendance = this._getLocal(this.collections.attendance);
      for (const rec of absentStudents) {
        if (!allAttendance.find(a => a.id === rec.id)) {
          allAttendance.push(rec);
        }
      }
      this._setLocal(this.collections.attendance, allAttendance);

      if (this.isLiveFirestore()) {
        try {
          const batch = window.firebaseManager.firestore.batch();
          for (const rec of absentStudents) {
            const ref = window.firebaseManager.firestore.collection(this.collections.attendance).doc(rec.id);
            batch.set(ref, rec, { merge: true });
          }
          await batch.commit();
        } catch (err) {
          console.warn('Batch write of absences to Firestore failed:', err);
        }
      }
    }

    await this.updateSessionStatus(sessionId, 'finalized');

    await this.addAuditLog({
      eventType: 'SESSION_FINALIZED',
      actorUid: session.lecturerUid,
      actorName: session.lecturerName,
      targetId: sessionId,
      metadata: `Session finalized for ${session.courseCode}. ${absentStudents.length} students marked absent.`
    });

    return { absentCount: absentStudents.length };
  }

  // --- Audit Logs Operations ---
  async getAuditLogs(limit = 100) {
    if (this.isLiveSupabase()) {
      try {
        return await window.supabaseBridge.getAuditLogs(limit);
      } catch (err) {
        console.warn('Supabase getAuditLogs failed:', err);
      }
    }
    if (this.isLiveFirestore()) {
      try {
        const snapshot = await window.firebaseManager.firestore.collection(this.collections.audit)
          .orderBy('timestamp', 'desc').limit(limit).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn('Firestore getAuditLogs failed:', err);
      }
    }
    const all = this._getLocal(this.collections.audit);
    return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  }

  async addAuditLog({ eventType, actorUid, actorName, targetId, metadata }) {
    const log = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      eventType,
      actorUid: actorUid || 'anonymous',
      actorName: actorName || 'Unknown',
      targetId: targetId || 'N/A',
      timestamp: new Date().toISOString(),
      metadata: metadata || ''
    };

    if (this.isLiveSupabase()) {
      try {
        await window.supabaseBridge.addAuditLog(log);
      } catch (err) {
        console.warn('Supabase addAuditLog warning:', err);
      }
    }

    if (this.isLiveFirestore()) {
      try {
        await window.firebaseManager.firestore.collection(this.collections.audit).doc(log.id).set(log);
      } catch (err) {
        console.warn('Firestore addAuditLog failed:', err);
      }
    }

    const all = this._getLocal(this.collections.audit);
    all.unshift(log);
    this._setLocal(this.collections.audit, all.slice(0, 500)); // retain latest 500
    return log;
  }
}

const dbService = new DbService();
window.dbService = dbService;

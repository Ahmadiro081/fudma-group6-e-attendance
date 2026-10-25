/**
 * FUDMA Group 6 E-Attendance System
 * Supabase Service Bridge
 *
 * Course: GET 411
 * Academic Session: 2026/2027
 * Institution: Federal University Dutsin-Ma (FUDMA), Nigeria
 *
 * Maps frontend controllers to the confirmed Supabase schema:
 * 1. profiles
 * 2. courses
 * 3. course_enrollments
 * 4. lecture_sessions
 * 5. attendance_records
 * 6. audit_logs
 *
 * IMPORTANT:
 * This bridge uses the actual database column names.
 * Secure attendance RPCs must be created and verified separately.
 */

class SupabaseBridge {
  constructor() {}

  // =========================================================
  // CLIENT HELPERS
  // =========================================================

  getClient() {
    return window.supabaseClient;
  }

  isReady() {
    const client = this.getClient();

    return !!(
      client &&
      typeof client.from === 'function'
    );
  }

  _requireClient() {
    const client = this.getClient();

    if (!client) {
      throw new Error(
        'Supabase client is not initialized.'
      );
    }

    return client;
  }

  _throwDatabaseError(operation, error) {
    console.error(
      `[SupabaseBridge] ${operation} failed:`,
      error
    );

    throw new Error(
      error?.message ||
      `${operation} failed. Please check the Supabase database schema and permissions.`
    );
  }

  // =========================================================
  // PROFILE / USER HELPERS
  // =========================================================

  _mapProfileToUser(profile) {
    if (!profile) {
      return null;
    }

    return {
      uid: profile.id,
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      role: profile.role,
      department: profile.department,
      status: profile.status,
      matricNumber: profile.matric_number || null,
      level: profile.level || '400L',
      staffId: profile.staff_id || null,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };
  }

  async getUsers(role = null) {
    const client = this._requireClient();

    let query = client
      .from('profiles')
      .select('*');

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) {
      this._throwDatabaseError(
        'getUsers',
        error
      );
    }

    return (data || []).map(profile =>
      this._mapProfileToUser(profile)
    );
  }

  async getUserById(uid) {
    const client = this.getClient();

    if (!client || !uid) {
      return null;
    }

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error) {
      this._throwDatabaseError(
        'getUserById',
        error
      );
    }

    return this._mapProfileToUser(data);
  }

  async getUserByEmail(email) {
    const client = this.getClient();

    if (!client || !email) {
      return null;
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      this._throwDatabaseError(
        'getUserByEmail',
        error
      );
    }

    return this._mapProfileToUser(data);
  }

  async getUserByMatricNumber(matricNumber) {
    const client = this.getClient();

    if (!client || !matricNumber) {
      return null;
    }

    const normalizedMatric = matricNumber
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .ilike(
        'matric_number',
        normalizedMatric
      )
      .maybeSingle();

    if (error) {
      this._throwDatabaseError(
        'getUserByMatricNumber',
        error
      );
    }

    return this._mapProfileToUser(data);
  }

  async saveUser(userData) {
    const client = this._requireClient();

    if (!userData) {
      throw new Error(
        'User information is required.'
      );
    }

    const uid = userData.uid || userData.id;

    const profilePayload = {
      full_name: userData.fullName,
      email: (userData.email || '')
        .trim()
        .toLowerCase(),
      role: userData.role || 'student',
      department:
        userData.department ||
        'Faculty of Engineering',
      status: userData.status || 'active',
      matric_number: userData.matricNumber
        ? userData.matricNumber
            .trim()
            .toUpperCase()
        : null,
      staff_id: userData.staffId
        ? userData.staffId
            .trim()
            .toUpperCase()
        : null,
      level: userData.level || '400L',
      updated_at: new Date().toISOString()
    };

    if (uid) {
      profilePayload.id = uid;
    }

    const { data, error } = await client
      .from('profiles')
      .upsert(profilePayload)
      .select()
      .single();

    if (error) {
      this._throwDatabaseError(
        'saveUser',
        error
      );
    }

    return this._mapProfileToUser(data);
  }

  // =========================================================
  // COURSE HELPERS
  // =========================================================

  _mapCourse(course, enrolledStudentIds = []) {
    if (!course) {
      return null;
    }

    return {
      id: course.id,
      courseCode: course.course_code,
      courseTitle: course.course_title,

      // These fields are not present in the confirmed schema.
      creditUnits: course.credit_units ?? null,
      department: course.department ?? null,

      academicSession: course.academic_session,
      semester: course.semester,

      lecturerUid: course.lecturer_uid || null,

      enrolledStudentIds,

      createdAt: course.created_at,
      updatedAt: course.updated_at
    };
  }

  async getCourses(lecturerId = null) {
    const client = this._requireClient();

    let query = client
      .from('courses')
      .select(`
        *,
        course_enrollments (
          student_uid
        )
      `);

    if (lecturerId) {
      query = query.eq(
        'lecturer_uid',
        lecturerId
      );
    }

    const { data, error } = await query;

    if (error) {
      this._throwDatabaseError(
        'getCourses',
        error
      );
    }

    return (data || []).map(course => {
      const enrolledStudentIds = (
        course.course_enrollments || []
      ).map(enrollment =>
        enrollment.student_uid
      );

      return this._mapCourse(
        course,
        enrolledStudentIds
      );
    });
  }

  async getCourseById(courseId) {
    const client = this.getClient();

    if (!client || !courseId) {
      return null;
    }

    const { data, error } = await client
      .from('courses')
      .select(`
        *,
        course_enrollments (
          student_uid
        )
      `)
      .eq('id', courseId)
      .maybeSingle();

    if (error) {
      this._throwDatabaseError(
        'getCourseById',
        error
      );
    }

    if (!data) {
      return null;
    }

    const enrolledStudentIds = (
      data.course_enrollments || []
    ).map(enrollment =>
      enrollment.student_uid
    );

    return this._mapCourse(
      data,
      enrolledStudentIds
    );
  }

  async saveCourse(courseData) {
    const client = this._requireClient();

    if (!courseData) {
      throw new Error(
        'Course information is required.'
      );
    }

    const coursePayload = {
      course_code: (
        courseData.courseCode || ''
      ).trim().toUpperCase(),

      course_title: (
        courseData.courseTitle || ''
      ).trim(),

      lecturer_uid:
        courseData.lecturerUid || null,

      academic_session:
        courseData.academicSession ||
        '2026/2027',

      semester:
        courseData.semester ||
        'First Semester'
    };

    if (
      !coursePayload.course_code ||
      !coursePayload.course_title
    ) {
      throw new Error(
        'Course code and course title are required.'
      );
    }

    // Only use an existing database UUID when supplied.
    if (courseData.id) {
      coursePayload.id = courseData.id;
    }

    let query;

    if (courseData.id) {
      query = client
        .from('courses')
        .update(coursePayload)
        .eq('id', courseData.id);
    } else {
      query = client
        .from('courses')
        .insert(coursePayload);
    }

    const { data, error } = await query
      .select()
      .single();

    if (error) {
      this._throwDatabaseError(
        'saveCourse',
        error
      );
    }

    const courseId = data.id;

    // Enrollment uses the actual student_uid column.
    if (
      Array.isArray(
        courseData.enrolledStudentIds
      )
    ) {
      const studentIds =
        courseData.enrolledStudentIds;

      if (studentIds.length > 0) {
        const enrollmentRows = studentIds.map(
          studentUid => ({
            course_id: courseId,
            student_uid: studentUid
          })
        );

        const { error: enrollmentError } =
          await client
            .from('course_enrollments')
            .upsert(enrollmentRows, {
              onConflict:
                'course_id,student_uid'
            });

        if (enrollmentError) {
          this._throwDatabaseError(
            'saveCourse enrollments',
            enrollmentError
          );
        }
      }
    }

    return this.getCourseById(courseId);
  }

  // =========================================================
  // LECTURE SESSION HELPERS
  // =========================================================

  _mapSession(session) {
    if (!session) {
      return null;
    }

    return {
      id: session.id,

      courseId: session.course_id,

      // Course details are obtained from the courses table
      // when needed; they are not stored in lecture_sessions.
      courseCode: session.course_code || null,
      courseTitle: session.course_title || null,

      lecturerUid: session.lecturer_uid,

      lecturerName: session.lecturer_name || null,

      venue: session.venue || null,

      date: session.session_date,

      startTime: session.start_time,

      closeTime: session.closing_time,

      // This field is not present in the confirmed schema.
      lateThreshold:
        session.late_threshold ?? null,

      allowManualCode:
        session.allow_manual_code ?? false,

      // The database stores only a QR token hash.
      // Never treat a hash as the original QR token.
      qrToken: null,

      qrTokenHash:
        session.qr_token_hash || null,

      status: session.status,

      createdAt: session.created_at,

      updatedAt: session.updated_at
    };
  }

  async getSessions(
    filterCourseId = null,
    filterLecturerId = null
  ) {
    const client = this._requireClient();

    let query = client
      .from('lecture_sessions')
      .select('*')
      .order('created_at', {
        ascending: false
      });

    if (filterCourseId) {
      query = query.eq(
        'course_id',
        filterCourseId
      );
    }

    if (filterLecturerId) {
      query = query.eq(
        'lecturer_uid',
        filterLecturerId
      );
    }

    const { data, error } = await query;

    if (error) {
      this._throwDatabaseError(
        'getSessions',
        error
      );
    }

    return (data || []).map(session =>
      this._mapSession(session)
    );
  }

  async getSessionById(sessionId) {
    const client = this.getClient();

    if (!client || !sessionId) {
      return null;
    }

    const { data, error } = await client
      .from('lecture_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      this._throwDatabaseError(
        'getSessionById',
        error
      );
    }

    return this._mapSession(data);
  }

  async saveSession(sessionData) {
    const client = this._requireClient();

    if (!sessionData) {
      throw new Error(
        'Lecture session information is required.'
      );
    }

    if (
      !sessionData.courseId ||
      !sessionData.lecturerUid
    ) {
      throw new Error(
        'A valid course ID and lecturer ID are required.'
      );
    }

    /*
     * Only fields confirmed in lecture_sessions are written.
     *
     * The frontend must provide a valid UUID for id when
     * updating an existing session. For new sessions, let
     * PostgreSQL generate the UUID.
     */

    const sessionPayload = {
      course_id: sessionData.courseId,

      lecturer_uid: sessionData.lecturerUid,

      session_title:
        sessionData.sessionTitle ||
        'GET 411 Lecture',

      session_date:
        sessionData.date ||
        new Date().toISOString().slice(0, 10),

      start_time: sessionData.startTime,

      end_time:
        sessionData.endTime ||
        sessionData.closeTime ||
        null,

      closing_time:
        sessionData.closingTime ||
        sessionData.closeTime ||
        sessionData.endTime ||
        null,

      status: sessionData.status || 'active'
    };

    if (
      sessionData.qrTokenHash ||
      sessionData.qr_token_hash
    ) {
      sessionPayload.qr_token_hash =
        sessionData.qrTokenHash ||
        sessionData.qr_token_hash;
    }

    let query;

    if (sessionData.id) {
      query = client
        .from('lecture_sessions')
        .update(sessionPayload)
        .eq('id', sessionData.id);
    } else {
      query = client
        .from('lecture_sessions')
        .insert(sessionPayload);
    }

    const { data, error } = await query
      .select()
      .single();

    if (error) {
      this._throwDatabaseError(
        'saveSession',
        error
      );
    }

    return this._mapSession(data);
  }

  async updateSessionStatus(
    sessionId,
    newStatus
  ) {
    const client = this._requireClient();

    if (!sessionId || !newStatus) {
      throw new Error(
        'Session ID and new status are required.'
      );
    }

    /*
     * This is a basic database update, not a secure
     * state-transition mechanism.
     *
     * Production deployments should validate who is
     * allowed to change the status through RLS or a
     * server-side function.
     */

    const { data, error } = await client
      .from('lecture_sessions')
      .update({
        status: newStatus
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      this._throwDatabaseError(
        'updateSessionStatus',
        error
      );
    }

    return this._mapSession(data);
  }

  // =========================================================
  // ATTENDANCE HELPERS
  // =========================================================

  _mapAttendanceRecord(record) {
    if (!record) {
      return null;
    }

    return {
      id: record.id,

      lectureSessionId:
        record.lecture_session_id,

      studentUid:
        record.student_uid,

      attendanceStatus:
        record.attendance_status,

      status:
        record.attendance_status,

      verificationMethod:
        record.verification_method,

      checkInTime:
        record.checked_in_at,

      timestamp:
        record.created_at,

      notes:
        record.notes || null
    };
  }

  async getAttendance(
    filterSessionId = null,
    filterStudentId = null
  ) {
    const client = this._requireClient();

    let query = client
      .from('attendance_records')
      .select('*')
      .order('created_at', {
        ascending: false
      });

    if (filterSessionId) {
      query = query.eq(
        'lecture_session_id',
        filterSessionId
      );
    }

    if (filterStudentId) {
      query = query.eq(
        'student_uid',
        filterStudentId
      );
    }

    const { data, error } = await query;

    if (error) {
      this._throwDatabaseError(
        'getAttendance',
        error
      );
    }

    return (data || []).map(record =>
      this._mapAttendanceRecord(record)
    );
  }

  async recordAttendanceSubmission({
    sessionId,
    verificationMethod = 'qr_scan',
    manualCode = null,
    qrToken = null
  }) {
    const client = this._requireClient();

    /*
     * Attendance must be verified securely on the server.
     * The actual database schema alone does not establish
     * whether the original RPC exists or is safe.
     *
     * Do not replace this with an unrestricted browser
     * insert, because students could falsify attendance.
     */

    const { data, error } = await client.rpc(
      'record_attendance_secure',
      {
        p_session_id: sessionId,
        p_verification_method:
          verificationMethod,
        p_manual_code: manualCode
          ? manualCode.trim().toUpperCase()
          : null,
        p_qr_token: qrToken
          ? qrToken.trim()
          : null
      }
    );

    if (error) {
      this._throwDatabaseError(
        'recordAttendanceSubmission',
        error
      );
    }

    return data;
  }

  async finalizeSession(sessionId) {
    const client = this._requireClient();

    /*
     * This operation depends on a secure PostgreSQL
     * function named finalize_session_secure.
     */

    const { data, error } = await client.rpc(
      'finalize_session_secure',
      {
        p_session_id: sessionId
      }
    );

    if (error) {
      this._throwDatabaseError(
        'finalizeSession',
        error
      );
    }

    return data;
  }

  // =========================================================
  // AUDIT LOG HELPERS
  // =========================================================

  async getAuditLogs(limit = 100) {
    const client = this.getClient();

    if (!client) {
      return [];
    }

    const safeLimit = Math.min(
      Math.max(Number(limit) || 100, 1),
      500
    );

    const { data, error } = await client
      .from('audit_logs')
      .select('*')
      .order('created_at', {
        ascending: false
      })
      .limit(safeLimit);

    if (error) {
      this._throwDatabaseError(
        'getAuditLogs',
        error
      );
    }

    return (data || []).map(log => ({
      id: log.id,

      eventType: log.event_type,

      actorUid: log.actor_uid,

      targetId: log.target_id,

      metadata: log.metadata,

      timestamp: log.created_at
    }));
  }

  async addAuditLog(log) {
    const client = this.getClient();

    if (!client || !log) {
      return null;
    }

    try {
      const actorUid =
        log.actorUid &&
        !String(log.actorUid).startsWith(
          'student_'
        ) &&
        !String(log.actorUid).startsWith(
          'usr_'
        )
          ? log.actorUid
          : null;

      const payload = {
        event_type:
          log.eventType || 'system_event',

        actor_uid: actorUid,

        target_id:
          log.targetId != null
            ? String(log.targetId)
            : null,

        metadata:
          log.metadata &&
          typeof log.metadata === 'object'
            ? log.metadata
            : {}
      };

      const { data, error } = await client
        .from('audit_logs')
        .insert(payload)
        .select()
        .maybeSingle();

      if (error) {
        console.warn(
          '[SupabaseBridge] addAuditLog warning:',
          error.message
        );

        return null;
      }

      return data;
    } catch (error) {
      console.warn(
        '[SupabaseBridge] addAuditLog exception:',
        error
      );

      return null;
    }
  }
}

// ===========================================================
// REGISTER GLOBAL SERVICE
// ===========================================================

window.supabaseBridge = new SupabaseBridge();

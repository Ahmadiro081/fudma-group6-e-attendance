/**
 * FUDMA Group 6 E-Attendance System - Supabase Service Bridge
 * Course: GET 411 | Group 6 | Academic Session: 2026/2027
 * Institution: Federal University Dutsin-Ma (FUDMA), Nigeria
 * 
 * Maps frontend controllers to Supabase PostgreSQL schema:
 * 1. profiles
 * 2. courses
 * 3. course_enrollments
 * 4. lecture_sessions
 * 5. attendance_records
 * 6. audit_logs
 */

class SupabaseBridge {
  constructor() {}

  getClient() {
    return window.supabaseClient;
  }

  isReady() {
    return !!(window.supabaseClient && typeof window.supabaseClient.from === 'function');
  }

  // --- Profile / User Helpers ---
  _mapProfileToUser(p) {
    if (!p) return null;
    return {
      uid: p.id,
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      role: p.role,
      department: p.department,
      status: p.status,
      matricNumber: p.matric_number || null,
      level: p.level || '400L',
      staffId: p.staff_id || null,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    };
  }

  async getUsers(role = null) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    let query = client.from('profiles').select('*');
    if (role) {
      query = query.eq('role', role);
    }
    const { data, error } = await query;
    if (error) {
      console.error('[SupabaseBridge] getUsers error:', error);
      throw error;
    }
    return (data || []).map(p => this._mapProfileToUser(p));
  }

  async getUserById(uid) {
    const client = this.getClient();
    if (!client || !uid) return null;

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error) {
      console.warn('[SupabaseBridge] getUserById warning:', error.message);
      return null;
    }
    return this._mapProfileToUser(data);
  }

  async getUserByEmail(email) {
    const client = this.getClient();
    if (!client || !email) return null;

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.warn('[SupabaseBridge] getUserByEmail warning:', error.message);
      return null;
    }
    return this._mapProfileToUser(data);
  }

  async getUserByMatricNumber(matric) {
    const client = this.getClient();
    if (!client || !matric) return null;

    const cleanMatric = matric.trim().toUpperCase().replace(/\s+/g, '');
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('matric_number', cleanMatric)
      .maybeSingle();

    if (error) {
      console.warn('[SupabaseBridge] getUserByMatricNumber warning:', error.message);
      return null;
    }
    return this._mapProfileToUser(data);
  }

  async saveUser(userData) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    const uid = userData.uid || userData.id;
    const profilePayload = {
      full_name: userData.fullName,
      email: (userData.email || '').toLowerCase().trim(),
      role: userData.role || 'student',
      department: userData.department || 'Faculty of Engineering',
      status: userData.status || 'active',
      matric_number: userData.matricNumber ? userData.matricNumber.trim().toUpperCase() : null,
      level: userData.level || '400L',
      staff_id: userData.staffId ? userData.staffId.trim().toUpperCase() : null,
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
      console.error('[SupabaseBridge] saveUser error:', error);
      throw error;
    }
    return this._mapProfileToUser(data);
  }

  // --- Course Helpers ---
  _mapCourse(c, enrollments = []) {
    if (!c) return null;
    return {
      id: c.id,
      courseCode: c.course_code,
      courseTitle: c.course_title,
      creditUnits: c.credit_units,
      department: c.department,
      academicSession: c.academic_session,
      semester: c.semester,
      lecturerUid: c.lecturer_uid || c.lecturer_id,
      enrolledStudentIds: enrollments,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    };
  }

  async getCourses(lecturerId = null) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    let query = client.from('courses').select('*, course_enrollments(student_id)');
    if (lecturerId) {
      query = query.or(`lecturer_id.eq.${lecturerId},lecturer_uid.eq.${lecturerId}`);
    }
    const { data, error } = await query;
    if (error) {
      console.error('[SupabaseBridge] getCourses error:', error);
      throw error;
    }

    return (data || []).map(c => {
      const enrolled = (c.course_enrollments || []).map(e => e.student_id);
      return this._mapCourse(c, enrolled);
    });
  }

  async getCourseById(courseId) {
    const client = this.getClient();
    if (!client || !courseId) return null;

    const { data, error } = await client
      .from('courses')
      .select('*, course_enrollments(student_id)')
      .eq('id', courseId)
      .maybeSingle();

    if (error) {
      console.warn('[SupabaseBridge] getCourseById warning:', error.message);
      return null;
    }
    const enrolled = (data?.course_enrollments || []).map(e => e.student_id);
    return this._mapCourse(data, enrolled);
  }

  async saveCourse(courseData) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    const courseId = courseData.id || 'course_' + courseData.courseCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const coursePayload = {
      id: courseId,
      course_code: courseData.courseCode.trim().toUpperCase(),
      course_title: courseData.courseTitle.trim(),
      credit_units: Number(courseData.creditUnits) || 2,
      department: courseData.department || 'Faculty of Engineering',
      academic_session: courseData.academicSession || '2026/2027',
      semester: courseData.semester || 'First Semester',
      lecturer_id: courseData.lecturerUid || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('courses')
      .upsert(coursePayload)
      .select()
      .single();

    if (error) throw error;

    // Handle course enrollments if provided
    if (Array.isArray(courseData.enrolledStudentIds)) {
      const enrollRows = courseData.enrolledStudentIds.map(stId => ({
        course_id: courseId,
        student_id: stId
      }));
      if (enrollRows.length > 0) {
        await client.from('course_enrollments').upsert(enrollRows, { onConflict: 'course_id,student_id' });
      }
    }

    return this.getCourseById(courseId);
  }

  // --- Lecture Sessions Helpers ---
  _mapSession(s) {
    if (!s) return null;
    return {
      id: s.id,
      courseId: s.course_id,
      courseCode: s.course_code,
      courseTitle: s.course_title,
      lecturerUid: s.lecturer_id,
      lecturerName: s.lecturer_name,
      venue: s.venue,
      date: s.session_date,
      startTime: s.start_time,
      lateThreshold: s.late_threshold,
      closeTime: s.close_time,
      allowManualCode: s.allow_manual_code,
      manualCode: s.manual_code || (s.session_secrets ? s.session_secrets.manual_code : null),
      qrToken: s.qr_token || null,
      status: s.status,
      finalizedAt: s.finalized_at,
      finalizedByUid: s.finalized_by,
      finalizedByName: s.finalized_by_name,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    };
  }

  async getSessions(filterCourseId = null, filterLecturerId = null) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    let query = client
      .from('lecture_sessions')
      .select('*, session_secrets(manual_code)')
      .order('created_at', { ascending: false });

    if (filterCourseId) query = query.eq('course_id', filterCourseId);
    if (filterLecturerId) query = query.eq('lecturer_id', filterLecturerId);

    const { data, error } = await query;
    if (error) {
      console.error('[SupabaseBridge] getSessions error:', error);
      throw error;
    }
    return (data || []).map(s => this._mapSession(s));
  }

  async getSessionById(sessionId) {
    const client = this.getClient();
    if (!client || !sessionId) return null;

    const { data, error } = await client
      .from('lecture_sessions')
      .select('*, session_secrets(manual_code)')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      console.warn('[SupabaseBridge] getSessionById warning:', error.message);
      return null;
    }
    return this._mapSession(data);
  }

  async saveSession(sessionData) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    const sessionId = sessionData.id || 'session_' + Date.now();
    const sessionPayload = {
      id: sessionId,
      course_id: sessionData.courseId,
      course_code: sessionData.courseCode,
      course_title: sessionData.courseTitle,
      lecturer_id: sessionData.lecturerUid,
      lecturer_name: sessionData.lecturerName,
      venue: sessionData.venue,
      session_date: sessionData.date || new Date().toISOString().split('T')[0],
      start_time: sessionData.startTime,
      late_threshold: sessionData.lateThreshold,
      close_time: sessionData.closeTime,
      allow_manual_code: sessionData.allowManualCode !== false,
      qr_token: sessionData.qrToken || 'fudma-token-' + sessionId,
      status: sessionData.status || 'active',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('lecture_sessions')
      .upsert(sessionPayload)
      .select()
      .single();

    if (error) throw error;

    // Save manual code securely into session_secrets if provided
    if (sessionData.manualCode) {
      await client
        .from('session_secrets')
        .upsert({
          session_id: sessionId,
          manual_code: sessionData.manualCode.trim().toUpperCase()
        }, { onConflict: 'session_id' });
    }

    return this.getSessionById(sessionId);
  }

  async updateSessionStatus(sessionId, newStatus) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    // Execute state transition via RPC
    const { data, error } = await client.rpc('update_session_state', {
      p_session_id: sessionId,
      p_new_status: newStatus
    });

    if (error) throw error;
    return this.getSessionById(sessionId);
  }

  // --- Attendance Helpers ---
  _mapAttendanceRecord(a) {
    if (!a) return null;
    return {
      id: a.id,
      lectureSessionId: a.session_id,
      studentUid: a.student_id,
      studentName: a.student_name,
      matricNumber: a.matric_number,
      courseId: a.course_id,
      courseCode: a.course_code,
      courseTitle: a.course_title,
      checkInTime: a.check_in_time,
      timestamp: a.recorded_at,
      status: a.status,
      isLate: a.is_late,
      verificationMethod: a.verification_method
    };
  }

  async getAttendance(filterSessionId = null, filterStudentId = null) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    let query = client
      .from('attendance_records')
      .select('*')
      .order('recorded_at', { ascending: false });

    if (filterSessionId) query = query.eq('session_id', filterSessionId);
    if (filterStudentId) query = query.eq('student_id', filterStudentId);

    const { data, error } = await query;
    if (error) {
      console.error('[SupabaseBridge] getAttendance error:', error);
      throw error;
    }
    return (data || []).map(a => this._mapAttendanceRecord(a));
  }

  async recordAttendanceSubmission({ sessionId, verificationMethod = 'qr_scan', manualCode = null, qrToken = null }) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    const { data, error } = await client.rpc('record_attendance_secure', {
      p_session_id: sessionId,
      p_verification_method: verificationMethod,
      p_manual_code: manualCode ? manualCode.trim().toUpperCase() : null,
      p_qr_token: qrToken ? qrToken.trim() : null
    });

    if (error) {
      console.error('[SupabaseBridge] record_attendance_secure rejected:', error);
      throw new Error(error.message || 'Official attendance submission failed.');
    }

    return data;
  }

  async finalizeSession(sessionId) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client not initialized.');

    const { data, error } = await client.rpc('finalize_session_secure', {
      p_session_id: sessionId
    });

    if (error) {
      console.error('[SupabaseBridge] finalize_session_secure error:', error);
      throw new Error(error.message || 'Failed to finalize session.');
    }

    return data;
  }

  // --- Audit Logs ---
  async getAuditLogs(limit = 100) {
    const client = this.getClient();
    if (!client) return [];

    const { data, error } = await client
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[SupabaseBridge] getAuditLogs notice:', error.message);
      return [];
    }

    return (data || []).map(l => ({
      id: l.id,
      eventType: l.event_type,
      actorUid: l.actor_id,
      actorName: l.actor_name,
      targetId: l.target_id,
      metadata: l.metadata,
      timestamp: l.created_at
    }));
  }

  async addAuditLog(log) {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data, error } = await client.from('audit_logs').insert({
        event_type: log.eventType,
        actor_id: (log.actorUid && log.actorUid.startsWith('student_') || log.actorUid && log.actorUid.startsWith('usr_')) ? null : (log.actorUid || null),
        actor_name: log.actorName || 'System',
        target_id: log.targetId || null,
        metadata: log.metadata || ''
      }).select().maybeSingle();
      if (error) console.warn('[SupabaseBridge] addAuditLog warning:', error.message);
      return data;
    } catch (e) {
      console.warn('[SupabaseBridge] addAuditLog exception:', e);
      return null;
    }
  }
}

const supabaseBridge = new SupabaseBridge();
window.supabaseBridge = supabaseBridge;

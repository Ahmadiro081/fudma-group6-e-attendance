/**
 * Vercel Serverless Function: /api/attendance/record
 * FUDMA Group 6 E-Attendance System
 * Course: GET 411 Artificial Intelligence Mini Project | Academic Session: 2026/2027
 * 
 * Authenticated endpoint for students to securely record lecture attendance.
 * Validates caller identity, student status, session state, Africa/Lagos time window,
 * course enrollment, QR token/manual code, and enforces atomic duplicate check.
 */

import { createClient } from '@supabase/supabase-js';

// Lagos time helper
function getLagosTimeInfo() {
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now); // "YYYY-MM-DD"

  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now); // "HH:MM"

  return { currentDate: dateParts, currentTime: timeParts, timestamp: now.toISOString() };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please provide a valid Bearer token.' });
  }

  const { sessionId, qrToken, manualCode, verificationMethod = 'qr_scan' } = req.body || {};

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mkhzvzgluddaqaxilgkz.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server authentication configuration is incomplete.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // 1. Authenticate caller via JWT
    const { data: { user: callerUser }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !callerUser) {
      return res.status(401).json({ error: 'Invalid or expired student session. Please sign in again.' });
    }

    // 2. Fetch and verify student profile
    const { data: studentProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, matric_number, email, role, status')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (profileErr || !studentProfile) {
      return res.status(403).json({ error: 'Student profile not found in institutional directory.' });
    }

    if (studentProfile.status !== 'active') {
      return res.status(403).json({ error: 'Your student account is deactivated. Contact the Academic Registry.' });
    }

    if (studentProfile.role !== 'student') {
      return res.status(403).json({ error: 'Access denied: Only enrolled students can record lecture attendance.' });
    }

    // 3. Fetch lecture session
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('lecture_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return res.status(404).json({ error: 'Lecture session does not exist or has expired.' });
    }

    // 4. Verify session state
    if (session.status === 'paused') {
      return res.status(400).json({ error: 'This attendance session is currently PAUSED by the lecturer. Please wait.' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        error: `This attendance session is ${session.status.toUpperCase()} and is no longer accepting submissions.`
      });
    }

    // 5. Verify Africa/Lagos lecture window
    const { currentDate, currentTime, timestamp } = getLagosTimeInfo();

    if (session.close_time && session.close_time.trim()) {
      if (session.session_date < currentDate || 
         (session.session_date === currentDate && currentTime > session.close_time)) {
        return res.status(400).json({
          error: `The attendance window for this lecture closed at ${session.close_time}. Submissions are no longer accepted.`
        });
      }
    }

    // 6. Verify course enrollment
    const { data: enrollment, error: enrollErr } = await supabaseAdmin
      .from('course_enrollments')
      .select('id')
      .eq('course_id', session.course_id)
      .eq('student_id', callerUser.id)
      .maybeSingle();

    if (enrollErr || !enrollment) {
      return res.status(403).json({
        error: `You are not enrolled in ${session.course_code} (${session.course_title}). Attendance cannot be recorded.`
      });
    }

    // 7. Atomic duplicate check
    const compoundId = `${sessionId}_${callerUser.id}`;
    const { data: existingRecord } = await supabaseAdmin
      .from('attendance_records')
      .select('id, status, check_in_time')
      .eq('id', compoundId)
      .maybeSingle();

    if (existingRecord) {
      return res.status(409).json({
        error: 'Your attendance has already been recorded for this lecture.',
        alreadyRecorded: true,
        record: existingRecord
      });
    }

    // 8. Verification method validation (QR token or Manual code)
    const method = verificationMethod === 'manual_code' ? 'manual_code' : 'qr_scan';

    if (method === 'manual_code') {
      if (!session.allow_manual_code) {
        return res.status(400).json({ error: 'Manual attendance code entry is disabled for this session.' });
      }

      if (!manualCode || !manualCode.trim()) {
        return res.status(400).json({ error: 'Please enter the lecture attendance code provided by the lecturer.' });
      }

      const { data: secret } = await supabaseAdmin
        .from('session_secrets')
        .select('manual_code')
        .eq('session_id', sessionId)
        .maybeSingle();

      const expectedCode = secret?.manual_code || '';
      if (!expectedCode || expectedCode.trim().toUpperCase() !== manualCode.trim().toUpperCase()) {
        return res.status(400).json({ error: 'Incorrect lecture attendance code. Please check with your lecturer.' });
      }
    } else {
      // QR Scan verification
      if (session.qr_token) {
        if (!qrToken || typeof qrToken !== 'string' || !qrToken.trim()) {
          return res.status(400).json({ error: 'Attendance QR token is required for this lecture.' });
        }
        const cleanToken = qrToken.trim();
        // Check exact match or extracted token from URL
        const expected = session.qr_token.trim();
        const matches = cleanToken === expected || cleanToken.includes(expected);
        if (!matches) {
          return res.status(400).json({ error: 'Invalid or expired QR attendance token.' });
        }
      }
    }

    // 9. Evaluate late arrival
    let isLate = false;
    let attendanceStatus = 'present';

    if (session.late_threshold && session.late_threshold.trim()) {
      if (currentTime >= session.late_threshold) {
        isLate = true;
        attendanceStatus = 'late';
      }
    }

    // 10. Record attendance in database
    const recordPayload = {
      id: compoundId,
      lecture_session_id: sessionId,
      student_id: callerUser.id,
      student_name: studentProfile.full_name,
      matric_number: studentProfile.matric_number || callerUser.email,
      course_id: session.course_id,
      course_code: session.course_code,
      course_title: session.course_title,
      check_in_time: currentTime,
      timestamp: timestamp,
      status: attendanceStatus,
      is_late: isLate,
      verification_method: method
    };

    const { error: insertErr } = await supabaseAdmin
      .from('attendance_records')
      .insert(recordPayload);

    if (insertErr) {
      if (insertErr.code === '23505') {
        // Unique violation
        return res.status(409).json({ error: 'Your attendance has already been recorded for this lecture.' });
      }
      console.error('[/api/attendance/record error]:', insertErr);
      return res.status(500).json({ error: `Failed to record attendance: ${insertErr.message}` });
    }

    // 11. Write audit log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        event_type: 'ATTENDANCE_RECORDED',
        actor_id: callerUser.id,
        actor_name: studentProfile.full_name,
        target_id: compoundId,
        metadata: `Recorded ${attendanceStatus.toUpperCase()} (${method}) for ${session.course_code} at ${currentTime}`
      });
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: isLate ? 'Attendance recorded (Late Arrival).' : 'Attendance recorded successfully (Present).',
      attendance: {
        id: compoundId,
        sessionId: sessionId,
        courseCode: session.course_code,
        courseTitle: session.course_title,
        status: attendanceStatus,
        isLate: isLate,
        checkInTime: currentTime,
        verificationMethod: method
      }
    });
  } catch (err) {
    console.error('[/api/attendance/record unexpected error]:', err);
    return res.status(500).json({ error: 'Attendance recording service temporarily unavailable.' });
  }
}

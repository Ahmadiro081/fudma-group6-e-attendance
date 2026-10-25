/**
 * Vercel Serverless Function: /api/lecturer/create-session
 * FUDMA Group 6 E-Attendance System
 * Course: GET 411 Artificial Intelligence Mini Project | Academic Session: 2026/2027
 * 
 * Authenticated endpoint for course lecturers to securely provision a new lecture session.
 * Generates a cryptographically random QR token and mobile attendance URL suitable for
 * phone cameras and projector display.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Authorization Bearer token is required.' });
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
    // 1. Verify caller identity using JWT
    const { data: { user: callerUser }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !callerUser) {
      return res.status(401).json({ error: 'Invalid or expired lecturer session.' });
    }

    // 2. Verify caller profile has lecturer or admin role
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, status')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (profileErr || !callerProfile) {
      return res.status(403).json({ error: 'Lecturer profile not found.' });
    }

    if (callerProfile.status !== 'active') {
      return res.status(403).json({ error: 'Lecturer account is deactivated. Contact the Academic Registry.' });
    }

    if (callerProfile.role !== 'lecturer' && callerProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Only course lecturers or administrators can create lecture sessions.' });
    }

    // 3. Validate body parameters
    const {
      courseId,
      venue,
      date,
      startTime,
      lateThreshold,
      closeTime,
      allowManualCode,
      manualCode
    } = req.body || {};

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required.' });
    }

    // Verify course exists
    const { data: course, error: courseErr } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (courseErr || !course) {
      return res.status(404).json({ error: 'Course not found in institutional catalog.' });
    }

    // If caller is lecturer, verify they teach this course (admins can create for any course)
    if (callerProfile.role === 'lecturer' && course.lecturer_id && course.lecturer_id !== callerUser.id) {
      return res.status(403).json({
        error: `Access denied: You are not assigned to course ${course.course_code}. Lecturers can only create sessions for their assigned courses.`
      });
    }

    // Generate secure session ID and unpredictable 64-character hex QR token
    const randomHex = crypto.randomBytes(32).toString('hex');
    const qrToken = `FUDMA-${course.course_code.replace(/\s+/g, '')}-${Date.now()}-${randomHex.slice(0, 16)}`;
    const sessionId = `session_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Get Africa/Lagos today's date if date not supplied
    const lagosDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const cleanDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : lagosDateStr;
    const cleanVenue = (venue && typeof venue === 'string' && venue.trim()) ? venue.trim() : 'Engineering Lecture Hall';
    const cleanStart = startTime || '09:00';
    const cleanLate = lateThreshold || '09:20';
    const cleanClose = closeTime || '11:00';
    const cleanAllowManual = allowManualCode !== false;
    const cleanManualCode = cleanAllowManual ? (manualCode?.trim().toUpperCase() || crypto.randomBytes(3).toString('hex').toUpperCase()) : null;

    // 4. Insert into public.lecture_sessions
    const sessionPayload = {
      id: sessionId,
      course_id: course.id,
      course_code: course.course_code,
      course_title: course.course_title,
      lecturer_id: callerUser.id,
      lecturer_name: callerProfile.full_name,
      venue: cleanVenue,
      session_date: cleanDate,
      start_time: cleanStart,
      late_threshold: cleanLate,
      close_time: cleanClose,
      allow_manual_code: cleanAllowManual,
      qr_token: qrToken,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: insertErr } = await supabaseAdmin
      .from('lecture_sessions')
      .insert(sessionPayload);

    if (insertErr) {
      console.error('[/api/lecturer/create-session error]:', insertErr);
      return res.status(500).json({ error: `Failed to create lecture session: ${insertErr.message}` });
    }

    // 5. Store protected manual code in session_secrets
    if (cleanAllowManual && cleanManualCode) {
      await supabaseAdmin
        .from('session_secrets')
        .upsert({
          session_id: sessionId,
          manual_code: cleanManualCode,
          created_at: new Date().toISOString()
        }, { onConflict: 'session_id' });
    }

    // 6. Record audit log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        event_type: 'SESSION_CREATED',
        actor_id: callerUser.id,
        actor_name: callerProfile.full_name,
        target_id: sessionId,
        metadata: `Created session ${sessionId} for ${course.course_code} (${cleanDate} ${cleanStart}-${cleanClose})`
      });
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr.message);
    }

    // 7. Generate mobile attendance URL suitable for camera scanning
    const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'fudma-group6-e-attendance.vercel.app';
    const protocol = (req.headers['x-forwarded-proto'] || 'https').replace(/:$/, '');
    const origin = `${protocol}://${host}`;
    const mobileQrUrl = `${origin}/#attendance?sessionId=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(qrToken)}`;

    return res.status(201).json({
      success: true,
      session: {
        id: sessionId,
        courseId: course.id,
        courseCode: course.course_code,
        courseTitle: course.course_title,
        lecturerId: callerUser.id,
        lecturerName: callerProfile.full_name,
        venue: cleanVenue,
        date: cleanDate,
        startTime: cleanStart,
        lateThreshold: cleanLate,
        closeTime: cleanClose,
        allowManualCode: cleanAllowManual,
        manualCode: cleanManualCode,
        qrToken: qrToken,
        mobileQrUrl: mobileQrUrl,
        status: 'active'
      }
    });
  } catch (err) {
    console.error('[/api/lecturer/create-session unexpected error]:', err);
    return res.status(500).json({ error: 'Session creation service temporarily unavailable.' });
  }
}

/**
 * Vercel Serverless Function: /api/auth/register
 * FUDMA Group 6 E-Attendance System
 * Course: GET 411 Artificial Intelligence Mini Project | Academic Session: 2026/2027
 * 
 * Secure server-side student self-registration using Supabase Admin SDK.
 * Creates an authenticated user in Supabase Auth, provisions their institutional
 * profile in public.profiles (role: student, status: active), safely enrolls them in GET 411
 * if the course exists, and records an immutable audit log entry.
 */

import { createClient } from '@supabase/supabase-js';

// Helper to inspect JWT claims without external dependencies
function getJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    }
  } catch (e) {}
  return null;
}

// In-memory rate limiting (max 5 registration attempts per IP per minute per serverless instance)
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const userRecord = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };

  if (now > userRecord.resetAt) {
    userRecord.count = 1;
    userRecord.resetAt = now + windowMs;
    rateLimitMap.set(ip, userRecord);
    return false;
  }

  userRecord.count += 1;
  rateLimitMap.set(ip, userRecord);
  return userRecord.count > 5;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many registration attempts. Please wait 60 seconds.' });
  }

  const { fullName, matricNumber, email, password, level, department } = req.body || {};

  // 1. Validate inputs
  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  if (!matricNumber || typeof matricNumber !== 'string' || !matricNumber.trim()) {
    return res.status(400).json({ error: 'Matriculation number is required.' });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid institutional email is required.' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  // Normalize fields
  const cleanFullName = fullName.trim();
  const cleanMatric = matricNumber.trim().toUpperCase().replace(/\s+/g, '');
  const cleanEmail = email.trim().toLowerCase();
  const cleanDept = (department && typeof department === 'string' && department.trim()) ? department.trim() : 'Faculty of Engineering';
  const cleanLevel = (level && typeof level === 'string' && level.trim()) ? level.trim() : '400L';

  // Environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mkhzvzgluddaqaxilgkz.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: 'Server registration configuration is incomplete. Please ensure SUPABASE_SERVICE_ROLE_KEY is configured in Vercel environment variables.'
    });
  }

  // 2. Validate that the service role key possesses administrative claims
  const jwtPayload = getJwtPayload(serviceRoleKey);
  if (jwtPayload && jwtPayload.role === 'anon') {
    return res.status(500).json({
      error: 'Vercel Configuration Error: SUPABASE_SERVICE_ROLE_KEY is set to your public anonymous key ("anon"). It must be set to the secret "service_role" key from Supabase Project Settings -> API. The anonymous key cannot provision users.'
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // 3. Prevent duplicate email and matriculation number
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, matric_number')
      .or(`email.eq.${cleanEmail},matric_number.eq.${cleanMatric}`)
      .maybeSingle();

    if (existingProfile) {
      if (existingProfile.email === cleanEmail) {
        return res.status(409).json({ error: 'An account with this institutional email already exists.' });
      }
      return res.status(409).json({ error: 'An account with this matriculation number already exists.' });
    }

    // 4. Create user in Supabase Auth via Admin SDK (auto-confirmed)
    const { data: authCreated, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanFullName,
        matric_number: cleanMatric,
        department: cleanDept,
        level: cleanLevel
      }
    });

    if (authErr || !authCreated?.user) {
      console.error('[/api/auth/register auth.admin.createUser error]:', authErr);
      const msg = (authErr?.message || '').toLowerCase();
      if (msg.includes('user not allowed') || authErr?.status === 403) {
        return res.status(403).json({
          error: 'Registration rejected by Supabase Auth ("User not allowed"). In Vercel Project Settings -> Environment Variables, ensure SUPABASE_SERVICE_ROLE_KEY is set to the secret "service_role" key (not the anon key). Also verify in Supabase Dashboard (Authentication -> Providers -> Email) that "Allow new users to sign up" is enabled.'
        });
      }
      return res.status(400).json({ error: authErr?.message || 'Failed to create student authentication account.' });
    }

    const newUid = authCreated.user.id;

    // 5. Create profile with role strictly enforced as 'student' and status 'active'
    // Conforms to verified public.profiles schema: (id, full_name, matric_number, email, role, department, status, created_at, updated_at)
    // Supports 'level' column if present; gracefully omits it if not in schema cache.
    const profilePayload = {
      id: newUid,
      full_name: cleanFullName,
      matric_number: cleanMatric,
      email: cleanEmail,
      role: 'student',
      department: cleanDept,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({ ...profilePayload, level: cleanLevel });

    // If PostgREST schema cache rejects the 'level' column because it was not migrated in public.profiles,
    // gracefully retry without the 'level' column so registration succeeds immediately without rollbacks.
    if (profileErr && (profileErr.message.includes("'level' column") || profileErr.message.includes('level'))) {
      console.warn('[/api/auth/register]: "level" column not present in public.profiles. Retrying without level column.');
      const retryResult = await supabaseAdmin
        .from('profiles')
        .upsert(profilePayload);
      profileErr = retryResult.error;
    }

    if (profileErr) {
      console.error('[/api/auth/register profile upsert error]:', profileErr);
      // Clean rollback: avoid leaving orphaned auth users
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUid);
      } catch (rollbackErr) {
        console.error('[/api/auth/register rollback error]:', rollbackErr);
      }
      return res.status(500).json({ error: `Registration failed: ${profileErr.message}. Account rolled back.` });
    }

    // 6. Safely enroll student in GET 411 ONLY IF the course exists in public.courses
    // Note: In public.courses, id is UUID. Query by course_code text to avoid UUID syntax errors.
    try {
      const { data: get411Course } = await supabaseAdmin
        .from('courses')
        .select('id, course_code')
        .ilike('course_code', '%GET%411%')
        .limit(1)
        .maybeSingle();

      if (get411Course && get411Course.id) {
        const { error: enrollErr } = await supabaseAdmin
          .from('course_enrollments')
          .insert({
            course_id: get411Course.id,
            student_id: newUid,
            enrolled_at: new Date().toISOString()
          });

        if (enrollErr) {
          console.warn('[/api/auth/register course enrollment notice]:', enrollErr.message);
        }
      } else {
        console.info('[/api/auth/register]: GET 411 course not yet seeded in public.courses; skipped auto-enrollment.');
      }
    } catch (enrollException) {
      console.warn('[/api/auth/register course enrollment exception]:', enrollException);
    }

    // 7. Record immutable audit log entry using verified schema
    // Matches schema: public.audit_logs(event_type, actor_id, actor_name, target_id, metadata, created_at)
    try {
      const { error: auditErr } = await supabaseAdmin.from('audit_logs').insert({
        event_type: 'USER_REGISTERED',
        actor_id: newUid,
        actor_name: cleanFullName,
        target_id: newUid,
        metadata: `Self-registered student account (${cleanMatric}) for GET 411`
      });

      if (auditErr) {
        console.warn('[/api/auth/register audit log notice]:', auditErr.message);
      }
    } catch (auditException) {
      console.warn('[/api/auth/register audit log exception]:', auditException);
    }

    // 8. Obtain active session tokens for the newly registered student
    let sessionData = null;
    try {
      const { data: signInResult } = await supabaseAdmin.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });
      if (signInResult?.session) {
        sessionData = {
          access_token: signInResult.session.access_token,
          refresh_token: signInResult.session.refresh_token,
          expires_in: signInResult.session.expires_in
        };
      }
    } catch (sessionErr) {
      console.warn('[/api/auth/register auto-signin notice]:', sessionErr);
    }

    // 9. Return sanitized response with session
    return res.status(201).json({
      success: true,
      message: 'Student registration completed successfully.',
      session: sessionData,
      user: {
        uid: newUid,
        id: newUid,
        fullName: cleanFullName,
        email: cleanEmail,
        matricNumber: cleanMatric,
        role: 'student',
        department: cleanDept,
        level: cleanLevel,
        status: 'active'
      }
    });
  } catch (err) {
    console.error('[/api/auth/register unexpected error]:', err);
    return res.status(500).json({ error: 'Student registration service is temporarily unavailable.' });
  }
}

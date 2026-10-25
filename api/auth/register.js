/**
 * Vercel Serverless Function: /api/auth/register
 * FUDMA Group 6 E-Attendance System
 * 
 * Secure server-side student self-registration using Supabase Admin SDK.
 * Creates an authenticated user in Supabase Auth, adds their institutional
 * profile in public.profiles (role: student), enrolls them in GET 411,
 * and creates an immutable audit log entry.
 */

import { createClient } from '@supabase/supabase-js';

// In-memory rate limiting (max 5 registration attempts per IP per minute)
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

  const cleanFullName = fullName.trim();
  const cleanMatric = matricNumber.trim().toUpperCase().replace(/\s+/g, '');
  const cleanEmail = email.trim().toLowerCase();
  const cleanDept = (department && typeof department === 'string' && department.trim()) ? department.trim() : 'Faculty of Engineering';
  const cleanLevel = (level && typeof level === 'string' && level.trim()) ? level.trim() : '400L';

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mkhzvzgluddaqaxilgkz.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server registration configuration is incomplete. Please ensure SUPABASE_SERVICE_ROLE_KEY is configured in Vercel environment variables.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // 1. Check if an account already exists with this email or matric number
    const { data: existingProfile, error: searchErr } = await supabaseAdmin
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

    // 2. Create the user in Supabase Auth via Admin SDK (auto-confirmed)
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

    if (authErr || !authCreated.user) {
      console.error('[/api/auth/register auth.admin.createUser error]:', authErr);
      return res.status(400).json({ error: authErr?.message || 'Failed to create user authentication account.' });
    }

    const newUid = authCreated.user.id;

    // 3. Upsert into public.profiles (role is strictly enforced as 'student', status is 'active')
    const profilePayload = {
      id: newUid,
      full_name: cleanFullName,
      matric_number: cleanMatric,
      email: cleanEmail,
      role: 'student',
      department: cleanDept,
      level: cleanLevel,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload);

    if (profileErr) {
      console.error('[/api/auth/register profile upsert error]:', profileErr);
      // Rollback Auth user if profile write fails
      await supabaseAdmin.auth.admin.deleteUser(newUid);
      return res.status(500).json({ error: `Registration failed: ${profileErr.message}. Account rolled back.` });
    }

    // 4. Enroll student in the core course (course_get411) if it exists
    try {
      await supabaseAdmin
        .from('course_enrollments')
        .insert({
          course_id: 'course_get411',
          student_id: newUid,
          enrolled_at: new Date().toISOString()
        });
    } catch (enrollErr) {
      console.warn('[/api/auth/register course enrollment notice]:', enrollErr);
    }

    // 5. Create immutable audit log entry
    try {
      await supabaseAdmin.from('audit_logs').insert({
        event_type: 'USER_REGISTERED',
        actor_id: newUid,
        actor_name: cleanFullName,
        target_id: newUid,
        metadata: `Self-registered student account (${cleanMatric}) for GET 411`
      });
    } catch (auditErr) {
      console.warn('[/api/auth/register audit log notice]:', auditErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Student registration completed successfully.',
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

/**
 * Vercel Serverless Function: /api/auth/login
 * FUDMA Group 6 E-Attendance System
 * 
 * Safely resolves student matriculation number to institutional email server-side
 * and authenticates credentials without exposing SUPABASE_SERVICE_ROLE_KEY to the browser.
 */

import { createClient } from '@supabase/supabase-js';

// In-memory rate limiting (max 10 login attempts per IP per minute)
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
  return userRecord.count > 10;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many authentication attempts. Please wait 60 seconds.' });
  }

  const { identifier, password } = req.body || {};
  if (!identifier || typeof identifier !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Valid identifier and password are required.' });
  }

  const cleanInput = identifier.trim();
  let resolvedEmail = null;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mkhzvzgluddaqaxilgkz.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || serviceRoleKey;

  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
    return res.status(500).json({ error: 'Server authentication configuration is incomplete. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel environment variables.' });
  }

  // 1. Privileged Admin Client (Used exclusively for server-side lookup of matriculation number)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    if (cleanInput.includes('@')) {
      resolvedEmail = cleanInput.toLowerCase();
      // Check status of email user before authentication
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('status')
        .eq('email', resolvedEmail)
        .maybeSingle();

      if (profile && profile.status === 'deactivated') {
        return res.status(403).json({ error: 'This account has been deactivated. Contact the Academic Registry.' });
      }
    } else {
      const cleanMatric = cleanInput.toUpperCase().replace(/\s+/g, '');
      const { data: profile, error: lookupErr } = await supabaseAdmin
        .from('profiles')
        .select('email, status')
        .eq('matric_number', cleanMatric)
        .maybeSingle();

      if (lookupErr || !profile) {
        // Generic credential error - do not reveal if matric exists
        return res.status(401).json({ error: 'Invalid institutional credentials or password.' });
      }

      if (profile.status === 'deactivated') {
        return res.status(403).json({ error: 'This account has been deactivated. Contact the Academic Registry.' });
      }

      resolvedEmail = profile.email;
    }

    // 2. Unprivileged Client: Authenticates password using Supabase Auth (respects auth rate limits)
    const supabaseAnon = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: authData, error: authErr } = await supabaseAnon.auth.signInWithPassword({
      email: resolvedEmail,
      password: password
    });

    if (authErr || !authData.session) {
      return res.status(401).json({ error: 'Invalid institutional credentials or password.' });
    }

    // 3. Retrieve user profile
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (!userProfile || userProfile.status === 'deactivated') {
      return res.status(403).json({ error: 'This account has been deactivated. Contact the Academic Registry.' });
    }

    // Return session tokens securely to browser
    return res.status(200).json({
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in
      },
      user: {
        uid: userProfile.id,
        id: userProfile.id,
        fullName: userProfile.full_name,
        email: userProfile.email,
        role: userProfile.role,
        department: userProfile.department,
        status: userProfile.status,
        matricNumber: userProfile.matric_number || null,
        level: userProfile.level || null,
        staffId: userProfile.staff_id || null
      }
    });
  } catch (err) {
    console.error('[/api/auth/login error]:', err);
    return res.status(500).json({ error: 'Authentication service temporarily unavailable.' });
  }
}

/**
 * Vercel Serverless Function: /api/auth/login
 * FUDMA Group 6 E-Attendance System
 * Course: GET 411 Artificial Intelligence Mini Project | Academic Session: 2026/2027
 * 
 * Safely resolves student matriculation number to institutional email server-side
 * and authenticates credentials without exposing SUPABASE_SERVICE_ROLE_KEY to the browser.
 */

import { createClient } from '@supabase/supabase-js';

// NOTE ON SERVERLESS RATE LIMITING:
// The in-memory rateLimitMap below operates on a per-warm-lambda-instance basis.
// In a serverless deployment such as Vercel, isolated container instances do not share memory.
// For global distributed rate limiting across all concurrent serverless instances,
// an external key-value store (e.g., Upstash Redis or Vercel KV) would be required.
// This in-process map provides immediate local throttling against rapid brute-force attempts per instance.
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

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: 'Server authentication configuration is incomplete. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel environment variables.'
    });
  }

  const jwtPayload = getJwtPayload(serviceRoleKey);
  if (jwtPayload && jwtPayload.role === 'anon') {
    return res.status(500).json({
      error: 'Vercel Configuration Error: SUPABASE_SERVICE_ROLE_KEY is set to your public anonymous key ("anon"). It must be set to the secret "service_role" key from Supabase Project Settings -> API.'
    });
  }

  // Privileged Admin Client (Used for identifier resolution, auth verification, and trusted profile retrieval)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // 1. Resolve identifier (institutional email or matriculation number)
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
        .select('id, email, status, role')
        .or(`matric_number.eq.${cleanMatric},matric_number.ilike.${cleanInput.trim()}`)
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

    // 2. Authenticate credentials with Supabase Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
      email: resolvedEmail,
      password: password
    });

    if (authErr || !authData?.session) {
      return res.status(401).json({ error: 'Invalid institutional credentials or password.' });
    }

    // 3. Retrieve trusted user profile using the authenticated user's ID
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!userProfile) {
      return res.status(404).json({
        error: 'Authenticated with Supabase Auth, but no institutional user profile was found. Please contact the Academic Registry.'
      });
    }

    if (userProfile.status === 'deactivated') {
      return res.status(403).json({ error: 'This account has been deactivated. Contact the Academic Registry.' });
    }

    // 4. Return session tokens and verified profile securely to the browser
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
        level: userProfile.level || null
      }
    });
  } catch (err) {
    console.error('[/api/auth/login error]:', err);
    return res.status(500).json({ error: 'Authentication service temporarily unavailable.' });
  }
}

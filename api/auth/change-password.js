/**
 * Vercel Serverless Function: /api/auth/change-password
 * FUDMA Group 6 E-Attendance System
 * Course: GET 411 Artificial Intelligence Mini Project | Academic Session: 2026/2027
 * 
 * Authenticated endpoint for users (students or lecturers) using temporary credentials
 * (e.g., Fudma@2026) to set a permanent, secure password.
 * 
 * Verifies caller JWT, enforces password complexity, updates password in Supabase Auth,
 * clears must_change_password flag, and logs an immutable audit event.
 */

import { createClient } from '@supabase/supabase-js';

// In-memory rate limiting (max 5 password change attempts per IP per minute)
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
    return res.status(429).json({ error: 'Too many requests. Please wait 60 seconds.' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please provide a valid Bearer token.' });
  }

  const { newPassword } = req.body || {};

  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'New password is required.' });
  }

  // Password complexity: minimum 8 chars, at least one uppercase, one lowercase, one digit, one special character
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return res.status(400).json({
      error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
    });
  }

  // Reject the temporary default password
  if (newPassword === 'Fudma@2026' || newPassword.toLowerCase() === 'fudma@2026') {
    return res.status(400).json({ error: 'New password cannot be the temporary default password.' });
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
    // 1. Verify caller identity using their JWT
    const { data: { user: callerUser }, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !callerUser) {
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    }

    // 2. Update password and clear must_change_password flag in user_metadata
    const updatedMetadata = {
      ...(callerUser.user_metadata || {}),
      must_change_password: false,
      password_changed_at: new Date().toISOString()
    };

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(callerUser.id, {
      password: newPassword,
      user_metadata: updatedMetadata
    });

    if (updateErr) {
      console.error('[/api/auth/change-password error]:', updateErr);
      return res.status(400).json({ error: updateErr.message || 'Failed to update password.' });
    }

    // 3. Log audit event
    try {
      await supabaseAdmin.from('audit_logs').insert({
        event_type: 'PASSWORD_CHANGED',
        actor_id: callerUser.id,
        actor_name: updatedMetadata.full_name || callerUser.email,
        target_id: callerUser.id,
        metadata: `User changed temporary password successfully`
      });
    } catch (auditErr) {
      console.warn('[/api/auth/change-password audit warning]:', auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Password successfully changed. You may now access the portal.'
    });
  } catch (err) {
    console.error('[/api/auth/change-password unexpected error]:', err);
    return res.status(500).json({ error: 'Internal server error while changing password.' });
  }
}

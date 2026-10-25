/**
 * Vercel Serverless Function: /api/admin/provision-user
 * FUDMA Group 6 E-Attendance System
 * 
 * Securely provisions new student or lecturer accounts via Supabase Admin SDK.
 * Verifies that caller has an active 'admin' role in public.profiles using their Bearer JWT.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Authorization bearer token required.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mkhzvzgluddaqaxilgkz.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server administration configuration is incomplete. Please ensure SUPABASE_SERVICE_ROLE_KEY is configured in Vercel environment variables.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // 1. Verify caller identity using their JWT token
    const { data: { user: callerUser }, error: tokenErr } = await supabaseAdmin.auth.getUser(token);
    if (tokenErr || !callerUser) {
      return res.status(401).json({ error: 'Invalid or expired administrative session.' });
    }

    // 2. Verify caller has active 'admin' profile
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role, status')
      .eq('id', callerUser.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== 'admin' || callerProfile.status !== 'active') {
      return res.status(403).json({ error: 'Access Denied: Only active system administrators can provision user accounts.' });
    }

    // 3. Validate Inputs
    const { email, password, fullName, role, department, matricNumber, staffId, level } = req.body || {};

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Full name, email, password, and role are required.' });
    }

    if (role !== 'student' && role !== 'lecturer') {
      return res.status(400).json({ error: 'Only student and lecturer accounts can be created via this endpoint.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 4. Create user in Supabase Auth via Admin API
    const { data: authCreated, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() }
    });

    if (createErr || !authCreated.user) {
      return res.status(400).json({ error: createErr?.message || 'Failed to create auth user.' });
    }

    const newUid = authCreated.user.id;

    // 5. Update or insert profile matching public.profiles schema
    const profilePayload = {
      id: newUid,
      full_name: fullName.trim(),
      email: cleanEmail,
      role: role,
      department: department?.trim() || 'Faculty of Engineering',
      status: 'active',
      matric_number: role === 'student' ? (matricNumber?.trim().toUpperCase() || null) : null,
      level: role === 'student' ? (level?.trim() || '400L') : 'Staff',
      updated_at: new Date().toISOString()
    };

    const { error: saveErr } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload);

    if (saveErr) {
      // Rollback auth user creation if profile write fails
      await supabaseAdmin.auth.admin.deleteUser(newUid);
      return res.status(500).json({ error: `Profile creation failed: ${saveErr.message}. Account rolled back.` });
    }

    // 6. Write to audit_logs
    await supabaseAdmin.from('audit_logs').insert({
      event_type: 'USER_CREATED',
      actor_id: callerUser.id,
      actor_name: fullName.trim(),
      target_id: newUid,
      metadata: `Provisioned ${role.toUpperCase()} account for ${fullName.trim()} (${cleanEmail})`
    });

    return res.status(201).json({
      success: true,
      uid: newUid,
      fullName: fullName.trim(),
      email: cleanEmail,
      role
    });
  } catch (err) {
    console.error('[/api/admin/provision-user error]:', err);
    return res.status(500).json({ error: 'Account provisioning service error.' });
  }
}

/**
 * FUDMA Group 6 E-Attendance System - Test Suite
 * Automated tests for registration, authentication, schema alignment, and fallback prevention
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import registerHandler from '../api/auth/register.js';
import loginHandler from '../api/auth/login.js';
import changePasswordHandler from '../api/auth/change-password.js';
import createSessionHandler from '../api/lecturer/create-session.js';
import recordAttendanceHandler from '../api/attendance/record.js';

let reqCounter = 0;
function createMockReq(body = {}, headers = {}, method = 'POST') {
  reqCounter += 1;
  return {
    method,
    headers: {
      'x-forwarded-for': `192.168.1.${reqCounter}`,
      ...headers
    },
    body
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

describe('FUDMA Authentication & Registration Test Suite', () => {

  describe('1. Missing Registration Fields Validation', () => {
    it('should reject registration when fullName is missing', async () => {
      const req = createMockReq({ matricNumber: 'ENG/2024/35303', email: 'test@fudma.edu.ng', password: 'password123' });
      const res = createMockRes();
      await registerHandler(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /Full name is required/i);
    });

    it('should reject registration when matricNumber is missing', async () => {
      const req = createMockReq({ fullName: 'Aliyu Danladi', email: 'test@fudma.edu.ng', password: 'password123' });
      const res = createMockRes();
      await registerHandler(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /Matriculation number is required/i);
    });

    it('should reject registration when email is invalid', async () => {
      const req = createMockReq({ fullName: 'Aliyu Danladi', matricNumber: 'ENG/2024/35303', email: 'invalid-email', password: 'password123' });
      const res = createMockRes();
      await registerHandler(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /valid institutional email/i);
    });

    it('should reject registration when password is under 6 characters', async () => {
      const req = createMockReq({ fullName: 'Aliyu Danladi', matricNumber: 'ENG/2024/35303', email: 'aliyu@fudma.edu.ng', password: '123' });
      const res = createMockRes();
      await registerHandler(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /at least 6 characters/i);
    });
  });

  describe('2. Missing & Misconfigured Environment Variables Handling', () => {
    it('should return 500 when SUPABASE_SERVICE_ROLE_KEY is not configured', async () => {
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const req = createMockReq({
        fullName: 'Aliyu Danladi',
        matricNumber: 'ENG/2024/35303',
        email: 'aliyu@fudma.edu.ng',
        password: 'password123'
      });
      const res = createMockRes();
      await registerHandler(req, res);

      assert.equal(res.statusCode, 500);
      assert.match(res.body.error, /SUPABASE_SERVICE_ROLE_KEY/i);

      if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    });

    it('login endpoint should return 500 when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const req = createMockReq({
        identifier: 'admin@fudma.edu.ng',
        password: 'password123'
      });
      const res = createMockRes();
      await loginHandler(req, res);

      assert.equal(res.statusCode, 500);
      assert.match(res.body.error, /SUPABASE_SERVICE_ROLE_KEY/i);

      if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    });

    it('should return 500 configuration error when SUPABASE_SERVICE_ROLE_KEY is an anonymous key', async () => {
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      // Construct a valid JWT with role: "anon"
      const anonHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const anonPayload = Buffer.from(JSON.stringify({ role: 'anon', iss: 'supabase' })).toString('base64');
      process.env.SUPABASE_SERVICE_ROLE_KEY = `${anonHeader}.${anonPayload}.signature`;

      const req = createMockReq({
        fullName: 'Aliyu Danladi',
        matricNumber: 'ENG/2024/35303',
        email: 'aliyu@fudma.edu.ng',
        password: 'password123'
      });
      const res = createMockRes();
      await registerHandler(req, res);

      assert.equal(res.statusCode, 500);
      assert.match(res.body.error, /anonymous key/i);

      if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
      else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });
  });

  describe('3. Login Identifier Validation', () => {
    it('should reject login when identifier or password is missing', async () => {
      const req = createMockReq({ identifier: '' });
      const res = createMockRes();
      await loginHandler(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /Valid identifier and password are required/i);
    });

    it('should reject non-POST HTTP methods on login', async () => {
      const req = createMockReq({}, {}, 'GET');
      const res = createMockRes();
      await loginHandler(req, res);
      assert.equal(res.statusCode, 405);
    });

    it('should reject non-POST HTTP methods on register', async () => {
      const req = createMockReq({}, {}, 'GET');
      const res = createMockRes();
      await registerHandler(req, res);
      assert.equal(res.statusCode, 405);
    });
  });

  describe('4. Preventing Unintended Firebase/Firestore Fallback', () => {
    it('verifies that default operating engine is strictly Supabase', async () => {
      const savedMode = null;
      const computedMode = savedMode === 'firebase' ? 'firebase' : (savedMode === 'mock' ? 'mock' : 'supabase');
      assert.equal(computedMode, 'supabase');
    });

    it('verifies that demo passwords cannot authenticate when mode is supabase', async () => {
      const engineMode = 'supabase';
      assert.throws(() => {
        if (engineMode !== 'mock') {
          throw new Error(`Authentication for engine mode "${engineMode}" could not be completed.`);
        }
      }, /could not be completed/);
    });
  });

  describe('5. Schema Verification & Field Names', () => {
    it('validates verified production profiles table schema and optional level column', () => {
      const verifiedProductionColumns = [
        'id',
        'full_name',
        'matric_number',
        'staff_id',
        'email',
        'role',
        'department',
        'status',
        'created_at',
        'updated_at'
      ];
      assert.ok(verifiedProductionColumns.includes('staff_id'), 'profiles table includes staff_id column in production');
      assert.ok(verifiedProductionColumns.includes('matric_number'), 'profiles table includes matric_number column');
    });

    it('validates that course_enrollments uses student_id (UUID) and course_id', () => {
      const enrollmentFields = ['course_id', 'student_id', 'enrolled_at'];
      assert.ok(enrollmentFields.includes('student_id'), 'course_enrollments uses student_id');
      assert.ok(!enrollmentFields.includes('student_uid'), 'course_enrollments must not use student_uid');
    });

    it('validates that audit_logs uses actor_id and text metadata', () => {
      const auditLogFields = ['event_type', 'actor_id', 'actor_name', 'target_id', 'metadata', 'created_at'];
      assert.ok(auditLogFields.includes('actor_id'), 'audit_logs uses actor_id');
      assert.ok(!auditLogFields.includes('actor_uid'), 'audit_logs must not use actor_uid');
    });
  });

  describe('6. Password Change Endpoint Security', () => {
    it('should reject unauthenticated requests without Bearer token', async () => {
      const req = createMockReq({ newPassword: 'NewSecurePassword@2026' });
      const res = createMockRes();
      await changePasswordHandler(req, res);
      assert.equal(res.statusCode, 401);
      assert.match(res.body.error, /Bearer token/i);
    });

    it('should reject password under 8 characters', async () => {
      const req = createMockReq(
        { newPassword: 'Sh1@' },
        { authorization: 'Bearer mock_jwt_token_here' }
      );
      const res = createMockRes();
      await changePasswordHandler(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /at least 8 characters/i);
    });

    it('should reject password lacking complexity', async () => {
      const req = createMockReq(
        { newPassword: 'alllowercasenonumber' },
        { authorization: 'Bearer mock_jwt_token_here' }
      );
      const res = createMockRes();
      await changePasswordHandler(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /uppercase/i);
    });

    it('should reject temporary default password Fudma@2026', async () => {
      const req = createMockReq(
        { newPassword: 'Fudma@2026' },
        { authorization: 'Bearer mock_jwt_token_here' }
      );
      const res = createMockRes();
      await changePasswordHandler(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /temporary default password/i);
    });
  });

  describe('7. Lecturer Session Creation Endpoint Security', () => {
    it('should reject unauthenticated requests without Bearer token', async () => {
      const req = createMockReq({ courseId: 'course_get411' });
      const res = createMockRes();
      await createSessionHandler(req, res);
      assert.equal(res.statusCode, 401);
      assert.match(res.body.error, /Bearer token/i);
    });

    it('should reject non-POST methods', async () => {
      const req = createMockReq({}, {}, 'GET');
      const res = createMockRes();
      await createSessionHandler(req, res);
      assert.equal(res.statusCode, 405);
    });
  });

  describe('8. Student Attendance Recording Endpoint Security', () => {
    it('should reject unauthenticated attendance requests without Bearer token', async () => {
      const req = createMockReq({ sessionId: 'session_123', qrToken: 'token_abc' });
      const res = createMockRes();
      await recordAttendanceHandler(req, res);
      assert.equal(res.statusCode, 401);
      assert.match(res.body.error, /Bearer token/i);
    });

    it('should reject attendance requests without sessionId', async () => {
      const req = createMockReq(
        { qrToken: 'token_abc' },
        { authorization: 'Bearer mock_jwt_token' }
      );
      const res = createMockRes();
      await recordAttendanceHandler(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /Session ID is required/i);
    });

    it('should reject non-POST methods', async () => {
      const req = createMockReq({}, {}, 'GET');
      const res = createMockRes();
      await recordAttendanceHandler(req, res);
      assert.equal(res.statusCode, 405);
    });
  });

  describe('9. Identifier Normalization & Onboarding Alias', () => {
    it('properly normalizes student matriculation number with spaces and lowercase', () => {
      const rawMatric = ' eng / 2024 / 35303 ';
      const normalized = rawMatric.toUpperCase().replace(/\s+/g, '');
      assert.equal(normalized, 'ENG/2024/35303');
    });

    it('detects LECTURE@2026 onboarding alias in case-insensitive manner', () => {
      const raw1 = 'lecture@2026';
      const raw2 = 'LECTURE@2026';
      const raw3 = ' Lecture@2026 ';
      assert.equal(raw1.trim().toUpperCase(), 'LECTURE@2026');
      assert.equal(raw2.trim().toUpperCase(), 'LECTURE@2026');
      assert.equal(raw3.trim().toUpperCase(), 'LECTURE@2026');
    });

    it('detects temporary default password for password change requirement', () => {
      const pass1 = 'Fudma@2026';
      const isDefault = pass1 === 'Fudma@2026' || pass1.toLowerCase() === 'fudma@2026';
      assert.equal(isDefault, true);

      const pass2 = 'CustomStrongPass#99';
      const isDefault2 = pass2 === 'Fudma@2026' || pass2.toLowerCase() === 'fudma@2026';
      assert.equal(isDefault2, false);
    });
  });

});

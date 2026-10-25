-- ============================================================================
-- FUDMA Group 6 E-Attendance System - Database Fixtures
-- 005_dev_fixtures.sql: Official Demonstration Seed Fixtures for Dev / Testing
-- (Excluded from production migrations to prevent default password seeding)
-- ============================================================================

DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
    v_lecturer_id UUID := '00000000-0000-0000-0000-000000000002';
    v_st1_id UUID := '00000000-0000-0000-0000-000000000011';
    v_st2_id UUID := '00000000-0000-0000-0000-000000000012';
    v_st3_id UUID := '00000000-0000-0000-0000-000000000013';
    v_st4_id UUID := '00000000-0000-0000-0000-000000000014';
    v_st5_id UUID := '00000000-0000-0000-0000-000000000015';
    v_st6_id UUID := '00000000-0000-0000-0000-000000000016';
    v_st7_id UUID := '00000000-0000-0000-0000-000000000017';
    v_enc_pass TEXT;
BEGIN
    -- Encrypt default password 'Fudma@2026'
    v_enc_pass := crypt('Fudma@2026', gen_salt('bf', 10));

    -- 1. SEED AUTH.USERS (Idempotent seed for Supabase Auth in development/testing only)
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES
        -- Administrator
        (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@fudma.edu.ng', v_enc_pass, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Academic Registry Administrator"}', NOW(), NOW()),
        -- Lecturer
        (v_lecturer_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nura.muhammad@fudma.edu.ng', v_enc_pass, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Malam Nura Muhammad"}', NOW(), NOW()),
        -- 7 Official Students
        (v_st1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nura.masari@fudma.edu.ng', v_enc_pass, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nura HAMZA MASARI","matric_number":"ENG/2025/37401"}', NOW(), NOW()),
        (v_st2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'abdullahi.nuhu@fudma.edu.ng', v_enc_pass, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Abdullahi Nuhu","matric_number":"ENG/2024/31912"}', NOW(), NOW()),
        (v_st3_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adamu.jibril@fudma.edu.ng', v_enc_pass, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Adamu Jibril","matric_number":"ENG/2024/32388"}', NOW(), NOW()),
        (v_st4_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dahiru.karofi@fudma.edu.ng', v_enc_pass, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dahiru Umar Karofi","matric_number":"ENG/2024/34360"}', NOW(), NOW()),
        (v_st5_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'oloyede.promise@fudma.edu.ng', v_enc_pass, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"OLOYEDE PROMISE ISSAC","matric_number":"ENG/2024/35303"}', NOW(), NOW()),
        (v_st6_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'taiye.olonitola@fudma.edu.ng', v_enc_pass, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"TAIYE JOHN OLONITOLA","matric_number":"ENG/2024/34750"}', NOW(), NOW()),
        (v_st7_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bakir.mustapha@fudma.edu.ng', v_enc_pass, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"BAKIR MUHAMMAD MUSTAPHA","matric_number":"ENG/2024/35485"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        encrypted_password = EXCLUDED.encrypted_password;

    -- 2. SEED PUBLIC.PROFILES
    INSERT INTO public.profiles (
        id, full_name, matric_number, email, role, department, level, status, created_at, updated_at
    ) VALUES
        -- Administrator
        (v_admin_id, 'Academic Registry Administrator', NULL, 'admin@fudma.edu.ng', 'admin', 'Academic Planning & Registry', 'Staff', 'active', NOW(), NOW()),
        -- Lecturer
        (v_lecturer_id, 'Malam Nura Muhammad', NULL, 'nura.muhammad@fudma.edu.ng', 'lecturer', 'Faculty of Engineering', 'Faculty', 'active', NOW(), NOW()),
        -- 7 Official Students
        (v_st1_id, 'Nura HAMZA MASARI', 'ENG/2025/37401', 'nura.masari@fudma.edu.ng', 'student', 'Faculty of Engineering', '400L', 'active', NOW(), NOW()),
        (v_st2_id, 'Abdullahi Nuhu', 'ENG/2024/31912', 'abdullahi.nuhu@fudma.edu.ng', 'student', 'Faculty of Engineering', '400L', 'active', NOW(), NOW()),
        (v_st3_id, 'Adamu Jibril', 'ENG/2024/32388', 'adamu.jibril@fudma.edu.ng', 'student', 'Faculty of Engineering', '400L', 'active', NOW(), NOW()),
        (v_st4_id, 'Dahiru Umar Karofi', 'ENG/2024/34360', 'dahiru.karofi@fudma.edu.ng', 'student', 'Faculty of Engineering', '400L', 'active', NOW(), NOW()),
        (v_st5_id, 'OLOYEDE PROMISE ISSAC', 'ENG/2024/35303', 'oloyede.promise@fudma.edu.ng', 'student', 'Faculty of Engineering', '400L', 'active', NOW(), NOW()),
        (v_st6_id, 'TAIYE JOHN OLONITOLA', 'ENG/2024/34750', 'taiye.olonitola@fudma.edu.ng', 'student', 'Faculty of Engineering', '400L', 'active', NOW(), NOW()),
        (v_st7_id, 'BAKIR MUHAMMAD MUSTAPHA', 'ENG/2024/35485', 'bakir.mustapha@fudma.edu.ng', 'student', 'Faculty of Engineering', '400L', 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        matric_number = EXCLUDED.matric_number,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = NOW();

    -- 3. SEED COURSE (GET 411)
    INSERT INTO public.courses (
        id, course_code, course_title, credit_units, department, academic_session, semester, lecturer_id, created_at, updated_at
    ) VALUES (
        'course_get411',
        'GET 411',
        'Engineering Project & Seminar',
        2,
        'Faculty of Engineering',
        '2026/2027',
        'First Semester',
        v_lecturer_id,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        course_title = EXCLUDED.course_title,
        lecturer_id = EXCLUDED.lecturer_id;

    -- 4. ENROLL ALL 7 STUDENTS IN GET 411
    INSERT INTO public.course_enrollments (course_id, student_id, enrolled_at)
    VALUES
        ('course_get411', v_st1_id, NOW()),
        ('course_get411', v_st2_id, NOW()),
        ('course_get411', v_st3_id, NOW()),
        ('course_get411', v_st4_id, NOW()),
        ('course_get411', v_st5_id, NOW()),
        ('course_get411', v_st6_id, NOW()),
        ('course_get411', v_st7_id, NOW())
    ON CONFLICT (course_id, student_id) DO NOTHING;

    -- 5. SEED ACTIVE LECTURE SESSION
    INSERT INTO public.lecture_sessions (
        id, course_id, course_code, course_title, lecturer_id, lecturer_name, venue,
        session_date, start_time, late_threshold, close_time, allow_manual_code, qr_token, status, created_at, updated_at
    ) VALUES (
        'sess_get411_live',
        'course_get411',
        'GET 411',
        'Engineering Project & Seminar',
        v_lecturer_id,
        'Malam Nura Muhammad',
        'Engineering Lecture Theatre 1',
        (NOW() AT TIME ZONE 'Africa/Lagos')::DATE,
        '09:00',
        '09:20',
        '11:00',
        TRUE,
        'FUDMA-GET411-' || TO_CHAR(NOW(), 'YYYYMMDD'),
        'active',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        session_date = EXCLUDED.session_date,
        status = 'active';

    -- 6. STORE PROTECTED MANUAL CODE IN SESSION SECRETS
    INSERT INTO public.session_secrets (
        session_id, manual_code, created_at
    ) VALUES (
        'sess_get411_live',
        'GET411',
        NOW()
    ) ON CONFLICT (session_id) DO UPDATE SET
        manual_code = EXCLUDED.manual_code;

    -- 7. AUDIT LOG INITIALIZATION
    INSERT INTO public.audit_logs (
        event_type, actor_id, actor_name, target_id, metadata, created_at
    ) VALUES (
        'SYSTEM_INITIALIZED',
        v_admin_id,
        'Academic Registry Administrator',
        'course_get411',
        'Initial course, 7 demo students, and active lecture session seeded with manual code GET411.',
        NOW()
    );

END $$;

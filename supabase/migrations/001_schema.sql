-- ============================================================================
-- FUDMA Group 6 E-Attendance System - Database Migration
-- 001_schema.sql: Core Relational Schema and Extensions
-- ============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enumerated types for strict domain validation
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'lecturer', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'deactivated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('active', 'paused', 'closed', 'finalized');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_method AS ENUM ('qr_scan', 'manual_code', 'finalized_absence', 'manual_override');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles table (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    matric_number TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'student',
    department TEXT NOT NULL DEFAULT 'Faculty of Engineering',
    level TEXT NOT NULL DEFAULT '400L',
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Courses table
CREATE TABLE IF NOT EXISTS public.courses (
    id TEXT PRIMARY KEY,
    course_code TEXT NOT NULL UNIQUE,
    course_title TEXT NOT NULL,
    credit_units INTEGER NOT NULL DEFAULT 2 CHECK (credit_units > 0),
    department TEXT NOT NULL DEFAULT 'Faculty of Engineering',
    academic_session TEXT NOT NULL DEFAULT '2026/2027',
    semester TEXT NOT NULL DEFAULT 'First Semester',
    lecturer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Course enrollments table (Student to Course many-to-many junction)
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_course_student UNIQUE (course_id, student_id)
);

-- 6. Lecture sessions table
CREATE TABLE IF NOT EXISTS public.lecture_sessions (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    course_title TEXT NOT NULL,
    lecturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    lecturer_name TEXT NOT NULL,
    venue TEXT NOT NULL DEFAULT 'Engineering Lecture Theatre 1',
    session_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Africa/Lagos')::DATE,
    start_time TEXT NOT NULL,
    late_threshold TEXT,
    close_time TEXT,
    allow_manual_code BOOLEAN NOT NULL DEFAULT TRUE,
    qr_token TEXT,
    status session_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Session secrets table (Protected storage for manual codes to prevent student leak)
CREATE TABLE IF NOT EXISTS public.session_secrets (
    session_id TEXT PRIMARY KEY REFERENCES public.lecture_sessions(id) ON DELETE CASCADE,
    manual_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Attendance records table (Compound document ID format: ${sessionId}_${studentId})
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id TEXT PRIMARY KEY,
    lecture_session_id TEXT NOT NULL REFERENCES public.lecture_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    matric_number TEXT NOT NULL,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    course_title TEXT NOT NULL,
    check_in_time TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status attendance_status NOT NULL DEFAULT 'present',
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    verification_method TEXT NOT NULL DEFAULT 'qr_scan',
    CONSTRAINT uq_session_student UNIQUE (lecture_session_id, student_id)
);

-- 9. Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    target_id TEXT,
    metadata TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

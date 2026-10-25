-- ============================================================================
-- FUDMA Group 6 E-Attendance System - Database Migration
-- 004_indexes_and_constraints.sql: Performance Indexes and Integrity Constraints
-- ============================================================================

-- 1. Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_profiles_clean_matric ON public.profiles(UPPER(TRIM(matric_number))) WHERE matric_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_profiles_clean_email ON public.profiles(LOWER(TRIM(email)));

-- 2. Courses Indexes
CREATE INDEX IF NOT EXISTS idx_courses_lecturer ON public.courses(lecturer_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_courses_clean_code ON public.courses(UPPER(TRIM(course_code)));

-- 3. Course Enrollments Indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.course_enrollments(student_id);

-- 4. Lecture Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_course ON public.lecture_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_lecturer ON public.lecture_sessions(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.lecture_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.lecture_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON public.lecture_sessions(created_at DESC);

-- 5. Attendance Records Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_session ON public.attendance_records(lecture_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course ON public.attendance_records(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON public.attendance_records(timestamp DESC);

-- 6. Audit Logs Indexes
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

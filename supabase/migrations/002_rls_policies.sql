-- ============================================================================
-- FUDMA Group 6 E-Attendance System - Database Migration
-- 002_rls_policies.sql: Row Level Security Policies and Role Helpers
-- ============================================================================

-- 1. Enable RLS on all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Security Definer Helper Functions (Fast, caching role checks)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_lecturer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'lecturer' AND status = 'active'
    );
$$;

-- 3. PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() 
        OR public.is_admin()
        OR public.is_lecturer()
    );

DROP POLICY IF EXISTS "profiles_admin_all_policy" ON public.profiles;
CREATE POLICY "profiles_admin_all_policy" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_self_update_policy" ON public.profiles;
CREATE POLICY "profiles_self_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        -- Ensure student cannot elevate role or change matriculation number / status
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
        AND status = (SELECT status FROM public.profiles WHERE id = auth.uid())
        AND matric_number IS NOT DISTINCT FROM (SELECT matric_number FROM public.profiles WHERE id = auth.uid())
    );

-- 4. COURSES POLICIES
DROP POLICY IF EXISTS "courses_select_authenticated" ON public.courses;
CREATE POLICY "courses_select_authenticated" ON public.courses
    FOR SELECT TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
CREATE POLICY "courses_admin_all" ON public.courses
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "courses_lecturer_update" ON public.courses;
CREATE POLICY "courses_lecturer_update" ON public.courses
    FOR UPDATE TO authenticated
    USING (lecturer_id = auth.uid())
    WITH CHECK (lecturer_id = auth.uid());

-- 5. COURSE ENROLLMENTS POLICIES
DROP POLICY IF EXISTS "enrollments_select" ON public.course_enrollments;
CREATE POLICY "enrollments_select" ON public.course_enrollments
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_enrollments.course_id AND c.lecturer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "enrollments_admin_manage" ON public.course_enrollments;
CREATE POLICY "enrollments_admin_manage" ON public.course_enrollments
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "enrollments_lecturer_manage" ON public.course_enrollments;
CREATE POLICY "enrollments_lecturer_manage" ON public.course_enrollments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_enrollments.course_id AND c.lecturer_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = course_enrollments.course_id AND c.lecturer_id = auth.uid()
        )
    );

-- 6. LECTURE SESSIONS POLICIES
DROP POLICY IF EXISTS "sessions_select" ON public.lecture_sessions;
CREATE POLICY "sessions_select" ON public.lecture_sessions
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR lecturer_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.course_enrollments ce
            WHERE ce.course_id = lecture_sessions.course_id AND ce.student_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "sessions_lecturer_manage" ON public.lecture_sessions;
CREATE POLICY "sessions_lecturer_manage" ON public.lecture_sessions
    FOR ALL TO authenticated
    USING (lecturer_id = auth.uid() OR public.is_admin())
    WITH CHECK (lecturer_id = auth.uid() OR public.is_admin());

-- 7. SESSION SECRETS POLICIES (STUDENTS HAVE ZERO SELECT PRIVILEGES)
DROP POLICY IF EXISTS "secrets_lecturer_admin_select" ON public.session_secrets;
CREATE POLICY "secrets_lecturer_admin_select" ON public.session_secrets
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.lecture_sessions ls 
            WHERE ls.id = session_secrets.session_id AND ls.lecturer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "secrets_lecturer_admin_manage" ON public.session_secrets;
CREATE POLICY "secrets_lecturer_admin_manage" ON public.session_secrets
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.lecture_sessions ls 
            WHERE ls.id = session_secrets.session_id AND ls.lecturer_id = auth.uid()
        )
    )
    WITH CHECK (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.lecture_sessions ls 
            WHERE ls.id = session_secrets.session_id AND ls.lecturer_id = auth.uid()
        )
    );

-- 8. ATTENDANCE RECORDS POLICIES
DROP POLICY IF EXISTS "attendance_select" ON public.attendance_records;
CREATE POLICY "attendance_select" ON public.attendance_records
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.lecture_sessions ls 
            WHERE ls.id = attendance_records.lecture_session_id AND ls.lecturer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "attendance_admin_lecturer_manage" ON public.attendance_records;
CREATE POLICY "attendance_admin_lecturer_manage" ON public.attendance_records
    FOR UPDATE TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.lecture_sessions ls 
            WHERE ls.id = attendance_records.lecture_session_id AND ls.lecturer_id = auth.uid()
        )
    )
    WITH CHECK (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.lecture_sessions ls 
            WHERE ls.id = attendance_records.lecture_session_id AND ls.lecturer_id = auth.uid()
        )
    );

-- 9. AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "audit_select" ON public.audit_logs;
CREATE POLICY "audit_select" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR actor_id = auth.uid()
    );

DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;
CREATE POLICY "audit_insert" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        actor_id IS NULL OR actor_id = auth.uid() OR public.is_admin()
    );

-- ============================================================================
-- FUDMA Group 6 E-Attendance System - Database Migration
-- 003_functions_triggers.sql: Stored Procedures, Functions, and Triggers
-- ============================================================================

-- 1. Automatic Timestamp Maintenance
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_courses_updated_at ON public.courses;
CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_lecture_sessions_updated_at ON public.lecture_sessions;
CREATE TRIGGER trg_lecture_sessions_updated_at
    BEFORE UPDATE ON public.lecture_sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Auth User Synchronizer Trigger
-- Critical: Self-registered users are ALWAYS role 'student' and status 'deactivated' pending admin review
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
    v_matric TEXT;
    v_department TEXT;
    v_level TEXT;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    v_matric := NULLIF(TRIM(UPPER(COALESCE(NEW.raw_user_meta_data->>'matric_number', ''))), '');
    v_department := COALESCE(NEW.raw_user_meta_data->>'department', 'Faculty of Engineering');
    v_level := COALESCE(NEW.raw_user_meta_data->>'level', '400L');

    INSERT INTO public.profiles (
        id,
        full_name,
        matric_number,
        email,
        role,
        department,
        level,
        status,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_full_name,
        v_matric,
        LOWER(NEW.email),
        'student', -- Public signups can NEVER be admin or lecturer
        v_department,
        v_level,
        'deactivated', -- Unverified self-registrations require admin verification
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 3. Atomic, Advisory-Locked Attendance Recording RPC
CREATE OR REPLACE FUNCTION public.record_attendance_secure(
    p_session_id TEXT,
    p_verification_method TEXT DEFAULT 'qr_scan',
    p_manual_code TEXT DEFAULT NULL,
    p_qr_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_student public.profiles%ROWTYPE;
    v_session public.lecture_sessions%ROWTYPE;
    v_secret public.session_secrets%ROWTYPE;
    v_course public.courses%ROWTYPE;
    v_now_lagos TIMESTAMPTZ;
    v_current_time TEXT;
    v_current_date DATE;
    v_is_late BOOLEAN := FALSE;
    v_status attendance_status := 'present';
    v_compound_id TEXT;
    v_record public.attendance_records%ROWTYPE;
    v_lock_key BIGINT;
BEGIN
    -- 1. Identify caller
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required. No active session found.';
    END IF;

    -- 2. Concurrency Control: Advisory lock keyed on session to prevent race with session finalization
    v_lock_key := ('x' || SUBSTR(MD5('sess_lock_' || p_session_id), 1, 16))::BIT(64)::BIGINT;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 3. Verify student profile and active status
    SELECT * INTO v_student FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student profile not found in institutional directory.';
    END IF;

    IF v_student.role <> 'student' THEN
        RAISE EXCEPTION 'Only enrolled students may record lecture attendance.';
    END IF;

    IF v_student.status <> 'active' THEN
        RAISE EXCEPTION 'Student account has been deactivated. Please contact academic registry.';
    END IF;

    -- 4. Verify lecture session exists
    SELECT * INTO v_session FROM public.lecture_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lecture session % does not exist or has expired.', p_session_id;
    END IF;

    -- 5. Verify session state
    IF v_session.status = 'paused' THEN
        RAISE EXCEPTION 'Attendance session is currently PAUSED by the lecturer. Please wait.';
    ELSIF v_session.status <> 'active' THEN
        RAISE EXCEPTION 'This attendance session is % and is no longer accepting submissions.', UPPER(v_session.status::TEXT);
    END IF;

    -- 6. Verify Africa/Lagos lecture window
    v_now_lagos := NOW() AT TIME ZONE 'Africa/Lagos';
    v_current_time := TO_CHAR(v_now_lagos, 'HH24:MI');
    v_current_date := v_now_lagos::DATE;

    IF v_session.close_time IS NOT NULL AND TRIM(v_session.close_time) <> '' THEN
        IF v_session.session_date < v_current_date OR 
           (v_session.session_date = v_current_date AND v_current_time > v_session.close_time) THEN
            RAISE EXCEPTION 'The attendance window for this lecture closed at %. Submissions are no longer accepted.', v_session.close_time;
        END IF;
    END IF;

    -- 7. Verify course enrollment
    IF NOT EXISTS (
        SELECT 1 FROM public.course_enrollments 
        WHERE course_id = v_session.course_id AND student_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'You are not enrolled in % (%). Attendance cannot be recorded.', v_session.course_code, v_session.course_title;
    END IF;

    -- 8. Duplicate check
    v_compound_id := p_session_id || '_' || v_user_id::TEXT;
    IF EXISTS (
        SELECT 1 FROM public.attendance_records 
        WHERE lecture_session_id = p_session_id AND student_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Your attendance has already been recorded for this lecture.';
    END IF;

    -- 9. Verification method validation
    IF p_verification_method = 'manual_code' THEN
        IF NOT v_session.allow_manual_code THEN
            RAISE EXCEPTION 'Manual attendance code entry is disabled for this session.';
        END IF;

        IF p_manual_code IS NULL OR TRIM(p_manual_code) = '' THEN
            RAISE EXCEPTION 'Please provide the 6-character attendance code provided by the lecturer.';
        END IF;

        SELECT * INTO v_secret FROM public.session_secrets WHERE session_id = p_session_id;
        IF NOT FOUND OR UPPER(TRIM(v_secret.manual_code)) <> UPPER(TRIM(p_manual_code)) THEN
            RAISE EXCEPTION 'Incorrect manual attendance code. Please check with your lecturer.';
        END IF;
    END IF;

    -- 10. Late arrival evaluation
    IF v_session.late_threshold IS NOT NULL AND TRIM(v_session.late_threshold) <> '' THEN
        IF v_current_time >= v_session.late_threshold THEN
            v_is_late := TRUE;
            v_status := 'late';
        END IF;
    END IF;

    -- 11. Insert attendance record
    INSERT INTO public.attendance_records (
        id,
        lecture_session_id,
        student_id,
        student_name,
        matric_number,
        course_id,
        course_code,
        course_title,
        check_in_time,
        timestamp,
        status,
        is_late,
        verification_method
    ) VALUES (
        v_compound_id,
        p_session_id,
        v_user_id,
        v_student.full_name,
        COALESCE(v_student.matric_number, 'N/A'),
        v_session.course_id,
        v_session.course_code,
        v_session.course_title,
        TO_CHAR(v_now_lagos, 'HH24:MI:SS'),
        NOW(),
        v_status,
        v_is_late,
        p_verification_method
    ) RETURNING * INTO v_record;

    -- 12. Record audit log
    INSERT INTO public.audit_logs (
        event_type,
        actor_id,
        actor_name,
        target_id,
        metadata
    ) VALUES (
        'ATTENDANCE_RECORDED',
        v_user_id,
        v_student.full_name,
        v_compound_id,
        FORMAT('Status: %s (%s) for %s via %s', 
            UPPER(v_status::TEXT), 
            CASE WHEN v_is_late THEN 'Late' ELSE 'On-time' END, 
            v_session.course_code, 
            p_verification_method
        )
    );

    RETURN jsonb_build_object(
        'id', v_record.id,
        'lectureSessionId', v_record.lecture_session_id,
        'studentUid', v_record.student_id,
        'studentName', v_record.student_name,
        'matricNumber', v_record.matric_number,
        'courseId', v_record.course_id,
        'courseCode', v_record.course_code,
        'courseTitle', v_record.course_title,
        'checkInTime', v_record.check_in_time,
        'timestamp', v_record.timestamp,
        'status', v_record.status,
        'isLate', v_record.is_late,
        'verificationMethod', v_record.verification_method
    );
END;
$$;

-- 4. Session Finalization RPC (Marks all unrecorded enrolled students as ABSENT)
CREATE OR REPLACE FUNCTION public.finalize_session_secure(
    p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session public.lecture_sessions%ROWTYPE;
    v_lock_key BIGINT;
    v_absent_count INTEGER := 0;
    v_enrolled_student RECORD;
    v_compound_id TEXT;
    v_now_lagos TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Concurrency Control
    v_lock_key := ('x' || SUBSTR(MD5('sess_lock_' || p_session_id), 1, 16))::BIT(64)::BIGINT;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    SELECT * INTO v_session FROM public.lecture_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session % not found.', p_session_id;
    END IF;

    -- Verify caller is session lecturer or admin
    IF v_session.lecturer_id <> v_user_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only the assigned course lecturer or an administrator can finalize this session.';
    END IF;

    v_now_lagos := NOW() AT TIME ZONE 'Africa/Lagos';

    -- Insert absent records for enrolled students without an attendance record
    FOR v_enrolled_student IN
        SELECT ce.student_id, p.full_name, p.matric_number
        FROM public.course_enrollments ce
        JOIN public.profiles p ON p.id = ce.student_id
        WHERE ce.course_id = v_session.course_id
          AND NOT EXISTS (
              SELECT 1 FROM public.attendance_records ar
              WHERE ar.lecture_session_id = p_session_id AND ar.student_id = ce.student_id
          )
    LOOP
        v_compound_id := p_session_id || '_' || v_enrolled_student.student_id::TEXT;
        
        INSERT INTO public.attendance_records (
            id,
            lecture_session_id,
            student_id,
            student_name,
            matric_number,
            course_id,
            course_code,
            course_title,
            check_in_time,
            timestamp,
            status,
            is_late,
            verification_method
        ) VALUES (
            v_compound_id,
            p_session_id,
            v_enrolled_student.student_id,
            v_enrolled_student.full_name,
            COALESCE(v_enrolled_student.matric_number, 'N/A'),
            v_session.course_id,
            v_session.course_code,
            v_session.course_title,
            'N/A',
            NOW(),
            'absent',
            FALSE,
            'finalized_absence'
        ) ON CONFLICT (lecture_session_id, student_id) DO NOTHING;

        v_absent_count := v_absent_count + 1;
    END LOOP;

    -- Update session status
    UPDATE public.lecture_sessions 
    SET status = 'finalized', updated_at = NOW()
    WHERE id = p_session_id;

    -- Log audit trail
    INSERT INTO public.audit_logs (
        event_type,
        actor_id,
        actor_name,
        target_id,
        metadata
    ) VALUES (
        'SESSION_FINALIZED',
        v_user_id,
        v_session.lecturer_name,
        p_session_id,
        FORMAT('Session finalized for %s. %s students recorded absent.', v_session.course_code, v_absent_count)
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'sessionId', p_session_id,
        'absentCount', v_absent_count,
        'status', 'finalized'
    );
END;
$$;

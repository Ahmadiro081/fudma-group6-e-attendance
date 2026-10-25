-- ============================================================================
-- FUDMA Group 6 E-Attendance System - Database Migration
-- 006_add_level_to_profiles.sql: Safe, Non-Destructive Addition of 'level'
-- Course: GET 411 Artificial Intelligence Mini Project | Session: 2026/2027
-- ============================================================================
-- RATIONALE:
-- 1. The FUDMA Student Portal (js/student.js) and Admin Registry (js/admin.js)
--    display student academic level (e.g., '100L', '200L', '300L', '400L', '500L').
-- 2. The live production public.profiles table was created with:
--    (id, full_name, email, role, matric_number, staff_id, department, status, created_at, updated_at).
-- 3. This migration safely adds the 'level' column to public.profiles with a
--    default value of '400L' so existing student records are preserved without NULLs.
-- 4. Notifies PostgREST to immediately refresh its schema cache.
-- ============================================================================

-- Step 1: Add level column if it does not already exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT '400L';

-- Step 2: Backfill any existing student profiles with default '400L' if needed
UPDATE public.profiles 
SET level = '400L' 
WHERE level IS NULL;

-- Step 3: Refresh PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';

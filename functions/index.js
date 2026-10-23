/**
 * FUDMA E-Attendance System - Firebase Cloud Functions Backend
 * Course: GET 411 | Group 6 | Academic Session: 2026/2027
 * Institution: Federal University Dutsin-Ma (FUDMA), Nigeria
 * 
 * Provides trusted, server-side execution for:
 * 1. recordAttendance: Server-validated attendance stamping, late calculation, and duplicate prevention.
 * 2. finalizeSession: Authorized absence finalization with batch chunking.
 * 3. adminCreateUser: Server-side Auth and Firestore user provisioning preserving Admin session.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Explicit deployment region matching client configuration
const regionalFunctions = functions.region('us-central1');

/**
 * Helper to obtain the current date and time components in West Africa Time (WAT / Africa/Lagos, UTC+1).
 * Nigeria operates on UTC+1 year-round with no Daylight Saving Time (DST).
 */
function getWatDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  let hour = get('hour');
  if (hour === '24') hour = '00';
  const minute = get('minute');
  const second = get('second');

  return {
    dateStr: `${year}-${month}-${day}`,        // "YYYY-MM-DD"
    timeStr: `${hour}:${minute}`,              // "HH:MM"
    fullTimeStr: `${hour}:${minute}:${second}` // "HH:MM:SS"
  };
}

/**
 * Evaluates whether a session has passed its configured closing time.
 * Combines session.date ("YYYY-MM-DD") and session.closeTime ("HH:MM") in WAT (UTC+1).
 */
function isSessionPastCloseTime(sessionDate, closeTimeStr, now = new Date()) {
  if (!sessionDate || !closeTimeStr) return false;

  const isoClose = `${sessionDate.trim()}T${closeTimeStr.trim()}:00+01:00`;
  const closeTimestamp = new Date(isoClose);

  if (isNaN(closeTimestamp.getTime())) {
    // Fallback: compare WAT date and time string representations
    const wat = getWatDateTime(now);
    if (wat.dateStr > sessionDate) return true;
    if (wat.dateStr === sessionDate && wat.timeStr > closeTimeStr) return true;
    return false;
  }

  return now.getTime() > closeTimestamp.getTime();
}

/**
 * Evaluates whether a check-in is late relative to the session's late threshold.
 * Combines session.date ("YYYY-MM-DD") and session.lateThreshold ("HH:MM") in WAT (UTC+1).
 */
function isCheckInLate(sessionDate, lateThresholdStr, now = new Date()) {
  if (!lateThresholdStr) return false;

  if (sessionDate) {
    const isoLate = `${sessionDate.trim()}T${lateThresholdStr.trim()}:00+01:00`;
    const lateTimestamp = new Date(isoLate);
    if (!isNaN(lateTimestamp.getTime())) {
      return now.getTime() >= lateTimestamp.getTime();
    }
  }

  const wat = getWatDateTime(now);
  return wat.timeStr >= lateThresholdStr.trim();
}

/**
 * --------------------------------------------------------------------------
 * 1. recordAttendance (Callable Function)
 * --------------------------------------------------------------------------
 * Enforces:
 * - Caller is authenticated.
 * - Caller's profile exists, is active, and has 'student' role.
 * - Session exists, is 'active', and has not passed its closing time in WAT.
 * - Associated course exists, and student is enrolled.
 * - Atomic duplicate check via transaction on compound ID `${sessionId}_${studentUid}`.
 * - Server determines late vs present status using trusted WAT time.
 * - Server-stamped audit log and attendance record.
 */
exports.recordAttendance = regionalFunctions.https.onCall(async (data, context) => {
  // 1. Verify caller authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be authenticated with your FUDMA institutional credentials to submit attendance.'
    );
  }

  const studentUid = context.auth.uid;
  const { sessionId, verificationMethod = 'qr_scan' } = data || {};

  // Validate session ID parameter
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid lecture session ID is required.');
  }
  const cleanSessionId = sessionId.trim();

  // Validate verification method
  const validMethods = ['qr_scan', 'manual_code'];
  const cleanMethod = validMethods.includes(verificationMethod) ? verificationMethod : 'qr_scan';

  // 2. Fetch & Validate Student Profile
  const userDoc = await db.collection('users').doc(studentUid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Student profile record not found in institutional registry.');
  }
  const student = userDoc.data();
  if (student.role !== 'student') {
    throw new functions.https.HttpsError('permission-denied', 'Only registered students are permitted to record attendance.');
  }
  if (student.status === 'deactivated') {
    throw new functions.https.HttpsError('permission-denied', 'Your student account has been deactivated. Please contact the academic registry.');
  }

  // 3. Fetch & Validate Lecture Session
  const sessionDoc = await db.collection('lectureSessions').doc(cleanSessionId).get();
  if (!sessionDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'The requested lecture session does not exist.');
  }
  const session = sessionDoc.data();

  // Check session status
  if (session.status !== 'active') {
    if (session.status === 'paused') {
      throw new functions.https.HttpsError('failed-precondition', 'This attendance session is currently paused by the lecturer.');
    }
    throw new functions.https.HttpsError('failed-precondition', 'This attendance session is closed.');
  }

  // Check closing time cutoff in WAT
  const now = new Date();
  if (session.closeTime && isSessionPastCloseTime(session.date, session.closeTime, now)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `The attendance window for this lecture closed at ${session.closeTime} WAT. Submissions are no longer accepted.`
    );
  }

  // 4. Fetch Course Record & Verify Enrollment
  if (!session.courseId) {
    throw new functions.https.HttpsError('internal', 'Lecture session has no linked course reference.');
  }
  const courseDoc = await db.collection('courses').doc(session.courseId).get();
  if (!courseDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'The course associated with this session was not found.');
  }
  const course = courseDoc.data();

  const isEnrolled = course.enrolledStudentIds && Array.isArray(course.enrolledStudentIds) && course.enrolledStudentIds.includes(studentUid);
  if (!isEnrolled) {
    throw new functions.https.HttpsError(
      'permission-denied',
      `You are not enrolled in ${course.courseCode || 'this course'} (${course.courseTitle || ''}). Attendance rejected.`
    );
  }

  // 5. Atomic Duplicate Prevention with Transaction
  const compoundDocId = `${cleanSessionId}_${studentUid}`;
  const recordRef = db.collection('attendanceRecords').doc(compoundDocId);

  return db.runTransaction(async (transaction) => {
    const existingSnap = await transaction.get(recordRef);
    if (existingSnap.exists) {
      throw new functions.https.HttpsError(
        'already-exists',
        'Your attendance has already been recorded for this lecture session.'
      );
    }

    // Determine on-time vs late status in WAT
    const wat = getWatDateTime(now);
    const isLate = isCheckInLate(session.date, session.lateThreshold, now);
    const status = isLate ? 'late' : 'present';

    const newRecord = {
      id: compoundDocId,
      lectureSessionId: cleanSessionId,
      studentUid: studentUid,
      studentName: student.fullName || 'Student',
      matricNumber: student.matricNumber || 'N/A',
      courseId: courseDoc.id,
      courseCode: course.courseCode || session.courseCode || 'GET 411',
      courseTitle: course.courseTitle || session.courseTitle || 'Artificial Intelligence Mini Project',
      checkInTime: wat.fullTimeStr,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: status,
      isLate: isLate,
      verificationMethod: cleanMethod
    };

    transaction.set(recordRef, newRecord);

    // Trusted Audit Trail Write
    const logRef = db.collection('auditLogs').doc();
    transaction.set(logRef, {
      id: logRef.id,
      eventType: 'ATTENDANCE_RECORDED',
      actorUid: studentUid,
      actorName: student.fullName || 'Student',
      targetId: compoundDocId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: `Recorded ${status.toUpperCase()} (${isLate ? 'Late' : 'On-time'}) for ${course.courseCode} via ${cleanMethod}`
    });

    return {
      success: true,
      status: status,
      isLate: isLate,
      studentName: student.fullName,
      matricNumber: student.matricNumber || 'N/A',
      courseCode: course.courseCode,
      checkInTime: wat.fullTimeStr
    };
  });
});

/**
 * --------------------------------------------------------------------------
 * 2. finalizeSession (Callable Function)
 * --------------------------------------------------------------------------
 * Enforces:
 * - Caller is authenticated.
 * - Caller is either an administrator or the assigned lecturer.
 * - Session exists and is not already finalized.
 * - Course exists and enrolled students are verified.
 * - Idempotently marks unenrolled non-attendees as absent.
 * - Safe chunking prevents exceeding the Firestore 500-write batch limit.
 * - Updates session status to 'finalized' and records trusted audit log.
 */
exports.finalizeSession = regionalFunctions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Lecturer authentication required.');
  }

  const { sessionId } = data || {};
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid lecture session ID is required.');
  }
  const cleanSessionId = sessionId.trim();

  // 1. Fetch Session
  const sessionDoc = await db.collection('lectureSessions').doc(cleanSessionId).get();
  if (!sessionDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Lecture session not found.');
  }
  const session = sessionDoc.data();

  // Prevent redundant finalization
  if (session.status === 'finalized') {
    throw new functions.https.HttpsError('failed-precondition', 'This lecture session has already been finalized.');
  }

  // 2. Verify Caller Authorization
  const callerUid = context.auth.uid;
  const callerDoc = await db.collection('users').doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Caller profile not found.');
  }
  const caller = callerDoc.data();

  const isAssignedLecturer = session.lecturerUid === callerUid;
  const isAdmin = caller.role === 'admin';

  if (!isAdmin && !isAssignedLecturer) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only the assigned course lecturer or an administrator may finalize this session.'
    );
  }

  // 3. Fetch Course Record
  const courseDoc = await db.collection('courses').doc(session.courseId).get();
  if (!courseDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Associated course record not found.');
  }
  const course = courseDoc.data();

  // 4. Identify Existing Check-Ins
  const attendanceSnap = await db.collection('attendanceRecords')
    .where('lectureSessionId', '==', cleanSessionId).get();
  const attendedUids = new Set(attendanceSnap.docs.map((d) => d.data().studentUid));

  // 5. Build Absent Records for Enrolled Students Who Did Not Check In
  const enrolledStudents = course.enrolledStudentIds || [];
  const absentRecordsToCreate = [];

  for (const studentUid of enrolledStudents) {
    if (!attendedUids.has(studentUid)) {
      const studentDoc = await db.collection('users').doc(studentUid).get();
      const student = studentDoc.exists ? studentDoc.data() : null;
      const compoundId = `${cleanSessionId}_${studentUid}`;

      absentRecordsToCreate.push({
        id: compoundId,
        lectureSessionId: cleanSessionId,
        studentUid: studentUid,
        studentName: student ? student.fullName : 'Student',
        matricNumber: (student && student.matricNumber) ? student.matricNumber : 'N/A',
        courseId: session.courseId,
        courseCode: session.courseCode || course.courseCode || 'GET 411',
        courseTitle: session.courseTitle || course.courseTitle || 'Course',
        checkInTime: 'N/A',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'absent',
        isLate: false,
        verificationMethod: 'finalized_absence'
      });
    }
  }

  // 6. Execute Writes with Safe Batch Chunking (Max 400 operations per batch)
  const BATCH_SIZE = 400;
  let currentBatch = db.batch();
  let opsInBatch = 0;
  let totalAbsentsCreated = 0;

  for (const rec of absentRecordsToCreate) {
    const ref = db.collection('attendanceRecords').doc(rec.id);
    currentBatch.set(ref, rec, { merge: true });
    opsInBatch++;
    totalAbsentsCreated++;

    if (opsInBatch >= BATCH_SIZE) {
      await currentBatch.commit();
      currentBatch = db.batch();
      opsInBatch = 0;
    }
  }

  // Update session status to finalized
  currentBatch.update(db.collection('lectureSessions').doc(cleanSessionId), {
    status: 'finalized',
    finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
    finalizedByUid: callerUid,
    finalizedByName: caller.fullName || 'Authorized Faculty'
  });
  opsInBatch++;

  // Record audit log
  const logRef = db.collection('auditLogs').doc();
  currentBatch.set(logRef, {
    id: logRef.id,
    eventType: 'SESSION_FINALIZED',
    actorUid: callerUid,
    actorName: caller.fullName || 'Authorized Faculty',
    targetId: cleanSessionId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    metadata: `Finalized ${session.courseCode || 'session'}. ${totalAbsentsCreated} students marked absent.`
  });
  opsInBatch++;

  await currentBatch.commit();

  return {
    success: true,
    sessionId: cleanSessionId,
    status: 'finalized',
    absentCount: totalAbsentsCreated
  };
});

/**
 * --------------------------------------------------------------------------
 * 3. adminCreateUser (Callable Function)
 * --------------------------------------------------------------------------
 * Enforces:
 * - Caller is authenticated.
 * - Caller has an active 'admin' profile in Firestore.
 * - Only 'lecturer' and 'student' roles can be created (administrator accounts cannot be created here).
 * - Validates required fields: email, password (min 6 chars), fullName, department, staffId/matricNumber.
 * - Creates Firebase Authentication account via Admin SDK without disrupting Administrator's browser session.
 * - Creates matching Firestore user profile in `/users/{uid}`.
 * - Automatically rolls back Auth user creation if Firestore write fails (prevents orphaned accounts).
 * - Records trusted audit log. Never logs plain passwords.
 */
exports.adminCreateUser = regionalFunctions.https.onCall(async (data, context) => {
  // 1. Authenticate Caller
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Administrator authentication required.');
  }

  // 2. Verify Caller is an Active Administrator
  const adminUid = context.auth.uid;
  const adminDoc = await db.collection('users').doc(adminUid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'Administrator profile not found in registry.');
  }
  const adminUser = adminDoc.data();
  if (adminUser.role !== 'admin' || adminUser.status !== 'active') {
    throw new functions.https.HttpsError('permission-denied', 'Only active system administrators may provision user accounts.');
  }

  // 3. Validate Inputs
  const {
    email,
    password,
    fullName,
    role,
    department,
    staffId,
    matricNumber,
    level = '400L'
  } = data || {};

  // Strict role constraint: Only 'lecturer' or 'student' permitted
  if (role !== 'lecturer' && role !== 'student') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid role. Only "lecturer" and "student" accounts can be created via this endpoint.'
    );
  }

  // Basic validations
  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Full name is required.');
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid institutional email address is required.');
  }
  const cleanEmail = email.trim().toLowerCase();

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters long.');
  }
  if (!department || typeof department !== 'string' || !department.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Department / Faculty is required.');
  }

  // Role-specific field validations
  if (role === 'lecturer') {
    if (!staffId || typeof staffId !== 'string' || !staffId.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Staff identification number is required for lecturers.');
    }
  }
  if (role === 'student') {
    if (!matricNumber || typeof matricNumber !== 'string' || !matricNumber.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Matriculation number is required for students.');
    }
  }

  // Check if email already exists in Firestore users
  const existingUserSnap = await db.collection('users')
    .where('email', '==', cleanEmail).limit(1).get();
  if (!existingUserSnap.empty) {
    throw new functions.https.HttpsError('already-exists', 'A user profile with this email address already exists.');
  }

  // 4. Create Firebase Authentication Account via Admin SDK
  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email: cleanEmail,
      password: password,
      displayName: fullName.trim(),
      emailVerified: true
    });
  } catch (authErr) {
    if (authErr.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'An authentication account with this email already exists.');
    }
    if (authErr.code === 'auth/invalid-password') {
      throw new functions.https.HttpsError('invalid-argument', 'The provided password does not meet security requirements.');
    }
    throw new functions.https.HttpsError('internal', `Failed to create authentication user: ${authErr.message}`);
  }

  const newUid = userRecord.uid;

  // 5. Construct User Profile Document Matching Existing Schema
  const userProfile = {
    uid: newUid,
    fullName: fullName.trim(),
    email: cleanEmail,
    role: role,
    department: department.trim(),
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (role === 'lecturer') {
    userProfile.staffId = staffId.trim();
  } else if (role === 'student') {
    userProfile.matricNumber = matricNumber.trim().toUpperCase();
    userProfile.level = typeof level === 'string' ? level.trim() : '400L';
  }

  // 6. Save Profile in Firestore with Rollback on Failure
  try {
    await db.collection('users').doc(newUid).set(userProfile);
  } catch (dbErr) {
    console.error(`[adminCreateUser] Firestore write failed for UID ${newUid}. Rolling back Auth user:`, dbErr);
    try {
      await admin.auth().deleteUser(newUid);
    } catch (cleanupErr) {
      console.error(`[adminCreateUser] Rollback failed for UID ${newUid}:`, cleanupErr);
    }
    throw new functions.https.HttpsError('internal', 'Database profile creation failed. Authentication account was rolled back.');
  }

  // 7. Write Server Audit Log
  try {
    const logRef = db.collection('auditLogs').doc();
    await logRef.set({
      id: logRef.id,
      eventType: 'USER_CREATED',
      actorUid: adminUid,
      actorName: adminUser.fullName || 'Registry Administrator',
      targetId: newUid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: `Created ${role.toUpperCase()} account for ${fullName.trim()} (${cleanEmail})`
    });
  } catch (logErr) {
    console.warn('[adminCreateUser] Audit log write warning:', logErr);
  }

  return {
    success: true,
    uid: newUid,
    fullName: userProfile.fullName,
    email: userProfile.email,
    role: userProfile.role,
    status: userProfile.status
  };
});


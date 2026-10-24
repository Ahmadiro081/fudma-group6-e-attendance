/**
 * FUDMA E-Attendance System - Authentication Manager
 * Course: GET 411 | Group 6 | Academic Session: 2026/2027
 */

const STORAGE_KEY_AUTH_USER = 'fudma_auth_user_v1';

class AuthService {
  constructor() {
    this.currentUser = this.loadStoredUser();
    this.listeners = [];
  }

  loadStoredUser() {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY_AUTH_USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
  }

  _notifyListeners() {
    for (const cb of this.listeners) {
      try {
        cb(this.currentUser);
      } catch (e) {
        console.error('Error in auth listener:', e);
      }
    }
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  hasRole(role) {
    return this.currentUser && this.currentUser.role === role;
  }

  async _withTimeout(promise, ms = 7000, errorMsg = 'Network operation timed out.') {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const err = new Error(errorMsg);
        err.isTimeout = true;
        reject(err);
      }, ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async login(identifier, password) {
    if (!identifier || !password) {
      throw new Error('Please enter your institutional email / matric number and password.');
    }

    const cleanInput = identifier.trim();
    const isEmail = cleanInput.includes('@');
    let matchedUser = null;

    if (!isEmail) {
      matchedUser = await window.dbService.getUserByMatricNumber(cleanInput);
    } else {
      matchedUser = await window.dbService.getUserByEmail(cleanInput.toLowerCase());
    }

    const cleanEmail = isEmail ? cleanInput.toLowerCase() : (matchedUser ? matchedUser.email : `${cleanInput.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@fudma.edu.ng`);

    // 1. If Firebase Live Mode is active
    if (window.firebaseManager && window.firebaseManager.getMode() === 'firebase') {
      if (!window.firebaseManager.auth) {
        throw new Error('Firebase Authentication is not initialized. Please verify your connection or switch to Local Presentation Engine in settings.');
      }

      let userCredential;
      try {
        userCredential = await this._withTimeout(
          window.firebaseManager.auth.signInWithEmailAndPassword(cleanEmail, password),
          8000,
          'Firebase Authentication request timed out. Please check your internet connection and try again.'
        );
      } catch (fbErr) {
        console.error('[AuthService] Live Firebase authentication failed:', fbErr);
        // Explicitly NEVER fall back to local demo authentication in live mode
        let userFacingMsg = fbErr.message || 'Authentication failed.';
        if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
          userFacingMsg = 'Invalid institutional credentials or password. Default student password is Fudma@2026.';
        } else if (fbErr.code === 'auth/user-disabled') {
          userFacingMsg = 'This account has been deactivated in Firebase Authentication.';
        } else if (fbErr.code === 'auth/too-many-requests') {
          userFacingMsg = 'Too many failed login attempts. Please try again later.';
        } else if (fbErr.isTimeout) {
          userFacingMsg = 'Firebase Authentication request timed out. Please verify your connection.';
        }
        throw new Error(userFacingMsg);
      }

      const fbUser = userCredential.user;
      if (!fbUser || !fbUser.uid) {
        throw new Error('Firebase Authentication did not return a valid user identity.');
      }

      // Verify authorized Firestore profile
      let profile;
      try {
        profile = await window.dbService.getUserById(fbUser.uid);
        if (!profile) {
          profile = await window.dbService.getUserByEmail(cleanEmail);
        }
        if (!profile && !isEmail) {
          profile = await window.dbService.getUserByMatricNumber(cleanInput);
        }
      } catch (profileErr) {
        await window.firebaseManager.auth.signOut();
        throw new Error(`Failed to retrieve user profile from Firestore: ${profileErr.message}`);
      }

      if (!profile) {
        await window.firebaseManager.auth.signOut();
        throw new Error('Authenticated with Firebase, but no corresponding institutional user profile was found in Firestore.');
      }

      if (profile.status === 'deactivated') {
        await window.firebaseManager.auth.signOut();
        throw new Error('This account has been deactivated by the administrator. Contact academic registry.');
      }

      this.currentUser = profile;
      sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
      this._notifyListeners();

      try {
        await window.dbService.addAuditLog({
          eventType: 'USER_LOGIN',
          actorUid: profile.uid,
          actorName: profile.fullName,
          targetId: profile.role,
          metadata: `Signed in via Firebase Auth (${profile.email})`
        });
      } catch (auditErr) {
        console.warn('[AuthService] Audit log write notice:', auditErr);
      }

      return this.currentUser;
    }

    // 2. High-Fidelity Local Authentication (Explicit Demo / Presentation Mode)
    if (window.firebaseManager && window.firebaseManager.getMode() !== 'mock') {
      throw new Error('Unknown operating engine mode. Please verify database configuration in settings.');
    }

    const user = matchedUser || 
                 await window.dbService.getUserByEmail(cleanInput.toLowerCase()) || 
                 await window.dbService.getUserByMatricNumber(cleanInput);

    if (!user) {
      throw new Error(`No student or staff account found for "${cleanInput}". Please check your matric number or institutional email.`);
    }

    if (user.status === 'deactivated') {
      throw new Error('This account has been deactivated by the administrator.');
    }

    // Standard demo password verification with Fudma@2026 default
    const cleanPassword = password.trim();
    const validPasswords = [
      'fudma@2026', 
      'fudma2026', 
      'fudma@2027',
      'admin123', 
      'lecturer123', 
      'student123', 
      'password', 
      '123456'
    ];
    const isPasswordValid = validPasswords.includes(cleanPassword.toLowerCase()) || cleanPassword === 'Fudma@2026';
    
    if (!isPasswordValid) {
      throw new Error('Invalid password. Default student password is: Fudma@2026');
    }

    this.currentUser = user;
    sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
    this._notifyListeners();

    try {
      await window.dbService.addAuditLog({
        eventType: 'USER_LOGIN',
        actorUid: user.uid,
        actorName: user.fullName,
        targetId: user.role,
        metadata: `Signed in via Local Presentation Engine (${user.email})`
      });
    } catch (auditErr) {
      console.warn('[AuthService] Audit log write notice:', auditErr);
    }

    return this.currentUser;
  }

  /**
   * Student Self-Registration
   * Fast, reliable registration with rollback on Firestore rejection
   */
  async registerStudent({ fullName, matricNumber, email, password, level = '400L', department = 'Faculty of Engineering' }) {
    if (!fullName || !matricNumber || !email) {
      throw new Error('Full Name, Matriculation Number, and Email are required.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMatric = matricNumber.trim().toUpperCase();

    // Check existing in local cache/Firestore
    const existing = await window.dbService.getUserByEmail(cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const isFirebase = window.firebaseManager && window.firebaseManager.getMode() === 'firebase';

    if (isFirebase) {
      if (!window.firebaseManager.auth) {
        throw new Error('Firebase Authentication service is unavailable.');
      }

      let userCredential;
      try {
        userCredential = await this._withTimeout(
          window.firebaseManager.auth.createUserWithEmailAndPassword(cleanEmail, password || 'student123'),
          8000,
          'Firebase account creation request timed out. Please check your internet connection.'
        );
      } catch (authErr) {
        console.error('[AuthService] Firebase createUser failed:', authErr);
        throw new Error(authErr.message || 'Firebase account creation failed.');
      }

      const uid = userCredential.user.uid;
      const newStudent = {
        uid,
        fullName: fullName.trim(),
        matricNumber: cleanMatric,
        email: cleanEmail,
        role: 'student',
        level: level || '400L',
        department: department || 'Engineering',
        status: 'active',
        createdAt: new Date().toISOString()
      };

      // Attempt to save user profile to Firestore
      try {
        await window.dbService.saveUser(newStudent);
      } catch (dbErr) {
        console.error('[AuthService] Firestore user profile creation failed after Auth account creation:', dbErr);
        // Rollback Firebase Auth user so we don't leave an orphaned Auth account
        try {
          await userCredential.user.delete();
          console.log('[AuthService] Rolled back Firebase Auth user after profile write failure.');
        } catch (rollbackErr) {
          console.warn('[AuthService] Failed to roll back Auth user:', rollbackErr);
        }
        throw new Error(`Registration failed: Could not write student profile to Firestore (${dbErr.message}). Under Firestore security rules, student accounts may require administrative provisioning.`);
      }

      // NOTE: Removed unauthorized client-side course-enrollment write (`saveCourse`).
      // Under Firestore security rules, students cannot mutate course documents.
      // Enrollment must be performed by the lecturer or administrator.

      this.currentUser = newStudent;
      sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
      this._notifyListeners();

      try {
        await window.dbService.addAuditLog({
          eventType: 'STUDENT_REGISTERED',
          actorUid: uid,
          actorName: newStudent.fullName,
          targetId: uid,
          metadata: `Student ${newStudent.fullName} (${newStudent.matricNumber}) registered in Firebase.`
        });
      } catch (auditErr) {
        console.warn('[AuthService] Audit log write notice:', auditErr);
      }

      return newStudent;
    }

    // Mock / Local Presentation Engine Registration
    const uid = 'student_' + Date.now().toString(36);
    const newStudent = {
      uid,
      fullName: fullName.trim(),
      matricNumber: cleanMatric,
      email: cleanEmail,
      role: 'student',
      level: level || '400L',
      department: department || 'Engineering',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    await window.dbService.saveUser(newStudent);

    // In local presentation mode only, auto-enroll into GET 411 for defense demonstration
    const course = await window.dbService.getCourseById('course_get411');
    if (course && !course.enrolledStudentIds.includes(uid)) {
      course.enrolledStudentIds.push(uid);
      await window.dbService.saveCourse(course);
    }

    this.currentUser = newStudent;
    sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
    this._notifyListeners();

    try {
      await window.dbService.addAuditLog({
        eventType: 'STUDENT_REGISTERED',
        actorUid: uid,
        actorName: newStudent.fullName,
        targetId: uid,
        metadata: `Student ${newStudent.fullName} (${newStudent.matricNumber}) registered locally.`
      });
    } catch (auditErr) {
      console.warn('[AuthService] Audit log write notice:', auditErr);
    }

    return newStudent;
  }

  /**
   * Fast Switcher for Presentation & Demonstration
   * Restricted to Local Presentation Engine Mode
   */
  async quickSwitch(roleOrUid) {
    if (window.firebaseManager && window.firebaseManager.getMode() === 'firebase') {
      throw new Error('Quick-switch demo accounts are disabled in Live Firebase Cloud mode. Please switch to "Local Presentation Engine" mode in settings to use quick-switch demo accounts.');
    }

    let user = null;
    if (roleOrUid === 'admin') {
      user = await window.dbService.getUserById('admin_001');
    } else if (roleOrUid === 'lecturer') {
      user = await window.dbService.getUserById('lecturer_nura');
    } else if (roleOrUid === 'student1' || roleOrUid === 'student' || roleOrUid === 'masari') {
      user = await window.dbService.getUserById('student_001'); // Nura HAMZA MASARI (ENG/2025/37401)
    } else if (roleOrUid === 'student2' || roleOrUid === 'nuhu') {
      user = await window.dbService.getUserById('student_002'); // Abdullahi Nuhu (ENG/2024/31912)
    } else if (roleOrUid === 'student3' || roleOrUid === 'jibril') {
      user = await window.dbService.getUserById('student_003'); // Adamu Jibril (ENG/2024/32388)
    } else if (roleOrUid === 'student4' || roleOrUid === 'karofi') {
      user = await window.dbService.getUserById('student_004'); // Dahiru Umar Karofi (ENG/2024/34360)
    } else if (roleOrUid === 'student5' || roleOrUid === 'promise' || roleOrUid === 'oloyede') {
      user = await window.dbService.getUserById('student_005'); // OLOYEDE PROMISE ISSAC (ENG/2024/35303)
    } else if (roleOrUid === 'student6' || roleOrUid === 'taiye' || roleOrUid === 'olonitola') {
      user = await window.dbService.getUserById('student_006'); // TAIYE JOHN OLONITOLA (ENG/2024/34750)
    } else if (roleOrUid === 'student7' || roleOrUid === 'bakir' || roleOrUid === 'mustapha') {
      user = await window.dbService.getUserById('student_007'); // BAKIR MUHAMMAD MUSTAPHA (ENG/2024/35485)
    } else {
      user = await window.dbService.getUserById(roleOrUid) || await window.dbService.getUserByMatricNumber(roleOrUid);
    }

    if (!user) {
      throw new Error('Target user account not found for quick switch.');
    }

    this.currentUser = user;
    sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
    this._notifyListeners();

    window.app?.showToast(`Switched account to: ${user.fullName} (${user.role.toUpperCase()})`, 'info');
    return user;
  }

  async logout() {
    if (this.currentUser) {
      try {
        await window.dbService.addAuditLog({
          eventType: 'USER_LOGOUT',
          actorUid: this.currentUser.uid,
          actorName: this.currentUser.fullName,
          targetId: this.currentUser.role,
          metadata: 'Signed out of session'
        });
      } catch (e) {
        console.warn('Audit log write error on logout:', e);
      }
    }

    if (window.firebaseManager && window.firebaseManager.auth) {
      try {
        await window.firebaseManager.auth.signOut();
      } catch (e) {
        console.warn('Firebase signout warning:', e);
      }
    }

    this.currentUser = null;
    sessionStorage.removeItem(STORAGE_KEY_AUTH_USER);
    this._notifyListeners();
  }
}

const authService = new AuthService();
window.authService = authService;

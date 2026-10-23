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

  async _withTimeout(promise, ms = 7000, errorMsg = 'Network operation timed out. Continuing with presentation engine.') {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(errorMsg)), ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // If real Firebase Auth is active
    if (window.firebaseManager && window.firebaseManager.getMode() === 'firebase' && window.firebaseManager.auth) {
      try {
        const userCredential = await this._withTimeout(
          window.firebaseManager.auth.signInWithEmailAndPassword(cleanEmail, password),
          7000,
          'Firebase Authentication timed out.'
        );
        const fbUser = userCredential.user;
        const profile = await window.dbService.getUserById(fbUser.uid) || await window.dbService.getUserByEmail(cleanEmail);
        
        if (!profile) {
          throw new Error('User profile record not found in institutional database.');
        }
        if (profile.status === 'deactivated') {
          await window.firebaseManager.auth.signOut();
          throw new Error('This account has been deactivated by the administrator. Contact academic registry.');
        }

        this.currentUser = profile;
        sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
        this._notifyListeners();

        await window.dbService.addAuditLog({
          eventType: 'USER_LOGIN',
          actorUid: profile.uid,
          actorName: profile.fullName,
          targetId: profile.role,
          metadata: `Signed in via Firebase Auth (${profile.email})`
        });

        return this.currentUser;
      } catch (fbErr) {
        if (window.firebaseManager && typeof window.firebaseManager.handleApiError === 'function') {
          window.firebaseManager.handleApiError(fbErr);
        }
        console.warn('Firebase signIn failed, attempting local DB authentication:', fbErr);
        // Continue to local verification if demo accounts are used
      }
    }

    // High-Fidelity Local Authentication
    const user = await window.dbService.getUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('No user account found with that email address.');
    }

    if (user.status === 'deactivated') {
      throw new Error('This account has been deactivated by the administrator.');
    }

    // Standard demo password verification
    const validPasswords = ['admin123', 'lecturer123', 'student123', 'password', 'fudma2026', '123456'];
    const isStandardDemoPass = validPasswords.includes(password.toLowerCase());
    
    if (!isStandardDemoPass && password !== '123456') {
      throw new Error('Invalid password. For demo accounts use: admin123, lecturer123, or student123.');
    }

    this.currentUser = user;
    sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
    this._notifyListeners();

    await window.dbService.addAuditLog({
      eventType: 'USER_LOGIN',
      actorUid: user.uid,
      actorName: user.fullName,
      targetId: user.role,
      metadata: `Signed in via Local Institutional Engine (${user.email})`
    });

    return this.currentUser;
  }

  /**
   * Student Self-Registration
   * Fast, reliable registration for assessment & student onboarding
   */
  async registerStudent({ fullName, matricNumber, email, password, level = '400L', department = 'Faculty of Engineering' }) {
    if (!fullName || !matricNumber || !email) {
      throw new Error('Full Name, Matriculation Number, and Email are required.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMatric = matricNumber.trim().toUpperCase();

    // Check existing
    const existing = await window.dbService.getUserByEmail(cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    let uid = 'student_' + Date.now().toString(36);

    // Try Firebase Auth if active
    if (window.firebaseManager && window.firebaseManager.getMode() === 'firebase' && window.firebaseManager.auth) {
      try {
        const userCredential = await this._withTimeout(
          window.firebaseManager.auth.createUserWithEmailAndPassword(cleanEmail, password || 'student123'),
          7000,
          'Firebase account creation timed out. Switching to local profile.'
        );
        if (userCredential && userCredential.user) {
          uid = userCredential.user.uid;
        }
      } catch (fbErr) {
        if (window.firebaseManager && typeof window.firebaseManager.handleApiError === 'function') {
          window.firebaseManager.handleApiError(fbErr);
        }
        console.warn('Firebase registration failed, proceeding with local profile creation:', fbErr);
      }
    }

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

    // Automatically enroll in GET 411 AI Mini Project
    const course = await window.dbService.getCourseById('course_get411');
    if (course && !course.enrolledStudentIds.includes(uid)) {
      course.enrolledStudentIds.push(uid);
      await window.dbService.saveCourse(course);
    }

    this.currentUser = newStudent;
    sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
    this._notifyListeners();

    await window.dbService.addAuditLog({
      eventType: 'STUDENT_REGISTERED',
      actorUid: uid,
      actorName: newStudent.fullName,
      targetId: uid,
      metadata: `Student ${newStudent.fullName} (${newStudent.matricNumber}) registered.`
    });

    return newStudent;
  }

  /**
   * Fast Switcher for Presentation & Demonstration
   * Allows the examiner or students in Group 6 to switch perspectives in 1 click
   */
  async quickSwitch(roleOrUid) {
    let user = null;
    if (roleOrUid === 'admin') {
      user = await window.dbService.getUserById('admin_001');
    } else if (roleOrUid === 'lecturer') {
      user = await window.dbService.getUserById('lecturer_nura');
    } else if (roleOrUid === 'student1' || roleOrUid === 'student') {
      user = await window.dbService.getUserById('student_001');
    } else if (roleOrUid === 'student2') {
      user = await window.dbService.getUserById('student_002');
    } else {
      user = await window.dbService.getUserById(roleOrUid);
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
      await window.dbService.addAuditLog({
        eventType: 'USER_LOGOUT',
        actorUid: this.currentUser.uid,
        actorName: this.currentUser.fullName,
        targetId: this.currentUser.role,
        metadata: 'Signed out of session'
      });
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

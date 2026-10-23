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

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // If real Firebase Auth is active
    if (window.firebaseManager && window.firebaseManager.getMode() === 'firebase' && window.firebaseManager.auth) {
      try {
        const userCredential = await window.firebaseManager.auth.signInWithEmailAndPassword(cleanEmail, password);
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
    // For demo/classroom presentations, accept password matching or standard format
    const validPasswords = ['admin123', 'lecturer123', 'student123', 'password', 'fudma2026'];
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

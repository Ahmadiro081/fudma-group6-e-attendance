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

  getAccessToken() {
    let token = sessionStorage.getItem('fudma_access_token');
    if (!token && window.supabaseClient) {
      try {
        const session = window.supabaseClient.auth.session ? window.supabaseClient.auth.session() : null;
        if (session?.access_token) return session.access_token;
      } catch (e) {}
    }
    return token;
  }

  async changePassword(newPassword) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (newPassword === 'Fudma@2026' || newPassword.toLowerCase() === 'fudma@2026') {
      throw new Error('New password cannot be the temporary default password.');
    }

    const token = this.getAccessToken();
    if (!token) {
      throw new Error('No active authentication session. Please sign in again.');
    }

    const resp = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.error || 'Failed to update password.');
    }

    if (this.currentUser) {
      this.currentUser.mustChangePassword = false;
      sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
      this._notifyListeners();
    }

    return data;
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

    // Determine effective engine mode: default is 'supabase'
    const engineMode = (window.firebaseManager && window.firebaseManager.getMode()) || 'supabase';

    // 1. PRIMARY PRODUCTION ENGINE: Supabase Cloud Authentication & PostgreSQL
    if (engineMode === 'supabase') {
      let profile = null;

      // Primary: Call serverless /api/auth/login
      try {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cleanInput, password })
        });

        if (resp.ok) {
          const body = await resp.json();
          if (body.session?.access_token) {
            sessionStorage.setItem('fudma_access_token', body.session.access_token);
          }
          if (body.session && window.supabaseClient) {
            await window.supabaseClient.auth.setSession({
              access_token: body.session.access_token,
              refresh_token: body.session.refresh_token
            });
          }
          profile = body.user;
          if (body.mustChangePassword) {
            profile.mustChangePassword = true;
          }
        } else {
          const errData = await resp.json().catch(() => ({}));
          const status = resp.status;
          if (status === 401) {
            throw new Error('Invalid institutional credentials or password.');
          } else if (status === 403) {
            throw new Error(errData.error || 'This account has been deactivated. Contact the Academic Registry.');
          } else if (status === 404) {
            throw new Error(errData.error || 'No institutional user profile found for this account.');
          } else if (status === 429) {
            throw new Error('Too many authentication attempts. Please wait 60 seconds.');
          } else {
            throw new Error(errData.error || 'Server authentication service error. Please verify Vercel environment variables.');
          }
        }
      } catch (apiErr) {
        // If fetch threw a definitive application error from the server (401, 403, 404, 429, 500)
        if (apiErr.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('NetworkError') && !apiErr.message.includes('Failed to fetch')) {
          throw apiErr;
        }

        // Direct client fallback strictly for local dev server without serverless functions
        if (window.supabaseClient) {
          const isEmail = cleanInput.includes('@');
          let resolvedEmail = isEmail ? cleanInput.toLowerCase() : null;

          if (!resolvedEmail) {
            const user = await window.dbService.getUserByMatricNumber(cleanInput);
            if (user && user.email) resolvedEmail = user.email;
          }

          if (!resolvedEmail) {
            throw new Error('Invalid institutional credentials or password.');
          }

          const { data, error: sbErr } = await window.supabaseClient.auth.signInWithPassword({
            email: resolvedEmail,
            password
          });

          if (sbErr) {
            console.error('[AuthService] Supabase client login error:', sbErr);
            throw new Error('Invalid institutional credentials or password.');
          }

          if (data && data.user) {
            profile = await window.dbService.getUserById(data.user.id);
            if (!profile) profile = await window.dbService.getUserByEmail(data.user.email);
          }
        } else {
          throw new Error('Authentication service is currently unreachable. Please check your network connection or verify Vercel environment variables.');
        }
      }

      if (!profile) {
        if (window.supabaseClient) await window.supabaseClient.auth.signOut();
        throw new Error('Authenticated with Supabase, but no institutional user profile was found.');
      }

      if (profile.status === 'deactivated') {
        if (window.supabaseClient) await window.supabaseClient.auth.signOut();
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
          metadata: `Signed in via Supabase Auth (${profile.email})`
        });
      } catch (auditErr) {
        console.warn('[AuthService] Audit log write notice:', auditErr);
      }

      return this.currentUser;
    }

    // 2. If Firebase Live Mode is active
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
          userFacingMsg = 'Invalid institutional credentials or password. Please verify your credentials.';
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

    // 3. High-Fidelity Local Authentication (Explicit Demo / Presentation Mode ONLY)
    if (engineMode !== 'mock') {
      throw new Error(`Authentication for engine mode "${engineMode}" could not be completed.`);
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

    // Demo / Local password verification supporting assigned, user-registered, or standard passwords
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
    const isPasswordValid = 
      (user.password && user.password === cleanPassword) ||
      validPasswords.includes(cleanPassword.toLowerCase()) || 
      cleanPassword === 'Fudma@2026';
    
    if (!isPasswordValid) {
      throw new Error('Invalid institutional password. Please check your credentials.');
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
    if (!fullName || !matricNumber || !email || !password) {
      throw new Error('Full Name, Matriculation Number, Email, and Password are required.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMatric = matricNumber.trim().toUpperCase().replace(/\s+/g, '');
    const engineMode = (window.firebaseManager && window.firebaseManager.getMode()) || 'supabase';

    // 1. PRIMARY PRODUCTION ENGINE: Supabase Cloud Registration
    if (engineMode === 'supabase') {
      try {
        const resp = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(),
            matricNumber: cleanMatric,
            email: cleanEmail,
            password: password,
            level: level || '400L',
            department: department || 'Faculty of Engineering'
          })
        });

        if (resp.ok) {
          const body = await resp.json();
          if (body.session && window.supabaseClient) {
            await window.supabaseClient.auth.setSession({
              access_token: body.session.access_token,
              refresh_token: body.session.refresh_token
            });
          }
          const registeredUser = body.user;
          this.currentUser = registeredUser;
          sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
          this._notifyListeners();
          return registeredUser;
        } else {
          const errData = await resp.json().catch(() => ({}));
          // ALWAYS throw server error immediately - NEVER fall back to Firestore!
          throw new Error(errData.error || 'Student registration could not be completed.');
        }
      } catch (apiErr) {
        // If it's a server response error (400, 409, 429, 500)
        if (apiErr.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('NetworkError') && !apiErr.message.includes('Failed to fetch')) {
          throw apiErr;
        }

        // Direct client fallback strictly for local development without serverless functions
        if (window.supabaseClient) {
          const { data, error: signUpErr } = await window.supabaseClient.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                full_name: fullName.trim(),
                matric_number: cleanMatric,
                department: department || 'Faculty of Engineering',
                level: level || '400L'
              }
            }
          });

          if (signUpErr) {
            console.error('[AuthService] Supabase signUp failed:', signUpErr);
            throw new Error(signUpErr.message || 'Supabase account creation failed.');
          }

          const newStudent = {
            uid: data?.user?.id || 'pending',
            id: data?.user?.id || 'pending',
            fullName: fullName.trim(),
            matricNumber: cleanMatric,
            email: cleanEmail,
            role: 'student',
            department: department || 'Faculty of Engineering',
            level: level || '400L',
            status: 'active'
          };

          this.currentUser = newStudent;
          sessionStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(this.currentUser));
          this._notifyListeners();
          return newStudent;
        }

        throw new Error(apiErr.message || 'Registration service is currently unreachable.');
      }
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
      password: password ? password.trim() : 'Fudma@2026',
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
    if (window.dbService && window.dbService.isLiveSupabase()) {
      throw new Error('Quick-switch demo accounts are disabled in Live Supabase Cloud mode. Please switch to "Local Presentation Engine" mode in settings to use quick-switch demo accounts.');
    }
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
    } else if (roleOrUid === 'student5' || roleOrUid === 'promise' || roleOrUid === 'oloyede' || roleOrUid === '35303' || roleOrUid === 'ENG/2024/35303' || roleOrUid === 'mechatronics') {
      user = await window.dbService.getUserById('student_005'); // OLOYEDE PROMISE ISSAC (ENG/2024/35303) - Mechatronics
    } else if (roleOrUid === 'student6' || roleOrUid === 'taiye' || roleOrUid === 'olonitola') {
      user = await window.dbService.getUserById('student_006'); // TAIYE JOHN OLONITOLA (ENG/2024/34750)
    } else if (roleOrUid === 'student7' || roleOrUid === 'bakir' || roleOrUid === 'mustapha') {
      user = await window.dbService.getUserById('student_007'); // BAKIR MUHAMMAD MUSTAPHA (ENG/2024/35485)
    } else if (roleOrUid === 'student8' || roleOrUid === 'bello' || roleOrUid === 'muhamed' || roleOrUid === 'muhammad' || roleOrUid === '32969' || roleOrUid === 'ENG/2024/32969') {
      user = await window.dbService.getUserById('student_008'); // Abdullahi bello Muhamed (ENG/2024/32969)
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

    if (window.supabaseClient) {
      try {
        await window.supabaseClient.auth.signOut();
      } catch (e) {
        console.warn('Supabase signout warning:', e);
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
    sessionStorage.removeItem('fudma_access_token');
    this._notifyListeners();
  }
}

const authService = new AuthService();
window.authService = authService;

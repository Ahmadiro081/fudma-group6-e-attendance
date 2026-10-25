/**
 * FUDMA E-Attendance System - Main Application Orchestrator
 * Course: GET 411 | Group 6 | Academic Session: 2026/2027
 */

class Application {
  constructor() {
    this.currentView = 'landing-view';
  }

  async init() {
    console.log('Initializing FUDMA E-Attendance System (Group 6)...');

    // 1. Initialize local persistent database
    window.dbService.initializeDefaultData();

    // 2. Setup Global Event Listeners immediately so buttons are interactive without awaiting network
    this.setupEventListeners();

    // 3. Setup Auth listener
    window.authService.onAuthStateChanged((user) => {
      this.updateNavbarUser(user);
      this.updateEngineBadge();
    });

    // 4. Await Supabase readiness if present
    if (window.supabaseReady) {
      try {
        await window.supabaseReady;
      } catch (sbErr) {
        console.warn('Supabase initialization notice:', sbErr);
      }
    }

    // 5. Initialize Firebase if configured
    if (window.firebaseManager) {
      await window.firebaseManager.initialize();
    }

    this.updateEngineBadge();

    // 6. Check for incoming mobile QR attendance link in URL hash
    const fullHash = window.location.hash || '';
    if (fullHash.includes('attendance')) {
      this.handleIncomingAttendanceUrl(fullHash);
    } else {
      const hash = fullHash.replace('#', '');
      if (hash && document.getElementById(`${hash}-view`)) {
        this.navigate(`${hash}-view`);
      } else {
        this.navigate('landing-view');
      }
    }

    console.log('FUDMA E-Attendance System ready.');
  }

  setupEventListeners() {
    // Navigation link clicks
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = el.getAttribute('data-nav');
        this.navigate(targetView);
      });
    });

    // Close modals on escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        window.lecturerCtrl?.closeProjectorModal();
        window.studentCtrl?.closeScannerModal();
      }
    });
  }

  navigate(viewId) {
    // Check route guards
    const user = window.authService.currentUser;
    const isFirebase = window.firebaseManager && window.firebaseManager.getMode() === 'firebase';
    const isProtected = ['admin-view', 'lecturer-view', 'student-view'].includes(viewId);

    // In Live Firebase mode, verify active Firebase Auth session matches stored profile for protected views
    if (isFirebase && user && isProtected) {
      const fbUser = window.firebaseManager.auth ? window.firebaseManager.auth.currentUser : null;
      if (!fbUser || fbUser.uid !== user.uid) {
        window.authService.logout();
        this.showToast('Your cloud authentication session has expired or is invalid. Please sign in again.', 'warning');
        this.showLoginModal();
        return null;
      }
    }

    // Enforce mandatory password update before accessing protected features
    if (user && user.mustChangePassword && isProtected) {
      this.showToast('You must change your temporary password before accessing portal features.', 'warning');
      this.showChangePasswordModal();
      return null;
    }

    if (viewId === 'admin-view' && (!user || user.role !== 'admin')) {
      this.showToast('Please sign in with administrator credentials.', 'warning');
      this.showLoginModal('admin');
      return null;
    }

    if (viewId === 'lecturer-view' && (!user || (user.role !== 'lecturer' && user.role !== 'admin'))) {
      this.showToast('Please sign in as a course lecturer.', 'warning');
      this.showLoginModal('lecturer');
      return null;
    }

    if (viewId === 'student-view' && (!user || user.role !== 'student')) {
      this.showToast('Please sign in as a student to access the student portal.', 'warning');
      this.showLoginModal('student');
      return null;
    }

    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    // Show target view
    let renderPromise = null;
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      this.currentView = viewId;
      window.location.hash = viewId.replace('-view', '');
      window.scrollTo(0, 0);

      // Render view-specific controller and capture returned Promise if async
      if (viewId === 'lecturer-view') renderPromise = window.lecturerCtrl?.render();
      if (viewId === 'student-view') renderPromise = window.studentCtrl?.render();
      if (viewId === 'admin-view') renderPromise = window.adminCtrl?.render();
      if (viewId === 'project-info-view') renderPromise = window.projectInfoCtrl?.render();
    }

    // Update active nav links
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-nav') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    return renderPromise;
  }

  updateNavbarUser(user) {
    const userControls = document.getElementById('navbar-user-controls');
    if (!userControls) return;

    if (user) {
      const initials = user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
      const roleChipClass = user.role === 'admin' ? 'chip-admin' : user.role === 'lecturer' ? 'chip-lecturer' : 'chip-student';

      userControls.innerHTML = `
        <div class="user-badge" title="${user.fullName} (${user.email})">
          <div class="user-avatar">${initials}</div>
          <div class="user-meta">
            <div class="user-name">${user.fullName}</div>
            <span class="user-role-chip ${roleChipClass}">${user.role}</span>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="window.authService.logout()">
          Sign Out
        </button>
      `;
    } else {
      userControls.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="window.app.showLoginModal()">
          Sign In
        </button>
      `;
    }
  }

  updateEngineBadge() {
    const badge = document.getElementById('engine-mode-badge');
    if (!badge) return;

    if (window.dbService && window.dbService.isLiveSupabase()) {
      badge.className = 'engine-indicator firebase';
      badge.innerHTML = `<span class="pulse-dot green"></span> Live Supabase Cloud`;
      badge.title = 'Connected to official Supabase PostgreSQL Cloud database.';
      return;
    }

    const mgr = window.firebaseManager;
    if (mgr && mgr.mode === 'firebase') {
      if (mgr.status === 'connected') {
        badge.className = 'engine-indicator firebase';
        badge.innerHTML = `<span class="pulse-dot green"></span> Live Firebase Cloud`;
        badge.title = `Connected to Firebase project: ${mgr.config.projectId} (${mgr.config.functionsRegion || 'us-central1'}). Click to configure.`;
      } else if (mgr.status === 'error') {
        badge.className = 'engine-indicator error';
        badge.innerHTML = `<span class="pulse-dot red"></span> Firebase Error`;
        badge.title = `Firebase Error: ${mgr.initError?.message || 'Configuration error'}. Click to inspect or reconfigure.`;
      } else {
        badge.className = 'engine-indicator firebase';
        badge.innerHTML = `<span class="pulse-dot amber"></span> Initializing Firebase...`;
        badge.title = 'Connecting to Firebase Cloud...';
      }
    } else {
      badge.className = 'engine-indicator mock';
      badge.innerHTML = `<span class="pulse-dot amber"></span> Presentation Engine (Local)`;
      badge.title = 'Running in high-fidelity local database engine. Click to connect real Supabase or Firebase.';
    }
  }

  showLoginModal(preferredRole = null) {
    const isSupabase = window.dbService && window.dbService.isLiveSupabase();
    const isMock = !isSupabase && (window.firebaseManager ? window.firebaseManager.getMode() === 'mock' : true);

    this.openModal('Sign In to FUDMA E-Attendance', `
      <div style="margin-bottom: 20px;">
        <p style="font-size: 0.88rem; color: var(--gray-600);">
          ${isMock ? 'Enter your institutional credentials or use the demonstration quick-switch buttons below:' : (isSupabase ? 'Enter your official FUDMA institutional credentials to authenticate with Supabase Cloud:' : 'Enter your official FUDMA institutional credentials to authenticate with Firebase Cloud:')}
        </p>

        <!-- Standard Login Form -->
        <form id="app-login-form" onsubmit="window.app.handleLoginForm(event)">
          <div class="form-group">
            <label>Institutional Email or Matric Number</label>
            <input type="text" id="login-email" class="form-control" placeholder="e.g. ENG/2024/35303 or email" required />
            <span class="form-help">Enter your FUDMA matric number (e.g., <code>ENG/2024/35303</code>) or institutional email.</span>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="login-password" class="form-control" placeholder="Enter your password" required />
            <span class="form-help">Enter your assigned institutional password.</span>
          </div>
          <div id="login-error-msg" style="color: var(--danger-solid); font-size: 0.82rem; margin-top: 6px; display: none;"></div>
          
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 14px;">
            Sign In
          </button>

          <div style="text-align: center; margin-top: 12px;">
            <button type="button" class="btn btn-sm" style="background: transparent; color: var(--primary-700); font-weight: 600; text-decoration: underline;" onclick="window.app.closeModal(); window.studentCtrl.openStudentSignUpModal();">
              🎓 New student? Click here to register account
            </button>
          </div>
        </form>

        <!-- Quick Demo Switcher Section (ONLY available in Local Presentation Engine Mode) -->
        ${isMock ? `
          <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--gray-200);">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--gray-500); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">
              ⚡ Quick Demo Accounts (7 Students & Faculty)
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; padding-right: 4px;">
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('lecturer')">
                👨‍🏫 <strong>Malam Nura Muhammad</strong> (Lecturer - GET 411)
              </button>
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('student5')">
                🎓 <strong>OLOYEDE PROMISE ISSAC</strong> (ENG/2024/35303)
              </button>
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('student1')">
                🎓 <strong>Nura HAMZA MASARI</strong> (ENG/2025/37401)
              </button>
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('student2')">
                🎓 <strong>Abdullahi Nuhu</strong> (ENG/2024/31912)
              </button>
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('student3')">
                🎓 <strong>Adamu Jibril</strong> (ENG/2024/32388)
              </button>
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('student4')">
                🎓 <strong>Dahiru Umar Karofi</strong> (ENG/2024/34360)
              </button>
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('student6')">
                🎓 <strong>TAIYE JOHN OLONITOLA</strong> (ENG/2024/34750)
              </button>
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('student7')">
                🎓 <strong>BAKIR MUHAMMAD MUSTAPHA</strong> (ENG/2024/35485)
              </button>
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('admin')">
                🛡️ <strong>Academic Registry Admin</strong> (System Administrator)
              </button>
            </div>
          </div>
        ` : `
          <div style="margin-top: 20px; padding: 12px; background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); font-size: 0.8rem; color: var(--gray-600);">
            🔒 <strong>${isSupabase ? 'Live Supabase Cloud Mode' : 'Live Firebase Cloud Mode'}:</strong> Authenticating directly against cloud PostgreSQL database. Demo quick-switching is reserved for <em>Local Presentation Engine</em> in database settings.
          </div>
        `}
      </div>
    `);

    // Auto-fill demo credentials ONLY in mock mode
    if (isMock) {
      if (preferredRole === 'lecturer') {
        document.getElementById('login-email').value = 'nura.muhammad@fudma.edu.ng';
        document.getElementById('login-password').value = 'lecturer123';
      } else if (preferredRole === 'student') {
        document.getElementById('login-email').value = 'ENG/2024/35303';
        document.getElementById('login-password').value = 'Fudma@2026';
      } else if (preferredRole === 'admin') {
        document.getElementById('login-email').value = 'admin@fudma.edu.ng';
        document.getElementById('login-password').value = 'admin123';
      }
    }
  }

  async handleLoginForm(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error-msg');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : 'Sign In';

    if (errBox) errBox.style.display = 'none';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Signing in...';
    }

    try {
      const user = await window.authService.login(email, password);
      this.closeModal();

      if (user.mustChangePassword) {
        this.showToast('Temporary credentials detected. Please choose a permanent, secure institutional password.', 'warning');
        this.showChangePasswordModal();
        return;
      }

      // Check for pending attendance submission from scanned QR url
      const pendingAttendanceStr = sessionStorage.getItem('fudma_pending_attendance');
      if (pendingAttendanceStr && user.role === 'student') {
        sessionStorage.removeItem('fudma_pending_attendance');
        try {
          const pending = JSON.parse(pendingAttendanceStr);
          this.executePendingAttendance(pending);
          return;
        } catch (e) {}
      }

      this.showToast(`Welcome back, ${user.fullName}!`, 'success');

      // Direct to respective role view
      if (user.role === 'admin') this.navigate('admin-view');
      else if (user.role === 'lecturer') this.navigate('lecturer-view');
      else this.navigate('student-view');
    } catch (err) {
      if (errBox) {
        errBox.innerText = err.message || 'Authentication error.';
        errBox.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  }

  showChangePasswordModal() {
    this.openModal('Mandatory Password Update', `
      <div style="margin-bottom: 20px;">
        <div style="background: #fff8e6; border: 1px solid #ffd591; padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px; font-size: 0.85rem; color: #873800;">
          🔒 <strong>Security Policy:</strong> You are currently using a temporary onboarding password (e.g. <code>Fudma@2026</code>). You must set a permanent institutional password before accessing portal features.
        </div>
        <form id="change-password-form" onsubmit="window.app.handleChangePasswordForm(event)">
          <div class="form-group">
            <label>New Password</label>
            <input type="password" id="new-password" class="form-control" placeholder="Enter new strong password" required />
            <span class="form-help">Must be at least 8 characters, include uppercase, lowercase, number, and special character.</span>
          </div>
          <div class="form-group">
            <label>Confirm New Password</label>
            <input type="password" id="confirm-new-password" class="form-control" placeholder="Re-enter new password" required />
          </div>
          <div id="change-pass-error-msg" style="color: var(--danger-solid); font-size: 0.82rem; margin-top: 6px; display: none;"></div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 14px;">
            Update Password & Continue
          </button>
        </form>
      </div>
    `);
  }

  async handleChangePasswordForm(e) {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    const errBox = document.getElementById('change-pass-error-msg');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (errBox) errBox.style.display = 'none';

    if (newPassword !== confirmPassword) {
      if (errBox) {
        errBox.innerText = 'Passwords do not match. Please re-enter.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (newPassword.length < 8) {
      if (errBox) {
        errBox.innerText = 'Password must be at least 8 characters long.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (newPassword === 'Fudma@2026' || newPassword.toLowerCase() === 'fudma@2026') {
      if (errBox) {
        errBox.innerText = 'New password cannot be the temporary default password.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Updating password...';
    }

    try {
      await window.authService.changePassword(newPassword);
      this.closeModal();
      this.showToast('Password updated successfully! Welcome to your portal.', 'success');

      const user = window.authService.currentUser;
      if (user) {
        if (user.role === 'admin') this.navigate('admin-view');
        else if (user.role === 'lecturer') this.navigate('lecturer-view');
        else this.navigate('student-view');
      }
    } catch (err) {
      if (errBox) {
        errBox.innerText = err.message || 'Failed to update password.';
        errBox.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Update Password & Continue';
      }
    }
  }

  handleIncomingAttendanceUrl(fullHash) {
    try {
      let queryString = '';
      if (fullHash.includes('?')) {
        queryString = fullHash.split('?')[1];
      }
      const params = new URLSearchParams(queryString);
      const sessionId = params.get('sessionId');
      const token = params.get('token');

      if (!sessionId) {
        this.navigate('landing-view');
        return;
      }

      const user = window.authService.currentUser;
      if (!user || user.role !== 'student') {
        sessionStorage.setItem('fudma_pending_attendance', JSON.stringify({ sessionId, token }));
        this.showToast('Please sign in with your student credentials to confirm lecture attendance.', 'info');
        this.showLoginModal('student');
        return;
      }

      this.executePendingAttendance({ sessionId, token });
    } catch (e) {
      console.warn('Error handling incoming attendance URL:', e);
      this.navigate('landing-view');
    }
  }

  async executePendingAttendance({ sessionId, token }) {
    this.navigate('student-view');
    try {
      this.showToast('Submitting attendance for this lecture session...', 'info');
      const accessToken = window.authService.getAccessToken();
      let result;

      if (accessToken) {
        const resp = await fetch('/api/attendance/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            sessionId,
            qrToken: token,
            verificationMethod: 'qr_scan'
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || 'Attendance submission rejected.');
        }
        result = data.attendance || data;
      } else {
        result = await window.dbService.recordAttendanceSubmission({
          sessionId,
          studentUid: window.authService.currentUser.uid,
          verificationMethod: 'qr_scan',
          qrToken: token
        });
      }

      this.showToast(result.isLate ? 'Attendance recorded (Late Arrival).' : 'Attendance recorded successfully (Present)!', result.isLate ? 'warning' : 'success');
      window.studentCtrl?.render();
    } catch (err) {
      this.showToast(err.message || 'Could not record attendance.', 'danger');
    }
  }

  async quickLogin(role) {
    if (window.firebaseManager && window.firebaseManager.getMode() === 'firebase') {
      this.showToast('Demo quick-switch is disabled in Live Firebase Cloud mode. Switch to "Local Presentation Engine" in settings or sign in with official credentials.', 'warning');
      return;
    }
    try {
      const user = await window.authService.quickSwitch(role);
      this.closeModal();
      
      if (user.role === 'admin') this.navigate('admin-view');
      else if (user.role === 'lecturer') this.navigate('lecturer-view');
      else this.navigate('student-view');
    } catch (err) {
      this.showToast(err.message || 'Quick login failed.', 'danger');
    }
  }

  // --- Modal Management ---
  openModal(title, bodyHtml, isLarge = false) {
    const overlay = document.getElementById('global-modal-overlay');
    const dialog = document.getElementById('global-modal-dialog');
    const titleElem = document.getElementById('global-modal-title');
    const bodyElem = document.getElementById('global-modal-body');

    if (!overlay || !dialog || !titleElem || !bodyElem) return;

    titleElem.innerText = title;
    bodyElem.innerHTML = bodyHtml;

    if (isLarge) dialog.classList.add('modal-lg');
    else dialog.classList.remove('modal-lg');

    overlay.classList.add('active');
  }

  closeModal() {
    const overlay = document.getElementById('global-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  // --- Toast Notifications ---
  showToast(message, type = 'info', title = null) {
    const container = document.getElementById('global-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'danger') icon = '❌';

    toast.innerHTML = `
      <div style="font-size: 1.2rem; line-height: 1;">${icon}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-msg">${message}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 300);
    }, 4000);
  }

  // --- Firebase Config Modal ---
  // --- Database & Engine Configuration Modal ---
  openFirebaseConfigModal() {
    const mgr = window.firebaseManager;
    const fbConfig = mgr ? mgr.config : {};
    const currentMode = localStorage.getItem('fudma_engine_mode_v1') || 'supabase';
    const currentSbUrl = localStorage.getItem('fudma_supabase_url') || (window.__ENV__?.VITE_SUPABASE_URL) || 'https://mkhzvzgluddaqaxilgkz.supabase.co';
    const currentSbKey = localStorage.getItem('fudma_supabase_publishable_key') || (window.__ENV__?.VITE_SUPABASE_PUBLISHABLE_KEY) || '';

    this.openModal('Database Engine & Cloud Backend Configuration', `
      <div>
        <p style="font-size: 0.85rem; color: var(--gray-600); margin-bottom: 14px;">
          FUDMA Group 6 E-Attendance System supports <strong>Live Supabase Cloud (PostgreSQL)</strong>, an offline <strong>Local Presentation Engine</strong> for classroom defense, and <strong>Google Firebase</strong> for legacy recovery.
        </p>

        <form id="engine-config-form" onsubmit="window.app.handleSaveDatabaseConfig(event)">
          <div class="form-group">
            <label>Operating Engine Mode</label>
            <select id="cfg-mode" class="form-control" onchange="window.app.toggleConfigFields(this.value)">
              <option value="supabase" ${currentMode === 'supabase' ? 'selected' : ''}>⚡ Live Supabase Cloud (PostgreSQL & Auth) - Active</option>
              <option value="mock" ${currentMode === 'mock' ? 'selected' : ''}>🛡️ Local Presentation Engine (Offline Simulation & Demo Roster)</option>
              <option value="firebase" ${currentMode === 'firebase' ? 'selected' : ''}>☁️ Google Firebase (Legacy Recovery)</option>
            </select>
          </div>

          <!-- Supabase Configuration Section -->
          <div id="cfg-section-supabase" style="display: ${currentMode === 'supabase' ? 'block' : 'none'};">
            <div class="form-group">
              <label>Supabase Project URL</label>
              <input type="text" id="cfg-sbUrl" class="form-control" value="${currentSbUrl}" placeholder="https://mkhzvzgluddaqaxilgkz.supabase.co" />
              <span class="form-help">Default endpoint: <code>https://mkhzvzgluddaqaxilgkz.supabase.co</code></span>
            </div>
            <div class="form-group">
              <label>Supabase Publishable / Anon Key</label>
              <input type="text" id="cfg-sbKey" class="form-control" value="${currentSbKey}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
              <span class="form-help">Public client key. Never paste the secret service-role key in the browser.</span>
            </div>
          </div>

          <!-- Firebase Configuration Section -->
          <div id="cfg-section-firebase" style="display: ${currentMode === 'firebase' ? 'block' : 'none'};">
            <div class="form-grid">
              <div class="form-group">
                <label>API Key</label>
                <input type="text" id="cfg-apiKey" class="form-control" value="${fbConfig.apiKey || ''}" placeholder="AIzaSy..." />
              </div>
              <div class="form-group">
                <label>Project ID</label>
                <input type="text" id="cfg-projectId" class="form-control" value="${fbConfig.projectId || ''}" placeholder="fudma-eattendance-xxxx" />
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>Auth Domain</label>
                <input type="text" id="cfg-authDomain" class="form-control" value="${fbConfig.authDomain || ''}" placeholder="fudma-xxxx.firebaseapp.com" />
              </div>
              <div class="form-group">
                <label>App ID</label>
                <input type="text" id="cfg-appId" class="form-control" value="${fbConfig.appId || ''}" placeholder="1:xxxx:web:xxxx" />
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Close</button>
            <button type="submit" class="btn btn-primary">Save Configuration</button>
          </div>
        </form>
      </div>
    `, true);
  }

  toggleConfigFields(mode) {
    const sbSec = document.getElementById('cfg-section-supabase');
    const fbSec = document.getElementById('cfg-section-firebase');
    if (sbSec) sbSec.style.display = mode === 'supabase' ? 'block' : 'none';
    if (fbSec) fbSec.style.display = mode === 'firebase' ? 'block' : 'none';
  }

  async handleSaveDatabaseConfig(e) {
    e.preventDefault();
    const mode = document.getElementById('cfg-mode').value;
    localStorage.setItem('fudma_engine_mode_v1', mode);

    if (mode === 'supabase') {
      const sbUrl = (document.getElementById('cfg-sbUrl')?.value || '').trim();
      const sbKey = (document.getElementById('cfg-sbKey')?.value || '').trim();
      if (sbUrl) localStorage.setItem('fudma_supabase_url', sbUrl);
      if (sbKey) localStorage.setItem('fudma_supabase_publishable_key', sbKey);
      if (window.firebaseManager) window.firebaseManager.setMode('supabase');
    } else if (mode === 'firebase') {
      const newConfig = {
        apiKey: document.getElementById('cfg-apiKey')?.value.trim() || '',
        projectId: document.getElementById('cfg-projectId')?.value.trim() || '',
        authDomain: document.getElementById('cfg-authDomain')?.value.trim() || '',
        appId: document.getElementById('cfg-appId')?.value.trim() || ''
      };
      if (window.firebaseManager) window.firebaseManager.saveConfig(newConfig, 'firebase');
    } else {
      if (window.firebaseManager) window.firebaseManager.setMode('mock');
    }

    this.closeModal();
    this.showToast(`Database configuration saved! Operating in ${mode.toUpperCase()} mode.`, 'success');
    this.updateEngineBadge();
    setTimeout(() => window.location.reload(), 800);
  }

  // Backward compatibility alias for any existing buttons
  handleSaveFirebaseConfig(e) {
    return this.handleSaveDatabaseConfig(e);
  }
}

const app = new Application();
window.app = app;

/**
 * Diagnostic wrapper for window.app.navigate
 * Logs precise timing for view switching, route guards, DOM manipulation,
 * and asynchronous controller rendering/data-fetching bottlenecks.
 */
function installNavigateDiagnosticWrapper(appInstance) {
  const originalNavigate = appInstance.navigate.bind(appInstance);
  window.__navigationDiagnostics = window.__navigationDiagnostics || [];

  appInstance.navigate = function diagnosticNavigate(viewId) {
    const navStart = performance.now();
    const fromView = this.currentView || 'none';
    const isProtected = ['admin-view', 'lecturer-view', 'student-view'].includes(viewId);
    const engineMode = window.firebaseManager ? window.firebaseManager.getMode() : 'mock';

    console.group(`[Nav Diagnostic] 🧭 Navigation: "${fromView}" ➔ "${viewId}"`);
    console.log(`[Nav Diagnostic] Triggered at: ${new Date().toLocaleTimeString()} | Engine Mode: ${engineMode.toUpperCase()}`);

    // Execute core navigation (returns controller render promise if async)
    const renderPromise = originalNavigate(viewId);
    const postSync = performance.now();
    const syncDuration = postSync - navStart;

    const metric = {
      id: window.__navigationDiagnostics.length + 1,
      timestamp: new Date().toISOString(),
      fromView,
      toView: viewId,
      isProtected,
      syncDurationMs: Number(syncDuration.toFixed(2)),
      asyncDurationMs: 0,
      totalDurationMs: Number(syncDuration.toFixed(2)),
      isAsync: false,
      status: this.currentView === viewId ? 'active' : 'blocked_by_guard'
    };

    if (this.currentView !== viewId) {
      console.warn(`[Nav Diagnostic] 🛡️ Route guard halted navigation to "${viewId}". Prompting authentication. Sync time: ${syncDuration.toFixed(2)}ms.`);
      console.groupEnd();
      window.__navigationDiagnostics.push(metric);
      return renderPromise;
    }

    console.log(`[Nav Diagnostic] 🖥️ DOM View Switch complete (active class toggled) in ${syncDuration.toFixed(2)}ms.`);

    if (renderPromise && typeof renderPromise.then === 'function') {
      metric.isAsync = true;
      console.log(`[Nav Diagnostic] ⏳ "${viewId}" dispatched async controller rendering. Awaiting data hydration...`);
      const asyncStart = performance.now();

      renderPromise.then(() => {
        const asyncEnd = performance.now();
        const asyncDuration = asyncEnd - asyncStart;
        const totalDuration = asyncEnd - navStart;

        metric.asyncDurationMs = Number(asyncDuration.toFixed(2));
        metric.totalDurationMs = Number(totalDuration.toFixed(2));
        metric.status = 'hydrated_async';

        console.log(`[Nav Diagnostic] ✅ "${viewId}" async hydration complete in ${asyncDuration.toFixed(2)}ms (Total end-to-end: ${totalDuration.toFixed(2)}ms).`);
        if (asyncDuration > 250) {
          console.warn(`[Nav Diagnostic] ⚠️ High latency in "${viewId}" controller (${asyncDuration.toFixed(2)}ms). Firestore or network queries may be delaying full view presentation.`);
        }
        console.groupEnd();
      }).catch((err) => {
        metric.status = 'async_error';
        metric.error = err.message;
        console.error(`[Nav Diagnostic] ❌ Controller render error for "${viewId}":`, err);
        console.groupEnd();
      });
    } else {
      console.log(`[Nav Diagnostic] ⚡ "${viewId}" rendered synchronously. View fully interactive in ${syncDuration.toFixed(2)}ms.`);
      console.groupEnd();
    }

    window.__navigationDiagnostics.push(metric);
    if (window.__navigationDiagnostics.length > 50) {
      window.__navigationDiagnostics.shift();
    }

    return renderPromise;
  };

  appInstance.getNavigationMetrics = function() {
    console.table(window.__navigationDiagnostics);
    return window.__navigationDiagnostics;
  };
}

installNavigateDiagnosticWrapper(window.app);

document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});


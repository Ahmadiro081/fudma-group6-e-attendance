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

    // 2. Initialize Firebase if configured
    await window.firebaseManager.initialize();

    // 3. Setup Auth listener
    window.authService.onAuthStateChanged((user) => {
      this.updateNavbarUser(user);
      this.updateEngineBadge();
    });

    // 4. Setup Global Event Listeners
    this.setupEventListeners();

    // 5. Navigate to initial view based on hash or default
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(`${hash}-view`)) {
      this.navigate(`${hash}-view`);
    } else {
      this.navigate('landing-view');
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

    // In Live Firebase mode, verify active Firebase Auth session matches stored profile
    if (isFirebase && user) {
      const fbUser = window.firebaseManager.auth ? window.firebaseManager.auth.currentUser : null;
      if (!fbUser || fbUser.uid !== user.uid) {
        window.authService.logout();
        this.showToast('Your cloud authentication session has expired or is invalid. Please sign in again.', 'warning');
        this.showLoginModal();
        return;
      }
    }

    if (viewId === 'admin-view' && (!user || user.role !== 'admin')) {
      this.showToast('Please sign in with administrator credentials.', 'warning');
      this.showLoginModal('admin');
      return;
    }

    if (viewId === 'lecturer-view' && (!user || (user.role !== 'lecturer' && user.role !== 'admin'))) {
      this.showToast('Please sign in as a course lecturer.', 'warning');
      this.showLoginModal('lecturer');
      return;
    }

    if (viewId === 'student-view' && (!user || user.role !== 'student')) {
      this.showToast('Please sign in as a student to access the student portal.', 'warning');
      this.showLoginModal('student');
      return;
    }

    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    // Show target view
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      this.currentView = viewId;
      window.location.hash = viewId.replace('-view', '');
      window.scrollTo(0, 0);

      // Render view-specific controller
      if (viewId === 'lecturer-view') window.lecturerCtrl?.render();
      if (viewId === 'student-view') window.studentCtrl?.render();
      if (viewId === 'admin-view') window.adminCtrl?.render();
      if (viewId === 'project-info-view') window.projectInfoCtrl?.render();
    }

    // Update active nav links
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-nav') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
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

    const mgr = window.firebaseManager;
    if (mgr.mode === 'firebase') {
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
      badge.title = 'Running in high-fidelity local database engine. Click to connect real Firebase.';
    }
  }

  showLoginModal(preferredRole = null) {
    const isMock = window.firebaseManager.getMode() === 'mock';

    this.openModal('Sign In to FUDMA E-Attendance', `
      <div style="margin-bottom: 20px;">
        <p style="font-size: 0.88rem; color: var(--gray-600);">
          ${isMock ? 'Enter your institutional credentials or use the demonstration quick-switch buttons below:' : 'Enter your official FUDMA institutional credentials to authenticate with Firebase Cloud:'}
        </p>

        <!-- Standard Login Form -->
        <form id="app-login-form" onsubmit="window.app.handleLoginForm(event)">
          <div class="form-group">
            <label>Institutional Email</label>
            <input type="email" id="login-email" class="form-control" placeholder="e.g. nura.muhammad@fudma.edu.ng" required />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="login-password" class="form-control" placeholder="••••••••" required />
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
              ⚡ Quick Demo Accounts (Local Presentation Engine Mode)
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('lecturer')">
                👨‍🏫 <strong>Malam Nura Muhammad</strong> (Lecturer - GET 411)
              </button>
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('student1')">
                🎓 <strong>Ibrahim Musa</strong> (Student 1 - FUDMA/2022/UG/ENG/0061)
              </button>
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('student2')">
                🎓 <strong>Fatima Aliyu</strong> (Student 2 - FUDMA/2022/UG/ENG/0062)
              </button>
              <button class="btn btn-secondary btn-sm" style="justify-content: flex-start; text-align: left;" onclick="window.app.quickLogin('admin')">
                🛡️ <strong>Academic Registry Admin</strong> (System Administrator)
              </button>
            </div>
          </div>
        ` : `
          <div style="margin-top: 20px; padding: 12px; background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); font-size: 0.8rem; color: var(--gray-600);">
            🔒 <strong>Live Firebase Cloud Mode:</strong> Demo quick-switching is disabled to ensure authentication and audit integrity. To evaluate with instant demo accounts without entering credentials, switch to <em>Local Presentation Engine</em> in database settings.
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
        document.getElementById('login-email').value = 'student1@fudma.edu.ng';
        document.getElementById('login-password').value = 'student123';
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
      alert(err.message || 'Quick login failed.');
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
  openFirebaseConfigModal() {
    const mgr = window.firebaseManager;
    const config = mgr.config;
    const currentMode = mgr.getMode();
    const initError = mgr.initError;

    this.openModal('Database Engine & Firebase Configuration', `
      <div>
        <p style="font-size: 0.85rem; color: var(--gray-600); margin-bottom: 14px;">
          This application features a dual-engine architecture: use the <strong>High-Fidelity Presentation Engine</strong> for offline classroom defense, or connect your live <strong>Google Firebase Project</strong> for cloud synchronization.
        </p>

        ${initError ? `
          <div style="background: var(--danger-bg); border: 1px solid var(--danger-border); color: var(--danger-text); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 16px;">
            <strong>⚠️ Firebase Initialization Notice:</strong><br />
            ${initError.message || 'Unknown configuration error occurred.'}
          </div>
        ` : ''}

        <form id="firebase-config-form" onsubmit="window.app.handleSaveFirebaseConfig(event)">
          <div class="form-group">
            <label>Operating Engine Mode</label>
            <select id="cfg-mode" class="form-control">
              <option value="firebase" ${currentMode === 'firebase' ? 'selected' : ''}>Live Google Firebase Cloud (Auth, Firestore & Functions)</option>
              <option value="mock" ${currentMode === 'mock' ? 'selected' : ''}>Local Presentation Engine (Offline Simulation / Demo Roster)</option>
            </select>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>API Key</label>
              <input type="text" id="cfg-apiKey" class="form-control" value="${config.apiKey || ''}" placeholder="AIzaSy..." />
            </div>
            <div class="form-group">
              <label>Project ID</label>
              <input type="text" id="cfg-projectId" class="form-control" value="${config.projectId || ''}" placeholder="fudma-eattendance-xxxx" />
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Auth Domain</label>
              <input type="text" id="cfg-authDomain" class="form-control" value="${config.authDomain || ''}" placeholder="fudma-xxxx.firebaseapp.com" />
            </div>
            <div class="form-group">
              <label>App ID</label>
              <input type="text" id="cfg-appId" class="form-control" value="${config.appId || ''}" placeholder="1:xxxx:web:xxxx" />
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Storage Bucket (Optional)</label>
              <input type="text" id="cfg-storageBucket" class="form-control" value="${config.storageBucket || ''}" placeholder="fudma-xxxx.appspot.com" />
            </div>
            <div class="form-group">
              <label>Messaging Sender ID (Optional)</label>
              <input type="text" id="cfg-messagingSenderId" class="form-control" value="${config.messagingSenderId || ''}" placeholder="1234567890" />
            </div>
          </div>

          <div class="form-group">
            <label>Cloud Functions Region</label>
            <input type="text" id="cfg-functionsRegion" class="form-control" value="${config.functionsRegion || 'us-central1'}" placeholder="us-central1" />
            <span class="form-help">Default is us-central1 unless your Firebase project functions are deployed elsewhere.</span>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Close</button>
            <button type="submit" class="btn btn-primary">Save Configuration</button>
          </div>
        </form>
      </div>
    `, true);
  }

  async handleSaveFirebaseConfig(e) {
    e.preventDefault();
    const mode = document.getElementById('cfg-mode').value;
    const newConfig = {
      apiKey: document.getElementById('cfg-apiKey').value.trim(),
      projectId: document.getElementById('cfg-projectId').value.trim(),
      authDomain: document.getElementById('cfg-authDomain').value.trim(),
      appId: document.getElementById('cfg-appId').value.trim(),
      storageBucket: document.getElementById('cfg-storageBucket').value.trim(),
      messagingSenderId: document.getElementById('cfg-messagingSenderId').value.trim(),
      functionsRegion: document.getElementById('cfg-functionsRegion').value.trim() || 'us-central1'
    };

    window.firebaseManager.saveConfig(newConfig, mode);
    this.closeModal();
    this.showToast(`Database configuration saved! Operating in ${mode.toUpperCase()} mode.`, 'success');
    this.updateEngineBadge();
    setTimeout(() => window.location.reload(), 800);
  }
}

const app = new Application();
window.app = app;

document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});

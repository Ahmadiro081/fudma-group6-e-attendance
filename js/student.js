/**
 * FUDMA E-Attendance System - Student Module
 * Course: GET 411 | Group 6 | Academic Session: 2026/2027
 */

class StudentController {
  constructor() {}

  async render() {
    const container = document.getElementById('student-view-content');
    if (!container) return;

    const user = window.authService.currentUser;
    if (!user || user.role !== 'student') {
      container.innerHTML = `
        <div class="panel">
          <div class="panel-body" style="text-align: center; padding: 48px 20px;">
            <div style="font-size: 3rem; margin-bottom: 16px;">🎓</div>
            <h2>Student Portal Sign-In Required</h2>
            <p>Please authenticate as a registered FUDMA student to view your course enrollments and mark attendance.</p>
            <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px; flex-wrap: wrap;">
              <button class="btn btn-primary" onclick="window.studentCtrl.openStudentSignUpModal()">
                📝 Register / Sign Up as New Student
              </button>
              <button class="btn btn-secondary" onclick="window.app.showLoginModal('student')">
                🔑 Sign In with Existing Account
              </button>
            </div>
            ${window.firebaseManager && window.firebaseManager.getMode() === 'mock' ? `
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--gray-200);">
              <small style="color: var(--gray-500); display: block; margin-bottom: 8px;">Or instant demo switch (Presentation Engine):</small>
              <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-secondary btn-sm" onclick="window.authService.quickSwitch('student5')">
                  OLOYEDE PROMISE ISSAC (ENG/2024/35303) — Mechatronics
                </button>
                <button class="btn btn-secondary btn-sm" onclick="window.authService.quickSwitch('student1')">
                  Nura HAMZA MASARI (ENG/2025/37401)
                </button>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      `;
      return;
    }

    // Fetch student's registered courses and attendance records concurrently
    const [allCourses, myAttendance] = await Promise.all([
      window.dbService.getCourses(),
      window.dbService.getAttendance(null, user.uid)
    ]);
    const enrolledCourses = allCourses.filter(c => (c.enrolledStudentIds || []).includes(user.uid));

    // Calculate overall stats
    const totalCheckIns = myAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const onTimeCount = myAttendance.filter(a => a.status === 'present').length;
    const lateCount = myAttendance.filter(a => a.status === 'late').length;

    container.innerHTML = `
      <!-- Welcome Header Card -->
      <div class="hero-section student-hero-card">
        <div class="student-hero-layout">
          <div class="student-hero-content">
            <div class="hero-banner-ribbon">
              <span>🎓 FUDMA Student Portal</span> • <span>Session 2026/2027</span>
            </div>
            <h2 class="student-welcome-title">
              Welcome, ${user.fullName}
            </h2>
            <div class="student-meta-list">
              <span class="student-meta-item">
                Matric No: <strong>${user.matricNumber || 'FUDMA/2022/UG/ENG/0061'}</strong>
              </span>
              <span class="student-meta-item">
                Dept: <strong>${user.department || 'Engineering'}</strong>
              </span>
              <span class="student-meta-item">
                Level: <strong>${user.level || '400L'}</strong>
              </span>
            </div>
          </div>
          <div class="student-hero-actions">
            <button class="btn btn-primary btn-lg student-action-btn" onclick="window.studentCtrl.openScannerModal()">
              📷 Scan Lecture QR Code
            </button>
            <button class="btn btn-secondary btn-lg student-action-btn" onclick="window.studentCtrl.openManualCodeModal()">
              ⌨️ Enter Lecture Code
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="metrics-row student-metrics-grid">
        <div class="metric-card primary">
          <div class="metric-label">Enrolled Courses <span>📚</span></div>
          <div class="metric-value">${enrolledCourses.length}</div>
          <div class="metric-sub">Registered for active semester</div>
        </div>
        <div class="metric-card accent">
          <div class="metric-label">Verified Check-Ins <span>✅</span></div>
          <div class="metric-value">${totalCheckIns}</div>
          <div class="metric-sub">Across all lecture sessions</div>
        </div>
        <div class="metric-card success">
          <div class="metric-label">Present (On-Time) <span>🟢</span></div>
          <div class="metric-value">${onTimeCount}</div>
          <div class="metric-sub">Arrived before late threshold</div>
        </div>
        <div class="metric-card warning">
          <div class="metric-label">Late Arrivals <span>🟠</span></div>
          <div class="metric-value">${lateCount}</div>
          <div class="metric-sub">Arrived after late threshold</div>
        </div>
      </div>

      <!-- Registered Courses with Attendance Percentage -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>Your Enrolled Courses & Attendance Standing</h2>
          </div>
        </div>
        <div class="panel-body">
          <div class="enrolled-courses-grid">
            ${enrolledCourses.length > 0 ? enrolledCourses.map(course => {
              const courseAttendance = myAttendance.filter(a => a.courseId === course.id);
              const presentOrLate = courseAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
              return `
                <div class="course-summary-card">
                  <div class="course-summary-header">
                    <div>
                      <span class="badge-group6 course-badge">${course.courseCode}</span>
                      <h4 class="course-title-text">${course.courseTitle}</h4>
                    </div>
                    <span class="status-badge status-present course-checkin-count">${presentOrLate} Check-Ins</span>
                  </div>
                  <div class="course-meta-footer">
                    <span>${course.department || 'Faculty of Engineering'}</span> • <span>Units: ${course.creditUnits || 3}</span>
                  </div>
                </div>
              `;
            }).join('') : `
              <p style="color: var(--gray-500); padding: 12px;">You are not currently enrolled in any courses. Please contact the administrator.</p>
            `}
          </div>
        </div>
      </div>

      <!-- Personal Attendance History Table -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>Your Official Attendance History</h2>
          </div>
        </div>
        <div class="panel-body" style="padding: 12px 16px;">
          <div class="mobile-table-hint">
            <span>↔ Swipe horizontally to inspect complete attendance records</span>
          </div>
          <div class="table-responsive student-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 44px; text-align: center;">S/N</th>
                  <th>Course</th>
                  <th>Check-In</th>
                  <th>Date & Timestamp</th>
                  <th>Status</th>
                  <th>Verification Mode</th>
                </tr>
              </thead>
              <tbody>
                ${myAttendance.length > 0 ? myAttendance.map((rec, idx) => `
                  <tr>
                    <td style="text-align: center;"><strong>${idx + 1}</strong></td>
                    <td><strong class="course-code-cell">${rec.courseCode}</strong></td>
                    <td><span class="check-in-time-cell">${rec.checkInTime}</span></td>
                    <td class="timestamp-cell"><small>${new Date(rec.timestamp).toLocaleDateString()} ${new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></td>
                    <td>
                      <span class="status-badge ${rec.status === 'present' ? 'status-present' : rec.status === 'late' ? 'status-late' : 'status-absent'}">
                        ${rec.status === 'present' ? 'Present (On-Time)' : rec.status === 'late' ? 'Late Arrival' : 'Absent'}
                      </span>
                    </td>
                    <td>
                      <small class="verification-badge">
                        ${rec.verificationMethod === 'qr_scan' ? '📷 QR Scan' : rec.verificationMethod === 'manual_code' ? '⌨️ Manual Code' : '⚖️ Finalized'}
                      </small>
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 32px 12px; color: var(--gray-500);">
                      You have no recorded attendance entries yet. Scan an active lecture QR code to check in.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // --- Camera QR Scanner Modal ---
  async openScannerModal() {
    const modal = document.getElementById('scanner-modal');
    if (!modal) return;
    modal.classList.add('active');

    const errorContainer = document.getElementById('scanner-error-msg');
    errorContainer.style.display = 'none';

    try {
      await window.attendanceEngine.startCameraScanner(
        'scanner-viewfinder',
        (result) => {
          this.closeScannerModal();
          this.displayAttendanceResult(result);
          this.render();
        },
        (error) => {
          this.displayScanError(error);
        }
      );
    } catch (cameraErr) {
      console.warn('Camera launch failed:', cameraErr);
      errorContainer.innerText = `Camera Access Notice: ${cameraErr.message || 'Camera permission was denied or device has no camera.'} You can use the manual lecture code option instead!`;
      errorContainer.style.display = 'block';
    }
  }

  closeScannerModal() {
    const modal = document.getElementById('scanner-modal');
    if (modal) modal.classList.remove('active');
    window.attendanceEngine.stopCameraScanner();
  }

  openManualCodeModal() {
    window.app.openModal('Enter Lecture Code Manually', `
      <form id="manual-code-form" onsubmit="window.studentCtrl.handleManualCodeSubmit(event)">
        <p style="font-size: 0.88rem; color: var(--gray-600); margin-bottom: 16px;">
          Enter the 6-character lecture code displayed on the lecturer's projector screen if your device camera is unavailable:
        </p>
        <div class="form-group">
          <label>Lecture Code (e.g. AI4116)</label>
          <input 
            type="text" 
            id="manual-code-input" 
            class="form-control" 
            placeholder="AI4116" 
            maxlength="8" 
            style="font-family: var(--font-mono); font-size: 1.4rem; letter-spacing: 4px; text-transform: uppercase; text-align: center; font-weight: 800;" 
            required 
          />
        </div>
        <div id="manual-code-error" style="color: var(--danger-solid); font-size: 0.85rem; margin-top: 8px; display: none;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Submit Attendance</button>
        </div>
      </form>
    `);
  }

  async handleManualCodeSubmit(e) {
    e.preventDefault();
    const code = document.getElementById('manual-code-input').value.trim();
    const errBox = document.getElementById('manual-code-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : 'Submit Attendance';

    if (errBox) errBox.style.display = 'none';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Verifying Code...';
    }

    try {
      await window.attendanceEngine.submitManualCode(
        code,
        (result) => {
          window.app.closeModal();
          this.displayAttendanceResult(result);
          this.render();
        },
        (err) => {
          if (errBox) {
            errBox.innerText = err.message || 'Submission denied.';
            errBox.style.display = 'block';
          }
        }
      );
    } catch (err) {
      if (errBox) {
        errBox.innerText = err.message || 'Submission error.';
        errBox.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  }

  openStudentSignUpModal() {
    window.app.openModal('Student Registration / Sign Up', `
      <form id="student-signup-form" onsubmit="window.studentCtrl.handleStudentSignUp(event)">
        <p style="font-size: 0.85rem; color: var(--gray-600); margin-bottom: 14px;">
          Register with your official FUDMA student details to access the portal and mark attendance:
        </p>
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="su-fullname" class="form-control" placeholder="e.g. Bello Haruna" required />
        </div>
        <div class="form-group">
          <label>Matriculation Number</label>
          <input type="text" id="su-matric" class="form-control" placeholder="e.g. ENG/2024/35303" required />
        </div>
        <div class="form-group">
          <label>Institutional Email</label>
          <input type="email" id="su-email" class="form-control" placeholder="e.g. oloyede.promise@fudma.edu.ng" required />
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Level</label>
            <select id="su-level" class="form-control">
              <option value="400L" selected>400 Level (Final Year)</option>
              <option value="300L">300 Level</option>
              <option value="200L">200 Level</option>
              <option value="100L">100 Level</option>
            </select>
          </div>
          <div class="form-group">
            <label>Department</label>
            <input type="text" id="su-dept" class="form-control" value="Faculty of Engineering" required />
          </div>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="su-password" class="form-control" placeholder="Choose a secure password (min 6 characters)" required minlength="6" />
          <span class="form-help">Choose a secure password for your student portal account (minimum 6 characters).</span>
        </div>
        <div id="su-error-msg" style="color: var(--danger-solid); font-size: 0.85rem; margin-top: 6px; display: none;"></div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Complete Registration</button>
        </div>
      </form>
    `);
  }

  async handleStudentSignUp(e) {
    e.preventDefault();
    const fullName = document.getElementById('su-fullname').value.trim();
    const matricNumber = document.getElementById('su-matric').value.trim();
    const email = document.getElementById('su-email').value.trim();
    const level = document.getElementById('su-level').value;
    const department = document.getElementById('su-dept').value.trim();
    const password = document.getElementById('su-password').value;
    const errBox = document.getElementById('su-error-msg');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (errBox) errBox.style.display = 'none';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Registering...';
    }

    try {
      const student = await window.authService.registerStudent({
        fullName,
        matricNumber,
        email,
        password,
        level,
        department
      });

      window.app.closeModal();
      window.app.showToast(`Registration successful! Welcome, ${student.fullName}.`, 'success');
      this.render();
    } catch (err) {
      if (errBox) {
        errBox.innerText = err.message || 'Registration failed.';
        errBox.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Complete Registration';
      }
    }
  }

  displayAttendanceResult(result) {
    const isLate = result.isLate;
    const title = isLate ? 'Attendance Recorded (Late Arrival)' : 'Attendance Recorded Successfully!';
    const badgeColor = isLate ? 'var(--warning-solid)' : 'var(--success-solid)';
    const icon = isLate ? '⚠️' : '🎉';

    window.app.openModal(title, `
      <div style="text-align: center; padding: 12px 8px;">
        <div style="font-size: 3.5rem; margin-bottom: 12px;">${icon}</div>
        <h3 style="color: ${badgeColor}; margin-bottom: 8px;">
          ${isLate ? 'Marked Late' : 'Marked Present (On-Time)'}
        </h3>
        <p style="font-size: 0.95rem; color: var(--gray-700); margin-bottom: 16px;">
          Your attendance for <strong>${result.courseCode}</strong> has been securely stamped in the institutional database.
        </p>
        <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: 14px; text-align: left; font-size: 0.85rem; margin-bottom: 20px;">
          <p style="margin-bottom: 4px;"><strong>Student:</strong> ${result.studentName}</p>
          <p style="margin-bottom: 4px;"><strong>Matric No:</strong> ${result.matricNumber}</p>
          <p style="margin-bottom: 4px;"><strong>Check-In Time:</strong> ${result.checkInTime}</p>
          <p style="margin-bottom: 0;"><strong>Method:</strong> ${result.verificationMethod === 'qr_scan' ? 'Camera QR Code Scan' : 'Manual Code'}</p>
        </div>
        <button class="btn btn-primary btn-lg" style="width: 100%;" onclick="window.app.closeModal()">
          Done
        </button>
      </div>
    `);
  }

  displayScanError(err) {
    window.app.openModal('Attendance Registration Notice', `
      <div style="text-align: center; padding: 12px 8px;">
        <div style="font-size: 3rem; margin-bottom: 12px;">❌</div>
        <h3 style="color: var(--danger-solid); margin-bottom: 8px;">Submission Denied</h3>
        <p style="font-size: 0.92rem; color: var(--gray-700); margin-bottom: 16px;">
          ${err.message}
        </p>
        <button class="btn btn-secondary" onclick="window.app.closeModal()">Close</button>
      </div>
    `);
  }
}

const studentCtrl = new StudentController();
window.studentCtrl = studentCtrl;

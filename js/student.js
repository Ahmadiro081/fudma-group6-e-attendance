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
            <div style="display: flex; gap: 12px; justify-content: center; margin-top: 16px; flex-wrap: wrap;">
              <button class="btn btn-primary" onclick="window.authService.quickSwitch('student1')">
                Switch to Student 1 (Ibrahim Musa)
              </button>
              <button class="btn btn-secondary" onclick="window.authService.quickSwitch('student2')">
                Switch to Student 2 (Fatima Aliyu)
              </button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Fetch student's registered courses
    const allCourses = await window.dbService.getCourses();
    const enrolledCourses = allCourses.filter(c => (c.enrolledStudentIds || []).includes(user.uid));

    // Fetch student's personal attendance records
    const myAttendance = await window.dbService.getAttendance(null, user.uid);

    // Calculate overall stats
    const totalCheckIns = myAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const onTimeCount = myAttendance.filter(a => a.status === 'present').length;
    const lateCount = myAttendance.filter(a => a.status === 'late').length;

    container.innerHTML = `
      <!-- Welcome Header Card -->
      <div class="hero-section" style="padding: 28px; margin-bottom: 24px; background: linear-gradient(135deg, #ffffff 0%, var(--primary-50) 100%);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <div class="hero-banner-ribbon">
              <span>🎓 FUDMA Student Portal</span> • <span>Session 2026/2027</span>
            </div>
            <h2 style="font-size: 1.8rem; color: var(--primary-900); margin-bottom: 6px;">
              Welcome, ${user.fullName}
            </h2>
            <p style="font-size: 0.95rem; color: var(--gray-600); margin: 0;">
              Matriculation Number: <strong style="color: var(--primary-800);">${user.matricNumber || 'FUDMA/2022/UG/ENG/0061'}</strong> | 
              Department: <strong>${user.department || 'Engineering'}</strong> | Level: <strong>${user.level || '400L'}</strong>
            </p>
          </div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn btn-primary btn-lg" onclick="window.studentCtrl.openScannerModal()">
              📷 Scan Lecture QR Code
            </button>
            <button class="btn btn-secondary btn-lg" onclick="window.studentCtrl.openManualCodeModal()">
              ⌨️ Enter Lecture Code
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="metrics-row">
        <div class="metric-card primary">
          <div class="metric-label">Enrolled Courses <span>📚</span></div>
          <div class="metric-value">${enrolledCourses.length}</div>
          <div class="metric-sub">Registered for active semester</div>
        </div>
        <div class="metric-card accent">
          <div class="metric-label">Total Verified Check-Ins <span>✅</span></div>
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
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            ${enrolledCourses.length > 0 ? enrolledCourses.map(course => {
              const courseAttendance = myAttendance.filter(a => a.courseId === course.id);
              const presentOrLate = courseAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
              // Calculate rough % based on past sessions for this course
              const percentage = 100; // default for active semester
              return `
                <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                      <span class="badge-group6" style="margin-bottom: 4px; display: inline-block;">${course.courseCode}</span>
                      <h4 style="font-size: 1rem; color: var(--gray-900);">${course.courseTitle}</h4>
                    </div>
                    <span class="status-badge status-present">${presentOrLate} Check-Ins</span>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--gray-600); margin-top: 8px;">
                    Department: ${course.department || 'Faculty of Engineering'} | Units: ${course.creditUnits || 3}
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
        <div class="panel-body">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 50px;">S/N</th>
                  <th>Course Code</th>
                  <th>Check-In Time</th>
                  <th>Date & Timestamp</th>
                  <th>Status</th>
                  <th>Verification Mode</th>
                </tr>
              </thead>
              <tbody>
                ${myAttendance.length > 0 ? myAttendance.map((rec, idx) => `
                  <tr>
                    <td><strong>${idx + 1}</strong></td>
                    <td><strong>${rec.courseCode}</strong></td>
                    <td><span style="font-family: var(--font-mono); font-weight: 700;">${rec.checkInTime}</span></td>
                    <td><small style="color: var(--gray-600);">${new Date(rec.timestamp).toLocaleDateString()} ${new Date(rec.timestamp).toLocaleTimeString()}</small></td>
                    <td>
                      <span class="status-badge ${rec.status === 'present' ? 'status-present' : rec.status === 'late' ? 'status-late' : 'status-absent'}">
                        ${rec.status === 'present' ? 'Present (On-Time)' : rec.status === 'late' ? 'Late Arrival' : 'Absent'}
                      </span>
                    </td>
                    <td>
                      <small style="color: var(--gray-500); text-transform: uppercase;">
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

    await window.attendanceEngine.submitManualCode(
      code,
      (result) => {
        window.app.closeModal();
        this.displayAttendanceResult(result);
        this.render();
      },
      (err) => {
        errBox.innerText = err.message;
        errBox.style.display = 'block';
      }
    );
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

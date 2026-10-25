/**
 * FUDMA E-Attendance System - Lecturer Module
 * Course: GET 411 | Group 6 | Academic Session: 2026/2027
 */

class LecturerController {
  constructor() {
    this.selectedSessionId = 'session_demo_active';
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.liveRefreshInterval = null;
  }

  async render() {
    const container = document.getElementById('lecturer-view-content');
    if (!container) return;

    const user = window.authService.currentUser;
    if (!user || (user.role !== 'lecturer' && user.role !== 'admin')) {
      container.innerHTML = `
        <div class="panel">
          <div class="panel-body" style="text-align: center; padding: 48px 20px;">
            <div style="font-size: 3rem; margin-bottom: 16px;">👨‍🏫</div>
            <h2>Lecturer Access Required</h2>
            <p>Please authenticate as a course lecturer (e.g., Malam Nura Muhammad) to manage sessions and attendance.</p>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 16px; flex-wrap: wrap;">
              <button class="btn btn-primary" onclick="window.app.showLoginModal('lecturer')">
                🔑 Sign In as Lecturer
              </button>
              ${window.firebaseManager && window.firebaseManager.getMode() === 'mock' ? `
                <button class="btn btn-secondary" onclick="window.authService.quickSwitch('lecturer')">
                  Switch to Lecturer: Malam Nura Muhammad
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Fetch courses and sessions concurrently
    const [courses, sessions] = await Promise.all([
      window.dbService.getCourses(user.role === 'lecturer' ? user.uid : null),
      window.dbService.getSessions(null, user.role === 'lecturer' ? user.uid : null)
    ]);
    
    // Default to the first session if not selected
    if (!this.selectedSessionId && sessions.length > 0) {
      this.selectedSessionId = sessions[0].id;
    }

    const currentSession = sessions.find(s => s.id === this.selectedSessionId) || sessions[0] || null;
    
    // Fetch course details and attendance roster concurrently
    const [currentCourse, allAttendance] = await Promise.all([
      currentSession ? window.dbService.getCourseById(currentSession.courseId) : Promise.resolve(null),
      currentSession ? window.dbService.getAttendance(currentSession.id) : Promise.resolve([])
    ]);

    // Filter and search attendance
    let filteredRecords = allAttendance;
    if (this.statusFilter !== 'all') {
      filteredRecords = filteredRecords.filter(r => r.status === this.statusFilter);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filteredRecords = filteredRecords.filter(r => 
        (r.studentName && r.studentName.toLowerCase().includes(q)) ||
        (r.matricNumber && r.matricNumber.toLowerCase().includes(q))
      );
    }

    // Calculate metrics
    const totalRegistered = currentCourse ? (currentCourse.enrolledStudentIds || []).length : 0;
    const totalCheckIns = allAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const presentCount = allAttendance.filter(a => a.status === 'present').length;
    const lateCount = allAttendance.filter(a => a.status === 'late').length;
    const absentCount = allAttendance.filter(a => a.status === 'absent').length;
    const attendancePercentage = totalRegistered > 0 ? Math.round((totalCheckIns / totalRegistered) * 100) : 0;

    container.innerHTML = `
      <!-- Action Toolbar -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 1.4rem; color: var(--primary-900);">Lecturer Attendance Control Center</h2>
          <p style="font-size: 0.85rem; color: var(--gray-600); margin: 0;">
            Instructor: <strong>${user.fullName}</strong> | Faculty of Engineering & Technology
          </p>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="window.lecturerCtrl.openCreateSessionModal()">
            + Create New Lecture Session
          </button>
          ${currentSession && currentSession.status === 'active' ? `
            <button class="btn btn-accent" onclick="window.lecturerCtrl.openProjectorModal('${currentSession.id}')">
              📽️ Display QR on Projector Screen
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Active Session Summary Card -->
      ${currentSession ? `
        <div class="panel" style="border-left: 5px solid var(--primary-600);">
          <div class="panel-header" style="background: var(--gray-50);">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="status-badge ${this.getStatusBadgeClass(currentSession.status)}">
                  Session ${currentSession.status.toUpperCase()}
                </span>
                <h3 style="font-size: 1.15rem; margin: 0;">
                  ${currentSession.courseCode}: ${currentSession.courseTitle}
                </h3>
              </div>
              <div style="font-size: 0.82rem; color: var(--gray-600); margin-top: 4px;">
                📍 Venue: <strong>${currentSession.venue}</strong> | 
                📅 Date: <strong>${currentSession.date}</strong> | 
                ⏰ Opens: <strong>${currentSession.startTime}</strong> | 
                ⏳ Late Threshold: <strong style="color: var(--warning-solid);">${currentSession.lateThreshold}</strong> | 
                🔒 Closes: <strong>${currentSession.closeTime}</strong>
              </div>
            </div>
            <div class="panel-actions">
              <!-- Session Select Dropdown -->
              <select class="form-control" style="width: auto; padding: 6px 12px; font-size: 0.82rem;" onchange="window.lecturerCtrl.switchSession(this.value)">
                ${sessions.map(s => `
                  <option value="${s.id}" ${s.id === currentSession.id ? 'selected' : ''}>
                    ${s.courseCode} (${s.date}) - [${s.status.toUpperCase()}]
                  </option>
                `).join('')}
              </select>

              <!-- Session Action Controls -->
              ${currentSession.status === 'active' ? `
                <button class="btn btn-secondary btn-sm" onclick="window.lecturerCtrl.updateStatus('${currentSession.id}', 'paused')">⏸️ Pause</button>
                <button class="btn btn-danger btn-sm" onclick="window.lecturerCtrl.updateStatus('${currentSession.id}', 'closed')">⏹️ Close Session</button>
              ` : ''}

              ${currentSession.status === 'paused' ? `
                <button class="btn btn-success btn-sm" onclick="window.lecturerCtrl.updateStatus('${currentSession.id}', 'active')">▶️ Resume</button>
                <button class="btn btn-danger btn-sm" onclick="window.lecturerCtrl.updateStatus('${currentSession.id}', 'closed')">⏹️ Close</button>
              ` : ''}

              ${currentSession.status === 'closed' ? `
                <button class="btn btn-primary btn-sm" onclick="window.lecturerCtrl.finalizeAbsences('${currentSession.id}')">
                  ⚖️ Finalize & Mark Absences
                </button>
              ` : ''}

              <button class="btn btn-secondary btn-sm" onclick="window.lecturerCtrl.exportSessionCSV('${currentSession.id}')">
                📥 Export CSV
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Metric Cards for Selected Session -->
      <div class="metrics-row">
        <div class="metric-card primary">
          <div class="metric-label">Enrolled Students <span>👥</span></div>
          <div class="metric-value">${totalRegistered}</div>
          <div class="metric-sub">Registered for ${currentSession?.courseCode || 'course'}</div>
        </div>
        <div class="metric-card accent">
          <div class="metric-label">Total Check-Ins <span>📋</span></div>
          <div class="metric-value">${totalCheckIns}</div>
          <div class="metric-sub">${attendancePercentage}% Attendance rate</div>
        </div>
        <div class="metric-card success">
          <div class="metric-label">Present (On-Time) <span>🟢</span></div>
          <div class="metric-value">${presentCount}</div>
          <div class="metric-sub">Checked in before ${currentSession?.lateThreshold || 'threshold'}</div>
        </div>
        <div class="metric-card warning">
          <div class="metric-label">Late Arrivals <span>🟠</span></div>
          <div class="metric-value">${lateCount}</div>
          <div class="metric-sub">Arrived at or after ${currentSession?.lateThreshold || 'threshold'}</div>
        </div>
        <div class="metric-card danger">
          <div class="metric-label">Absent (Finalized) <span>🔴</span></div>
          <div class="metric-value">${absentCount}</div>
          <div class="metric-sub">${currentSession?.status === 'finalized' ? 'Confirmed Absent' : 'Pending finalization'}</div>
        </div>
      </div>

      <!-- Live Attendance Stream Table -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>Real-Time Lecture Attendance Roster</h2>
            <span class="status-badge status-active" style="animation: pulse 1.5s infinite;">● Live Feed</span>
          </div>
          <div class="panel-actions">
            <!-- Search Input -->
            <input 
              type="text" 
              class="form-control" 
              placeholder="Search student or matric no..." 
              style="width: 240px; padding: 6px 12px; font-size: 0.85rem;" 
              value="${this.searchQuery}"
              oninput="window.lecturerCtrl.handleSearch(this.value)"
            />

            <!-- Filter Dropdown -->
            <select class="form-control" style="width: auto; padding: 6px 12px; font-size: 0.85rem;" onchange="window.lecturerCtrl.handleFilter(this.value)">
              <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
              <option value="present" ${this.statusFilter === 'present' ? 'selected' : ''}>Present (On-Time)</option>
              <option value="late" ${this.statusFilter === 'late' ? 'selected' : ''}>Late</option>
              <option value="absent" ${this.statusFilter === 'absent' ? 'selected' : ''}>Absent</option>
            </select>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 60px;">S/N</th>
                  <th>Student Name</th>
                  <th>Matriculation Number</th>
                  <th>Course Code</th>
                  <th>Check-In Time</th>
                  <th>Status</th>
                  <th>Verification Mode</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRecords.length > 0 ? filteredRecords.map((rec, idx) => `
                  <tr>
                    <td><strong>${idx + 1}</strong></td>
                    <td><strong>${rec.studentName}</strong></td>
                    <td><code style="color: var(--primary-800);">${rec.matricNumber}</code></td>
                    <td>${rec.courseCode}</td>
                    <td>
                      <span style="font-family: var(--font-mono); font-size: 0.85rem;">
                        ${rec.checkInTime}
                      </span>
                    </td>
                    <td>
                      <span class="status-badge ${this.getStatusBadgeClass(rec.status)}">
                        ${rec.status === 'present' ? 'Present (On-Time)' : rec.status === 'late' ? 'Late Arrival' : 'Absent'}
                      </span>
                    </td>
                    <td>
                      <small style="color: var(--gray-500); text-transform: uppercase;">
                        ${rec.verificationMethod === 'qr_scan' ? '📷 QR Scan' : rec.verificationMethod === 'manual_code' ? '⌨️ Code Entry' : '⚖️ Auto Finalized'}
                      </small>
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 36px 12px; color: var(--gray-500);">
                      ${allAttendance.length === 0 ? 
                        'No attendance records submitted yet for this lecture. Display the QR code on the projector to begin.' : 
                        'No attendance records match your search filter.'}
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Start auto-refresh interval for live monitoring if not already active
    if (!this.liveRefreshInterval) {
      this.liveRefreshInterval = setInterval(() => {
        const view = document.getElementById('lecturer-view');
        if (view && view.classList.contains('active')) {
          this.render();
        }
      }, 5000);
    }
  }

  getStatusBadgeClass(status) {
    switch (status) {
      case 'present': return 'status-present';
      case 'late': return 'status-late';
      case 'absent': return 'status-absent';
      case 'active': return 'status-active';
      case 'paused': return 'status-paused';
      case 'closed':
      case 'finalized': return 'status-closed';
      default: return 'status-active';
    }
  }

  switchSession(sessionId) {
    this.selectedSessionId = sessionId;
    this.render();
  }

  handleSearch(query) {
    this.searchQuery = query;
    this.render();
  }

  handleFilter(status) {
    this.statusFilter = status;
    this.render();
  }

  async updateStatus(sessionId, status) {
    try {
      await window.dbService.updateSessionStatus(sessionId, status);
      window.app.showToast(`Session is now ${status.toUpperCase()}.`, 'info');
      this.render();
    } catch (err) {
      alert(err.message);
    }
  }

  async finalizeAbsences(sessionId) {
    const confirm = window.confirm(
      'Are you sure you want to finalize this attendance session? All registered students who have not checked in will be permanently marked ABSENT.'
    );
    if (!confirm) return;

    try {
      const res = await window.dbService.finalizeSessionAbsences(sessionId);
      window.app.showToast(`Session finalized successfully! ${res.absentCount} absent students marked.`, 'success');
      this.render();
    } catch (err) {
      alert(err.message);
    }
  }

  openCreateSessionModal() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMins = String(now.getMinutes()).padStart(2, '0');
    const startStr = `${currentHours}:${currentMins}`;
    
    // Default late threshold 15 minutes after start
    const lateThresholdDate = new Date(now.getTime() + 15 * 60000);
    const lateThresholdStr = `${String(lateThresholdDate.getHours()).padStart(2, '0')}:${String(lateThresholdDate.getMinutes()).padStart(2, '0')}`;

    // Default close 60 minutes after start
    const closeDate = new Date(now.getTime() + 60 * 60000);
    const closeStr = `${String(closeDate.getHours()).padStart(2, '0')}:${String(closeDate.getMinutes()).padStart(2, '0')}`;

    const randomManualCode = 'AI' + Math.floor(1000 + Math.random() * 9000);

    window.app.openModal('Create Lecture Attendance Session', `
      <form id="create-session-form" onsubmit="window.lecturerCtrl.handleCreateSession(event)">
        <div class="form-group">
          <label>Course</label>
          <select id="sess-course" class="form-control" required>
            <option value="course_get411">GET 411 - Artificial Intelligence Mini Project</option>
            <option value="course_cpe401">CPE 401 - Embedded Systems Design</option>
          </select>
        </div>
        <div class="form-group">
          <label>Lecture Venue</label>
          <input type="text" id="sess-venue" class="form-control" value="FUDMA Lecture Hall 3B" required />
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="sess-date" class="form-control" value="${today}" required />
          </div>
          <div class="form-group">
            <label>Attendance Opens</label>
            <input type="time" id="sess-start" class="form-control" value="${startStr}" required />
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Late Arrival Threshold ⚠️</label>
            <input type="time" id="sess-late" class="form-control" value="${lateThresholdStr}" required />
            <span class="form-help">Arrivals after this time are marked Late (Orange badge).</span>
          </div>
          <div class="form-group">
            <label>Attendance Closes 🔒</label>
            <input type="time" id="sess-close" class="form-control" value="${closeStr}" required />
            <span class="form-help">Submissions after this time are rejected.</span>
          </div>
        </div>
        <div class="form-group" style="margin-top: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="sess-allow-code" checked />
            Enable 6-Character Manual Code Fallback (For students whose camera fails)
          </label>
          <input type="text" id="sess-manual-code" class="form-control" value="${randomManualCode}" style="font-family: var(--font-mono); letter-spacing: 2px; width: 160px; margin-top: 6px;" />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
          <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Start Lecture & Generate QR</button>
        </div>
      </form>
    `);
  }

  async handleCreateSession(e) {
    e.preventDefault();
    const courseId = document.getElementById('sess-course').value;
    const venue = document.getElementById('sess-venue').value.trim();
    const date = document.getElementById('sess-date').value;
    const startTime = document.getElementById('sess-start').value;
    const lateThreshold = document.getElementById('sess-late').value;
    const closeTime = document.getElementById('sess-close').value;
    const allowManualCode = document.getElementById('sess-allow-code').checked;
    const manualCode = document.getElementById('sess-manual-code').value.trim().toUpperCase();

    const course = await window.dbService.getCourseById(courseId);
    const user = window.authService.currentUser;
    const token = window.authService.getAccessToken();

    let newSession = null;

    if (token) {
      try {
        const resp = await fetch('/api/lecturer/create-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            courseId,
            venue,
            date,
            startTime,
            lateThreshold,
            closeTime,
            allowManualCode,
            manualCode
          })
        });

        if (resp.ok) {
          const body = await resp.json();
          newSession = body.session;
        } else {
          const errData = await resp.json().catch(() => ({}));
          console.warn('[handleCreateSession API error, falling back to dbService]:', errData.error);
        }
      } catch (apiErr) {
        console.warn('[handleCreateSession fetch error, falling back to dbService]:', apiErr);
      }
    }

    if (!newSession) {
      newSession = await window.dbService.saveSession({
        courseId,
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        lecturerUid: user.uid,
        lecturerName: user.fullName,
        venue,
        date,
        startTime,
        lateThreshold,
        closeTime,
        allowManualCode,
        manualCode,
        status: 'active'
      });
    }

    window.app.closeModal();
    this.selectedSessionId = newSession.id;
    window.app.showToast(`Lecture session created for ${course.courseCode}! Opening projector view...`, 'success');
    this.render();
    this.openProjectorModal(newSession.id);
  }

  // --- Projector Screen Modal ---
  async openProjectorModal(sessionId) {
    const session = await window.dbService.getSessionById(sessionId);
    if (!session) return;

    const overlay = document.getElementById('projector-modal-overlay');
    if (!overlay) return;

    document.getElementById('projector-course-title').innerText = `${session.courseCode}: ${session.courseTitle}`;
    document.getElementById('projector-venue-info').innerText = `Venue: ${session.venue} | Late Threshold: ${session.lateThreshold} | Closes: ${session.closeTime}`;
    
    const manualCodeElem = document.getElementById('projector-manual-code-val');
    if (session.allowManualCode && session.manualCode) {
      manualCodeElem.innerText = `Lecture Code: ${session.manualCode}`;
      manualCodeElem.parentElement.style.display = 'block';
    } else {
      manualCodeElem.parentElement.style.display = 'none';
    }

    const qrWrapper = document.getElementById('projector-qr-container');
    window.attendanceEngine.renderQRCode(qrWrapper, session, 280);

    const timerElem = document.getElementById('projector-timer-countdown');
    window.attendanceEngine.startProjectorTimer(session, timerElem);

    overlay.classList.add('active');
  }

  closeProjectorModal() {
    const overlay = document.getElementById('projector-modal-overlay');
    if (overlay) overlay.classList.remove('active');
    window.attendanceEngine.stopProjectorTimer();
  }

  async exportSessionCSV(sessionId) {
    const session = await window.dbService.getSessionById(sessionId);
    const attendance = await window.dbService.getAttendance(sessionId);

    if (!attendance || attendance.length === 0) {
      alert('No attendance records to export for this session.');
      return;
    }

    let csv = `FUDMA GET 411 ATTENDANCE REPORT - GROUP 6\n`;
    csv += `Course: ${session.courseCode} - ${session.courseTitle}\n`;
    csv += `Lecturer: ${session.lecturerName}\n`;
    csv += `Venue: ${session.venue} | Date: ${session.date}\n\n`;
    csv += `S/N,Student Name,Matric Number,Course,Check-in Time,Status,Late Arrival Flag,Verification Mode\n`;

    attendance.forEach((rec, idx) => {
      csv += `"${idx + 1}","${rec.studentName}","${rec.matricNumber}","${rec.courseCode}","${rec.checkInTime}","${rec.status.toUpperCase()}","${rec.isLate ? 'YES' : 'NO'}","${rec.verificationMethod}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${session.courseCode}_Attendance_${session.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

const lecturerCtrl = new LecturerController();
window.lecturerCtrl = lecturerCtrl;

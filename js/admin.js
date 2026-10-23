/**
 * FUDMA E-Attendance System - Administrator Module
 * Course: GET 411 | Group 6 | Academic Session: 2026/2027
 */

class AdminController {
  constructor() {
    this.activeTab = 'stats'; // 'stats', 'lecturers', 'students', 'courses', 'logs'
  }

  async render() {
    const container = document.getElementById('admin-view-content');
    if (!container) return;

    if (!window.authService.hasRole('admin')) {
      container.innerHTML = `
        <div class="panel">
          <div class="panel-body" style="text-align: center; padding: 48px 20px;">
            <div style="font-size: 3rem; margin-bottom: 16px;">🔒</div>
            <h2>Access Restricted</h2>
            <p>You must be authenticated as a FUDMA System Administrator to access this registry console.</p>
            <button class="btn btn-primary" style="margin-top: 16px;" onclick="window.authService.quickSwitch('admin')">
              Switch to Administrator Account
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Load data
    const users = await window.dbService.getUsers();
    const lecturers = users.filter(u => u.role === 'lecturer');
    const students = users.filter(u => u.role === 'student');
    const courses = await window.dbService.getCourses();
    const sessions = await window.dbService.getSessions();
    const attendance = await window.dbService.getAttendance();
    const auditLogs = await window.dbService.getAuditLogs(50);

    container.innerHTML = `
      <!-- Metric Cards -->
      <div class="metrics-row">
        <div class="metric-card primary">
          <div class="metric-label">Total Students <span>🎓</span></div>
          <div class="metric-value">${students.length}</div>
          <div class="metric-sub">Registered in academic registry</div>
        </div>
        <div class="metric-card accent">
          <div class="metric-label">Lecturers <span>👨‍🏫</span></div>
          <div class="metric-value">${lecturers.length}</div>
          <div class="metric-sub">Faculty members assigned</div>
        </div>
        <div class="metric-card success">
          <div class="metric-label">Courses Active <span>📚</span></div>
          <div class="metric-value">${courses.length}</div>
          <div class="metric-sub">Session 2026/2027</div>
        </div>
        <div class="metric-card warning">
          <div class="metric-label">Total Check-Ins <span>📋</span></div>
          <div class="metric-value">${attendance.length}</div>
          <div class="metric-sub">Verified attendance events</div>
        </div>
      </div>

      <!-- Admin Tabs Navigation -->
      <div style="display: flex; gap: 8px; border-bottom: 1px solid var(--gray-200); margin-bottom: 24px; overflow-x: auto; padding-bottom: 2px;">
        <button class="btn btn-sm ${this.activeTab === 'stats' ? 'btn-primary' : 'btn-secondary'}" onclick="window.adminCtrl.setTab('stats')">📊 Overview & Reports</button>
        <button class="btn btn-sm ${this.activeTab === 'lecturers' ? 'btn-primary' : 'btn-secondary'}" onclick="window.adminCtrl.setTab('lecturers')">👨‍🏫 Manage Lecturers (${lecturers.length})</button>
        <button class="btn btn-sm ${this.activeTab === 'students' ? 'btn-primary' : 'btn-secondary'}" onclick="window.adminCtrl.setTab('students')">🎓 Manage Students (${students.length})</button>
        <button class="btn btn-sm ${this.activeTab === 'courses' ? 'btn-primary' : 'btn-secondary'}" onclick="window.adminCtrl.setTab('courses')">📚 Manage Courses (${courses.length})</button>
        <button class="btn btn-sm ${this.activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}" onclick="window.adminCtrl.setTab('logs')">🛡️ System Audit Logs</button>
      </div>

      <!-- Tab Content Area -->
      <div id="admin-tab-body">
        ${this.renderTabContent({ lecturers, students, courses, sessions, attendance, auditLogs })}
      </div>
    `;
  }

  setTab(tab) {
    this.activeTab = tab;
    this.render();
  }

  renderTabContent({ lecturers, students, courses, sessions, attendance, auditLogs }) {
    switch (this.activeTab) {
      case 'lecturers':
        return this.renderLecturersTab(lecturers, courses);
      case 'students':
        return this.renderStudentsTab(students, courses);
      case 'courses':
        return this.renderCoursesTab(courses, lecturers, students);
      case 'logs':
        return this.renderAuditLogsTab(auditLogs);
      case 'stats':
      default:
        return this.renderStatsTab(courses, sessions, attendance);
    }
  }

  // --- 1. Overview & Reports Tab ---
  renderStatsTab(courses, sessions, attendance) {
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const lateCount = attendance.filter(a => a.status === 'late').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;

    return `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>Institutional Attendance Analytics & Academic Session Controls</h2>
          </div>
          <div class="panel-actions">
            <span class="badge-group6">Active Session: 2026/2027</span>
            <button class="btn btn-secondary btn-sm" onclick="window.adminCtrl.exportAllAttendanceCSV()">📥 Export Master CSV</button>
          </div>
        </div>
        <div class="panel-body">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 24px;">
            <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-lg); padding: 20px;">
              <h3 style="font-size: 1rem; margin-bottom: 12px; color: var(--gray-800);">Attendance Status Breakdown</h3>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="status-badge status-present">Present (On-Time)</span>
                  <strong>${presentCount}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="status-badge status-late">Late Arrival</span>
                  <strong>${lateCount}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="status-badge status-absent">Absent (Finalized)</span>
                  <strong>${absentCount}</strong>
                </div>
              </div>
            </div>

            <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-lg); padding: 20px;">
              <h3 style="font-size: 1rem; margin-bottom: 12px; color: var(--gray-800);">Academic Identity Verification</h3>
              <p style="font-size: 0.85rem; margin-bottom: 6px;"><strong>Institution:</strong> Federal University Dutsin-Ma (FUDMA)</p>
              <p style="font-size: 0.85rem; margin-bottom: 6px;"><strong>Course Code:</strong> GET 411</p>
              <p style="font-size: 0.85rem; margin-bottom: 6px;"><strong>Course Title:</strong> Artificial Intelligence Mini Project</p>
              <p style="font-size: 0.85rem; margin-bottom: 6px;"><strong>Supervisor / Lecturer:</strong> Malam Nura Muhammad</p>
              <p style="font-size: 0.85rem;"><strong>Assigned Group:</strong> GROUP 6 (2026/2027 Session)</p>
            </div>
          </div>

          <h3 style="font-size: 1.05rem; margin-bottom: 12px;">Active Academic Courses</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Title</th>
                  <th>Lecturer</th>
                  <th>Enrolled Students</th>
                  <th>Session</th>
                </tr>
              </thead>
              <tbody>
                ${courses.map(c => `
                  <tr>
                    <td><strong>${c.courseCode}</strong></td>
                    <td>${c.courseTitle}</td>
                    <td>${c.lecturerUid === 'lecturer_nura' ? 'Malam Nura Muhammad' : c.lecturerUid}</td>
                    <td><span class="status-badge status-active">${(c.enrolledStudentIds || []).length} Students</span></td>
                    <td>${c.academicSession}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // --- 2. Lecturers Management Tab ---
  renderLecturersTab(lecturers, courses) {
    return `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>Lecturers & Course Instructors</h2>
          </div>
          <div class="panel-actions">
            <button class="btn btn-primary btn-sm" onclick="window.adminCtrl.openCreateLecturerModal()">+ Add New Lecturer</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Assigned Courses</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${lecturers.map(lec => {
                  const assigned = courses.filter(c => c.lecturerUid === lec.uid).map(c => c.courseCode).join(', ') || 'None';
                  const isActive = lec.status !== 'deactivated';
                  return `
                    <tr>
                      <td><code>${lec.staffId || lec.uid}</code></td>
                      <td><strong>${lec.fullName}</strong></td>
                      <td>${lec.email}</td>
                      <td>${lec.department || 'General Engineering'}</td>
                      <td><span style="font-size: 0.82rem; font-weight: 600;">${assigned}</span></td>
                      <td>
                        <span class="status-badge ${isActive ? 'status-present' : 'status-absent'}">
                          ${isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="window.adminCtrl.toggleUserStatus('${lec.uid}', '${isActive ? 'deactivated' : 'active'}')">
                          ${isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // --- 3. Students Management Tab ---
  renderStudentsTab(students, courses) {
    return `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>Registered Students</h2>
          </div>
          <div class="panel-actions">
            <button class="btn btn-primary btn-sm" onclick="window.adminCtrl.openCreateStudentModal()">+ Register New Student</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Matriculation Number</th>
                  <th>Student Full Name</th>
                  <th>Email</th>
                  <th>Level / Dept</th>
                  <th>Enrolled Courses</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${students.map(st => {
                  const enrolled = courses.filter(c => (c.enrolledStudentIds || []).includes(st.uid)).map(c => c.courseCode).join(', ') || 'None';
                  const isActive = st.status !== 'deactivated';
                  return `
                    <tr>
                      <td><strong style="color: var(--primary-800);">${st.matricNumber || 'N/A'}</strong></td>
                      <td>${st.fullName}</td>
                      <td>${st.email}</td>
                      <td>${st.level || '400L'} - ${st.department || 'Engineering'}</td>
                      <td><span style="font-size: 0.82rem; font-weight: 600;">${enrolled}</span></td>
                      <td>
                        <span class="status-badge ${isActive ? 'status-present' : 'status-absent'}">
                          ${isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="window.adminCtrl.toggleUserStatus('${st.uid}', '${isActive ? 'deactivated' : 'active'}')">
                          ${isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // --- 4. Courses Management Tab ---
  renderCoursesTab(courses, lecturers, students) {
    return `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>Course Catalog & Student Enrollments</h2>
          </div>
          <div class="panel-actions">
            <button class="btn btn-primary btn-sm" onclick="window.adminCtrl.openCreateCourseModal()">+ Create New Course</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Course Title</th>
                  <th>Lecturer</th>
                  <th>Enrolled Count</th>
                  <th>Session</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${courses.map(course => {
                  const lec = lecturers.find(l => l.uid === course.lecturerUid);
                  return `
                    <tr>
                      <td><strong>${course.courseCode}</strong></td>
                      <td>${course.courseTitle}</td>
                      <td>${lec ? lec.fullName : course.lecturerUid}</td>
                      <td><span class="status-badge status-active">${(course.enrolledStudentIds || []).length} Students</span></td>
                      <td>${course.academicSession}</td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="window.adminCtrl.openEnrollmentModal('${course.id}')">
                          Manage Enrollment
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // --- 5. Audit Logs Tab ---
  renderAuditLogsTab(auditLogs) {
    return `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>Security Activity & Attendance Audit Trail</h2>
          </div>
          <div class="panel-actions">
            <span class="form-help">Immutable server-stamped transaction logs</span>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Type</th>
                  <th>Actor Name</th>
                  <th>Target ID</th>
                  <th>Event Metadata</th>
                </tr>
              </thead>
              <tbody>
                ${auditLogs.map(log => `
                  <tr>
                    <td><small style="font-family: var(--font-mono);">${new Date(log.timestamp).toLocaleString()}</small></td>
                    <td><code>${log.eventType}</code></td>
                    <td><strong>${log.actorName}</strong></td>
                    <td><small>${log.targetId}</small></td>
                    <td><span style="font-size: 0.84rem;">${log.metadata}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // --- Modals & Handlers ---
  async toggleUserStatus(uid, newStatus) {
    const user = await window.dbService.getUserById(uid);
    if (!user) return;
    user.status = newStatus;
    await window.dbService.saveUser(user);
    window.app.showToast(`User ${user.fullName} is now ${newStatus}.`, 'info');
    this.render();
  }

  openCreateLecturerModal() {
    window.app.openModal('Add New Lecturer', `
      <form id="create-lecturer-form" onsubmit="window.adminCtrl.handleCreateLecturer(event)">
        <div class="form-group">
          <label>Full Name (with Title)</label>
          <input type="text" id="lec-fullname" class="form-control" placeholder="e.g. Dr. Aminu Sani" required />
        </div>
        <div class="form-group">
          <label>Staff Identification Number</label>
          <input type="text" id="lec-staffid" class="form-control" placeholder="e.g. FUDMA/STAFF/ENG/102" required />
        </div>
        <div class="form-group">
          <label>Institutional Email</label>
          <input type="email" id="lec-email" class="form-control" placeholder="e.g. aminu.sani@fudma.edu.ng" required />
        </div>
        <div class="form-group">
          <label>Department / Faculty</label>
          <input type="text" id="lec-dept" class="form-control" value="Computer & Engineering Sciences" required />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Lecturer Account</button>
        </div>
      </form>
    `);
  }

  async handleCreateLecturer(e) {
    e.preventDefault();
    const fullName = document.getElementById('lec-fullname').value.trim();
    const staffId = document.getElementById('lec-staffid').value.trim();
    const email = document.getElementById('lec-email').value.trim();
    const department = document.getElementById('lec-dept').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : 'Create Lecturer Account';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Creating Account...';
    }

    try {
      const existing = await window.dbService.getUserByEmail(email);
      if (existing) throw new Error('An account with this email already exists.');

      await window.dbService.saveUser({
        fullName,
        staffId,
        email,
        department,
        role: 'lecturer',
        status: 'active'
      });

      window.app.closeModal();
      window.app.showToast(`Lecturer account for ${fullName} created successfully!`, 'success');
      this.render();
    } catch (err) {
      alert(err.message || 'Failed to create lecturer account.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  }

  openCreateStudentModal() {
    window.app.openModal('Register Student', `
      <form id="create-student-form" onsubmit="window.adminCtrl.handleCreateStudent(event)">
        <div class="form-group">
          <label>Student Full Name</label>
          <input type="text" id="st-fullname" class="form-control" placeholder="e.g. Bello Haruna" required />
        </div>
        <div class="form-group">
          <label>Matriculation Number</label>
          <input type="text" id="st-matric" class="form-control" placeholder="e.g. FUDMA/2022/UG/ENG/0070" required />
        </div>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="st-email" class="form-control" placeholder="e.g. student7@fudma.edu.ng" required />
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Level</label>
            <select id="st-level" class="form-control">
              <option value="400L" selected>400 Level (Final Year)</option>
              <option value="300L">300 Level</option>
              <option value="200L">200 Level</option>
              <option value="100L">100 Level</option>
            </select>
          </div>
          <div class="form-group">
            <label>Department</label>
            <input type="text" id="st-dept" class="form-control" value="Faculty of Engineering" required />
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Register Student</button>
        </div>
      </form>
    `);
  }

  async handleCreateStudent(e) {
    e.preventDefault();
    const fullName = document.getElementById('st-fullname').value.trim();
    const matricNumber = document.getElementById('st-matric').value.trim().toUpperCase();
    const email = document.getElementById('st-email').value.trim();
    const level = document.getElementById('st-level').value;
    const department = document.getElementById('st-dept').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : 'Register Student';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Registering Student...';
    }

    try {
      const existing = await window.dbService.getUserByEmail(email);
      if (existing) throw new Error('An account with this email already exists.');

      const newStudent = await window.dbService.saveUser({
        fullName,
        matricNumber,
        email,
        level,
        department,
        role: 'student',
        status: 'active'
      });

      // Automatically enroll into GET 411 Artificial Intelligence Mini Project for demonstration
      const get411 = await window.dbService.getCourseById('course_get411');
      if (get411 && !get411.enrolledStudentIds.includes(newStudent.uid)) {
        get411.enrolledStudentIds.push(newStudent.uid);
        await window.dbService.saveCourse(get411);
      }

      window.app.closeModal();
      window.app.showToast(`Student ${fullName} registered and enrolled in GET 411!`, 'success');
      this.render();
    } catch (err) {
      alert(err.message || 'Failed to register student.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  }

  openCreateCourseModal() {
    window.app.openModal('Create New Academic Course', `
      <form id="create-course-form" onsubmit="window.adminCtrl.handleCreateCourse(event)">
        <div class="form-grid">
          <div class="form-group">
            <label>Course Code</label>
            <input type="text" id="course-code" class="form-control" placeholder="e.g. GET 411" required />
          </div>
          <div class="form-group">
            <label>Credit Units</label>
            <input type="number" id="course-units" class="form-control" value="3" min="1" max="6" required />
          </div>
        </div>
        <div class="form-group">
          <label>Course Title</label>
          <input type="text" id="course-title" class="form-control" placeholder="e.g. Artificial Intelligence Mini Project" required />
        </div>
        <div class="form-group">
          <label>Assign Course Lecturer</label>
          <select id="course-lecturer" class="form-control">
            <option value="lecturer_nura">Malam Nura Muhammad (Computer & Engineering)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Academic Session</label>
          <input type="text" id="course-session" class="form-control" value="2026/2027" required />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Course</button>
        </div>
      </form>
    `);
  }

  async handleCreateCourse(e) {
    e.preventDefault();
    const courseCode = document.getElementById('course-code').value.trim().toUpperCase();
    const courseTitle = document.getElementById('course-title').value.trim();
    const lecturerUid = document.getElementById('course-lecturer').value;
    const creditUnits = parseInt(document.getElementById('course-units').value);
    const academicSession = document.getElementById('course-session').value.trim();

    try {
      await window.dbService.saveCourse({
        courseCode,
        courseTitle,
        lecturerUid,
        creditUnits,
        academicSession,
        enrolledStudentIds: []
      });
      window.app.closeModal();
      window.app.showToast(`Course ${courseCode} created successfully!`, 'success');
      this.render();
    } catch (err) {
      alert(err.message);
    }
  }

  async openEnrollmentModal(courseId) {
    const course = await window.dbService.getCourseById(courseId);
    if (!course) return;
    const students = await window.dbService.getUsers('student');

    const checkboxesHtml = students.map(st => {
      const isChecked = (course.enrolledStudentIds || []).includes(st.uid);
      return `
        <label style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-sm); cursor: pointer;">
          <input type="checkbox" class="student-enroll-check" value="${st.uid}" ${isChecked ? 'checked' : ''} />
          <div>
            <strong>${st.fullName}</strong>
            <div style="font-size: 0.75rem; color: var(--gray-500);">${st.matricNumber || 'No Matric'}</div>
          </div>
        </label>
      `;
    }).join('');

    window.app.openModal(`Manage Enrollment: ${course.courseCode}`, `
      <div>
        <p style="font-size: 0.85rem; margin-bottom: 16px;">Select students to enroll in <strong>${course.courseCode} - ${course.courseTitle}</strong>:</p>
        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 350px; overflow-y: auto;">
          ${checkboxesHtml}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button>
          <button type="button" class="btn btn-primary" onclick="window.adminCtrl.saveEnrollments('${course.id}')">Save Changes</button>
        </div>
      </div>
    `);
  }

  async saveEnrollments(courseId) {
    const course = await window.dbService.getCourseById(courseId);
    if (!course) return;

    const checkboxes = document.querySelectorAll('.student-enroll-check');
    const enrolledIds = [];
    checkboxes.forEach(cb => {
      if (cb.checked) enrolledIds.push(cb.value);
    });

    course.enrolledStudentIds = enrolledIds;
    await window.dbService.saveCourse(course);
    window.app.closeModal();
    window.app.showToast(`Updated enrollments for ${course.courseCode}. Total: ${enrolledIds.length}`, 'success');
    this.render();
  }

  async exportAllAttendanceCSV() {
    const attendance = await window.dbService.getAttendance();
    if (!attendance || attendance.length === 0) {
      alert('No attendance records available to export.');
      return;
    }

    let csv = 'S/N,Student Name,Matric Number,Course Code,Check-in Time,Date/Timestamp,Status,Late Arrival Flag,Verification Method\n';
    attendance.forEach((rec, idx) => {
      csv += `"${idx + 1}","${rec.studentName}","${rec.matricNumber}","${rec.courseCode}","${rec.checkInTime}","${rec.timestamp}","${rec.status.toUpperCase()}","${rec.isLate ? 'YES' : 'NO'}","${rec.verificationMethod}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FUDMA_Master_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

const adminCtrl = new AdminController();
window.adminCtrl = adminCtrl;

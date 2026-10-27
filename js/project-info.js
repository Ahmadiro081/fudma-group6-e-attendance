/**
 * FUDMA E-Attendance System - Academic Project Information & Learning Module
 * Course: GET 411 | Group 6 | Academic Session: 2026/2027
 * Institution: Federal University Dutsin-Ma (FUDMA), Nigeria
 */

const STORAGE_KEY_TEAM_MEMBERS = 'fudma_group6_team_members_v1';

class ProjectInfoController {
  constructor() {
    this.defaultTeamSlots = [
      { id: 1, name: 'Nura HAMZA MASARI', matricNumber: 'ENG/2025/37401', role: 'Team Lead / Full-Stack Integration', dept: 'Engineering' },
      { id: 2, name: 'Abdullahi Nuhu', matricNumber: 'ENG/2024/31912', role: 'System Analysis & Requirements', dept: 'Engineering' },
      { id: 3, name: 'Adamu Jibril', matricNumber: 'ENG/2024/32388', role: 'Database & Cloud Firestore Architecture', dept: 'Engineering' },
      { id: 4, name: 'Dahiru Umar Karofi', matricNumber: 'ENG/2024/34360', role: 'Hardware Interface & QR Code Engine', dept: 'Engineering' },
      { id: 5, name: 'OLOYEDE PROMISE ISSAC', matricNumber: 'ENG/2024/35303', role: 'Frontend UI/UX & Responsive Design', dept: 'Mechatronics' },
      { id: 6, name: 'TAIYE JOHN OLONITOLA', matricNumber: 'ENG/2024/34750', role: 'Quality Assurance & Assessment Testing', dept: 'Engineering' },
      { id: 7, name: 'BAKIR MUHAMMAD MUSTAPHA', matricNumber: 'ENG/2024/35485', role: 'Security Rules & Documentation', dept: 'Engineering' },
      { id: 8, name: 'Abdullahi bello Muhamed', matricNumber: 'ENG/2024/32969', role: 'Embedded Systems & Mobile Verification', dept: 'Engineering' }
    ];
  }

  getTeamMembers() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEAM_MEMBERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 7) {
          let modified = false;
          parsed.forEach(m => {
            if ((m.matricNumber || '').includes('35303') && m.dept !== 'Mechatronics') {
              m.dept = 'Mechatronics';
              modified = true;
            }
          });
          // Ensure Abdullahi bello Muhamed is in the team roster
          if (!parsed.some(m => (m.matricNumber || '').includes('32969'))) {
            parsed.push({
              id: 8,
              name: 'Abdullahi bello Muhamed',
              matricNumber: 'ENG/2024/32969',
              role: 'Embedded Systems & Mobile Verification',
              dept: 'Engineering'
            });
            modified = true;
          }
          if (modified) this.saveTeamMembers(parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error loading team members:', e);
    }
    this.saveTeamMembers(this.defaultTeamSlots);
    return this.defaultTeamSlots;
  }

  saveTeamMembers(members) {
    localStorage.setItem(STORAGE_KEY_TEAM_MEMBERS, JSON.stringify(members));
  }

  render() {
    const container = document.getElementById('project-info-view-content');
    if (!container) return;

    const team = this.getTeamMembers();

    container.innerHTML = `
      <!-- Academic Identity Hero Banner -->
      <div class="hero-section" style="background: linear-gradient(135deg, #ffffff 0%, var(--primary-50) 100%);">
        <div class="hero-banner-ribbon">
          <span>🏛️ FEDERAL UNIVERSITY DUTSIN-MA (FUDMA)</span> • <span>FACULTY OF ENGINEERING & TECHNOLOGY</span>
        </div>
        <h1 class="hero-title" style="color: var(--primary-900);">
          E-ATTENDANCE SYSTEM WITH QR CODE
        </h1>
        <p class="hero-subtitle">
          An Artificial Intelligence Mini Project developed by <strong>GROUP 6</strong> for <strong>GET 411</strong> during the <strong>2026/2027</strong> Academic Session under the academic supervision of <strong>Malam Nura Muhammad</strong>.
        </p>

        <div class="academic-meta-card">
          <div>
            <div class="meta-item-label">Institution</div>
            <div class="meta-item-val">Federal University Dutsin-Ma</div>
          </div>
          <div>
            <div class="meta-item-label">Course Code & Title</div>
            <div class="meta-item-val">GET 411: AI Mini Project</div>
          </div>
          <div>
            <div class="meta-item-label">Project Group</div>
            <div class="meta-item-val"><span class="badge-group6">GROUP 6</span></div>
          </div>
          <div>
            <div class="meta-item-label">Course Lecturer</div>
            <div class="meta-item-val">Malam Nura Muhammad</div>
          </div>
          <div>
            <div class="meta-item-label">Academic Session</div>
            <div class="meta-item-val">2026/2027 Session</div>
          </div>
        </div>
      </div>

      <!-- Group 6 Team Members Section (Editable Roster) -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>👥 Group 6 Project Team Members (Official Roster)</h2>
          </div>
          <div class="panel-actions">
            <button class="btn btn-primary btn-sm" onclick="window.projectInfoCtrl.openEditTeamModal()">
              ✏️ Edit Team Roster
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.projectInfoCtrl.resetTeamRoster()">
              🔄 Reset to Template
            </button>
          </div>
        </div>
        <div class="panel-body">
          <p style="font-size: 0.88rem; color: var(--gray-600); margin-bottom: 16px;">
            In accordance with academic presentation guidelines, names and matriculation numbers are not artificially invented. Group 6 members can enter their official university matriculation numbers and names below for the physical assessment:
          </p>
          <div class="team-grid">
            ${team.map(m => `
              <div class="team-card">
                <div class="team-role">${m.role}</div>
                <div class="team-name">${m.name}</div>
                <div class="team-matric"><code>${m.matricNumber}</code></div>
                <div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 4px;">${m.dept || 'Engineering'}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Architecture & Technical Workflow Diagram -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>🔄 System Architecture & Attendance Workflow</h2>
          </div>
        </div>
        <div class="panel-body">
          <div class="workflow-diagram">
            <div class="workflow-step">
              <div class="step-num">1</div>
              <div class="step-content">
                <strong>Step 1: Lecturer Configures & Creates Lecture Session</strong>
                <span>Lecturer specifies course (GET 411), venue, start time (8:00 AM), late threshold (8:15 AM), and close time (9:00 AM).</span>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-num">2</div>
              <div class="step-content">
                <strong>Step 2: Dynamic QR Code Generated</strong>
                <span>The system produces a short-lived, structured attendance token containing session metadata, timestamp nonce, and signature.</span>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-num">3</div>
              <div class="step-content">
                <strong>Step 3: Authenticated Student Scans QR Code</strong>
                <span>Student opens the web app on mobile/laptop, signs in with institutional credentials, and points camera at the projector screen.</span>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-num">4</div>
              <div class="step-content">
                <strong>Step 4: Server-Side Validation & Duplicate Prevention</strong>
                <span>Trusted database logic verifies student authentication, course enrollment, session active state, and enforces atomic duplicate prevention via unique key <code>session_{id}_student_{uid}</code>.</span>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-num">5</div>
              <div class="step-content">
                <strong>Step 5: Automatic Latecomer Detection & Firestore Recording</strong>
                <span>Server compares current check-in time against the 8:15 AM threshold. Checked in before = <strong>Present (Green)</strong>; checked in after = <strong>Late (Orange)</strong>.</span>
              </div>
            </div>
            <div class="workflow-step">
              <div class="step-num">6</div>
              <div class="step-content">
                <strong>Step 6: Live Feed & Absence Finalization</strong>
                <span>Lecturer watches live arrivals on the dashboard. Upon lecture closure, lecturer clicks "Finalize" to mark non-attendees as <strong>Absent (Red)</strong>.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Comprehensive Technical Guide for Physical Presentation -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">
            <h2>📖 Technical Explanation Guide (For Group 6 Presentation & Defense)</h2>
          </div>
        </div>
        <div class="panel-body">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
            <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: 18px;">
              <h3 style="font-size: 1rem; color: var(--primary-900); margin-bottom: 8px;">1. Role of HTML5, CSS3, & Vanilla JavaScript</h3>
              <p style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.6;">
                <strong>HTML5</strong> provides the semantic structure of university pages (forms, headers, accessible modals). <strong>CSS3</strong> implements the FUDMA institutional design system with responsive flex/grid layouts. <strong>Vanilla JS (ES6+)</strong> coordinates camera access, client-side routing, and real-time database transactions without heavyweight compile-step overhead.
              </p>
            </div>

            <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: 18px;">
              <h3 style="font-size: 1rem; color: var(--primary-900); margin-bottom: 8px;">2. Firebase Authentication & Firestore</h3>
              <p style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.6;">
                <strong>Firebase Auth</strong> securely issues JSON Web Tokens (JWT) confirming user identity. <strong>Cloud Firestore</strong> stores collections for Users, Courses, Lecture Sessions, and Attendance Records with sub-second replication and offline persistence.
              </p>
            </div>

            <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: 18px;">
              <h3 style="font-size: 1rem; color: var(--primary-900); margin-bottom: 8px;">3. QR Generation & Camera Scanning</h3>
              <p style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.6;">
                The lecturer screen encodes an opaque, time-bound payload into a 2D QR matrix using <code>QRCode.js</code>. The student device uses <code>Html5Qrcode</code> to capture frames from the web camera via <code>navigator.mediaDevices.getUserMedia</code> and decodes the payload instantly.
              </p>
            </div>

            <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: 18px;">
              <h3 style="font-size: 1rem; color: var(--primary-900); margin-bottom: 8px;">4. Late Arrival Detection Logic</h3>
              <p style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.6;">
                When a submission is received, the server checks the trusted server timestamp against the session's <code>lateThreshold</code>. If arrival time &lt; threshold, status is <strong>Present</strong> (Green). If arrival time &ge; threshold, status is <strong>Late</strong> (Orange).
              </p>
            </div>

            <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: 18px;">
              <h3 style="font-size: 1rem; color: var(--primary-900); margin-bottom: 8px;">5. Atomic Duplicate Prevention</h3>
              <p style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.6;">
                Duplicate check-ins are strictly barred by utilizing compound document identifiers: <code>\${sessionId}_\${studentUid}</code>. Any subsequent attempt to record attendance for the same session collides with the existing record and is rejected atomically.
              </p>
            </div>

            <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: 18px;">
              <h3 style="font-size: 1rem; color: var(--primary-900); margin-bottom: 8px;">6. Security Boundaries & QR Limitations</h3>
              <p style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.6;">
                A QR code alone does not guarantee physical presence because a student could screenshot and message the QR code to an absent peer. Mitigations in this project include: short-lived tokens, closed session windows, authenticated enrollment verification, and optional Wi-Fi/IP/geo proximity in future versions.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  openEditTeamModal() {
    const team = this.getTeamMembers();
    const rowsHtml = team.map((m, idx) => `
      <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="font-size: 0.82rem; color: var(--primary-800);">Member #${idx + 1} Slot</strong>
        </div>
        <div class="form-grid" style="gap: 10px;">
          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.75rem;">Full Name</label>
            <input type="text" class="form-control team-edit-name" data-idx="${idx}" value="${m.name}" required />
          </div>
          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.75rem;">Matriculation Number</label>
            <input type="text" class="form-control team-edit-matric" data-idx="${idx}" value="${m.matricNumber}" required />
          </div>
          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.75rem;">Department</label>
            <input type="text" class="form-control team-edit-dept" data-idx="${idx}" value="${m.dept || 'Engineering'}" placeholder="e.g. Mechatronics" required />
          </div>
          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.75rem;">Project Role</label>
            <input type="text" class="form-control team-edit-role" data-idx="${idx}" value="${m.role}" required />
          </div>
        </div>
      </div>
    `).join('');

    window.app.openModal('Edit Group 6 Team Members', `
      <form id="edit-team-form" onsubmit="window.projectInfoCtrl.handleSaveTeam(event)">
        <p style="font-size: 0.85rem; color: var(--gray-600); margin-bottom: 16px;">
          Update the member names, departments, and official matriculation numbers for Group 6:
        </p>
        <div style="max-height: 400px; overflow-y: auto; padding-right: 4px;">
          ${rowsHtml}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn btn-secondary" onclick="window.app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Team Roster</button>
        </div>
      </form>
    `);
  }

  handleSaveTeam(e) {
    e.preventDefault();
    const names = document.querySelectorAll('.team-edit-name');
    const matrics = document.querySelectorAll('.team-edit-matric');
    const depts = document.querySelectorAll('.team-edit-dept');
    const roles = document.querySelectorAll('.team-edit-role');

    const updated = [];
    names.forEach((nameEl, idx) => {
      updated.push({
        id: idx + 1,
        name: nameEl.value.trim(),
        matricNumber: matrics[idx].value.trim(),
        role: roles[idx].value.trim(),
        dept: depts[idx] ? depts[idx].value.trim() : 'Engineering'
      });
    });

    this.saveTeamMembers(updated);
    window.app.closeModal();
    window.app.showToast('Group 6 Team Member details updated successfully!', 'success');
    this.render();
  }

  resetTeamRoster() {
    if (confirm('Reset team roster to default placeholder slots?')) {
      this.saveTeamMembers(this.defaultTeamSlots);
      this.render();
      window.app.showToast('Team roster reset to default template.', 'info');
    }
  }
}

const projectInfoCtrl = new ProjectInfoController();
window.projectInfoCtrl = projectInfoCtrl;

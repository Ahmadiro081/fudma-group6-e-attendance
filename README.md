# E-ATTENDANCE SYSTEM WITH QR CODE
### Artificial Intelligence Mini Project (GET 411) • Group 6 • Academic Session 2026/2027
**Federal University Dutsin-Ma (FUDMA), Katsina State, Nigeria**  
**Course Lecturer:** Malam Nura Muhammad  

---

## 🏛️ Official Academic Identity
* **Institution:** Federal University Dutsin-Ma (FUDMA)
* **Course:** GET 411
* **Project Category:** Artificial Intelligence Mini Project
* **Project Group:** GROUP 6
* **Academic Session:** 2026/2027
* **Project Title:** E-ATTENDANCE SYSTEM WITH QR CODE
* **Course Lecturer & Supervisor:** Malam Nura Muhammad

---

## 📋 Project Overview & Objectives
The **FUDMA E-Attendance System with QR Code** is a full-stack, responsive, role-based academic attendance web application engineered to replace error-prone manual paper sign-in sheets in university lecture halls.

### Key Objectives
1. **Digitize Attendance Recording:** Eliminate physical sheets and manual data re-entry.
2. **Session-Specific Dynamic QR Codes:** Allow course lecturers to generate secure, time-bound QR codes for active lectures.
3. **Authenticated Student Verification:** Ensure only authenticated, enrolled students can record their presence.
4. **Automated Server-Side Timestamping:** Eliminate timestamp tampering by computing timestamps on the trusted backend.
5. **Automated Latecomer Detection:** Compare check-in timestamps against a lecturer-configured late threshold (e.g., 15 minutes after start). Automatically tag students as **Present (Green)** or **Late (Orange)**.
6. **Atomic Duplicate Prevention:** Prevent double-scanning using compound document IDs (`session_{sessionId}_student_{studentUid}`).
7. **Live Monitoring & Absence Finalization:** Enable lecturers to observe real-time check-ins and finalize absent students (**Absent - Red**).
8. **Academic Analytical Reports:** Export lecture attendance logs directly to standard CSV format.

---

## 🛠️ Technology Stack
* **Frontend:**
  * **HTML5:** Semantic academic page architecture and accessible modal dialogs.
  * **CSS3:** University-themed design system (FUDMA Royal Blue `#0b3d91`, Amber `#f59e0b`, Emerald Green `#10b981`), glassmorphism, responsive tables, mobile layout.
  * **Vanilla JavaScript (ES6+):** Modular asynchronous state machines, route guards, and DOM orchestration without third-party framework overhead.
* **Backend & Database:**
  * **Google Firebase Authentication:** Cryptographically verified user sessions.
  * **Cloud Firestore:** NoSQL real-time document database storing Users, Courses, Lecture Sessions, Attendance Records, and Audit Logs.
  * **Firebase Cloud Functions:** Trusted server-side execution (`recordAttendance`, `finalizeSession`) preventing client tampering.
  * **Dual-Engine Architecture:** High-fidelity local database engine fallback (persisted in browser storage) allows 100% offline physical presentation and testing.
* **QR Code Processing:**
  * **QR Generation:** `qrcode.min.js` (generates time-nonce cryptographically signed tokens).
  * **QR Scanning:** `html5-qrcode.min.js` (browser-native camera stream via `navigator.mediaDevices.getUserMedia`).
* **Deployment:** Vercel / Firebase Hosting.

---

## 👥 User Roles & Permissions

### 1. Administrator (Academic Registry)
* Protected registry console.
* Create, edit, and deactivate lecturer accounts.
* Register students with official matriculation numbers and departments.
* Create courses (e.g., `GET 411`, `CPE 401`) and assign course lecturers.
* Manage course enrollments (assign students to courses).
* Access system-wide attendance analytics and immutable audit logs.
* Export master CSV attendance records.
* *Note:* Self-registration as an administrator is strictly disabled.

### 2. Lecturer (Faculty Instructor)
* View assigned courses.
* Create lecture sessions with:
  * Course code & title
  * Lecture venue (e.g., FUDMA Lecture Hall 3B)
  * Date, start time, late arrival threshold, and closing time.
  * Optional 6-character manual attendance code fallback (e.g., `AI4116`).
* Display dynamic QR code in full-screen **Projector Mode** with a live countdown timer.
* Start, pause, resume, and close attendance sessions.
* Real-time live check-in monitoring table with automatic 5-second polling.
* Finalize session: automatically mark all enrolled non-attendees as **Absent**.
* Export session-specific CSV reports.

### 3. Student (Enrolled Scholar)
* Secure sign-in to the student portal.
* View student profile (Name, Matriculation Number, Department, Level).
* View registered courses with real-time attendance standing.
* Open camera viewfinder to scan the projector QR code.
* Manual code entry fallback for devices without camera permissions.
* Instant visual status confirmation:
  * 🟢 **Present (On-Time):** Checked in prior to the late threshold.
  * 🟠 **Late Arrival:** Checked in after the late threshold.
  * 🔴 **Absent:** Finalized by the lecturer after session closure.
* View complete personal attendance history (read-only, immutable).

---

## 🔄 Core Attendance Workflow

```
Lecturer Creates Session
       │
       ▼
System Generates Cryptographic QR Code (Displayed on Projector)
       │
       ▼
Student Scans QR Code with Device Camera (or Enters 6-Char Manual Code)
       │
       ▼
Trusted Backend Validation:
  ├── 1. Is student authenticated?
  ├── 2. Is student enrolled in this course?
  ├── 3. Does session exist and is status "active"?
  └── 4. Has student ALREADY checked in? (Compound key lookup)
       │
       ▼
Latecomer Calculation:
  ├── Check-in Time < Late Threshold ──► Mark "PRESENT" (Green)
  └── Check-in Time ≥ Late Threshold ──► Mark "LATE" (Orange)
       │
       ▼
Firestore Transaction Saves Immutable Record:
  ID: `session_{sessionId}_student_{studentUid}`
       │
       ▼
Lecturer Dashboard Updates Live Feed & Finalizes Absences (Red)
```

---

## 📖 Technical Defense Guide for Group 6 Students
During your physical course assessment and presentation to **Malam Nura Muhammad**, you may be asked how specific modules function. Here are the core technical explanations:

### 1. What is the role of HTML, CSS, and Vanilla JavaScript?
* **HTML5** provides semantic document structure (`<header>`, `<nav>`, `<main>`, `<dialog>`, `<table>`).
* **CSS3** applies the FUDMA visual identity (variables, card components, projector mode, responsive tables).
* **JavaScript (ES6+)** powers client-side routing, handles the camera video stream, decodes QR matrix data, invokes server transactions, and updates the DOM dynamically.

### 2. How does Firebase Authentication protect the system?
Firebase Auth issues cryptographically signed JSON Web Tokens (JWT) upon login. Client requests pass this token in headers. The database rules and Cloud Functions read `request.auth.uid` to establish the caller's verified identity, preventing impersonation.

### 3. How does Cloud Firestore store records?
Firestore is a NoSQL document database organized into collections:
* `users`: Profiles with roles (`admin`, `lecturer`, `student`).
* `courses`: Course definitions and `enrolledStudentIds` arrays.
* `lectureSessions`: Active, paused, and closed lecture sessions.
* `attendanceRecords`: Validated check-ins indexed by session and student.
* `auditLogs`: Append-only security and activity trail.

### 4. How does QR code generation and scanning work?
* **Generation:** `qrcode.min.js` translates a JSON payload containing the `sessionId`, `courseCode`, and a cryptographic timestamp nonce into a 2D QR matrix rendered onto an HTML5 canvas.
* **Scanning:** `html5-qrcode.min.js` accesses the camera stream via `navigator.mediaDevices.getUserMedia`, captures successive video frames, applies image binarization, and extracts the payload string.

### 5. How is late arrival determined?
Late arrival is computed using the **trusted server time**, never the student's device clock (which could be manually altered). If the server timestamp is greater than or equal to `session.lateThreshold` (e.g., `08:15:00`), the record is flagged `isLate: true` and labeled **Late**.

### 6. How is duplicate attendance prevented?
Each attendance record uses a unique, deterministic document identifier composed of:
$$\text{docId} = \text{sessionId} + \text{"\_"} + \text{studentUid}$$
In Firestore, running a transaction with this unique ID guarantees that if a document with that exact compound ID already exists, any subsequent write is rejected atomically.

### 7. What are the security limitations of QR-based attendance?
A 2D QR code displayed on a screen cannot independently prove physical proximity: a student in the hall could take a photo of the code and transmit it to an absent student via instant messaging.
* **Our Project Mitigations:**
  1. Time-bound dynamic tokens with short expiration windows.
  2. Immediate closure and absence finalization by the lecturer.
  3. Course enrollment verification.
  4. Immutable audit logging of all check-in events.
  *Future recommendations for institutional roll-out include GPS geofencing and university Wi-Fi subnet verification.*

---

## ⚡ Demonstration Accounts (Pre-Seeded for Quick Testing)

| Role | Account Name | Email | Password | Identifier |
| :--- | :--- | :--- | :--- | :--- |
| **Lecturer** | Malam Nura Muhammad | `nura.muhammad@fudma.edu.ng` | `lecturer123` | Staff ID: `FUDMA/STAFF/ENG/082` |
| **Student 1** | Ibrahim Musa | `student1@fudma.edu.ng` | `student123` | Matric: `FUDMA/2022/UG/ENG/0061` |
| **Student 2** | Fatima Aliyu | `student2@fudma.edu.ng` | `student123` | Matric: `FUDMA/2022/UG/ENG/0062` |
| **Administrator** | FUDMA Academic Registry Admin | `admin@fudma.edu.ng` | `admin123` | Staff ID: `FUDMA/STAFF/ADM/014` |

*Tip:* Use the **Quick Role Switcher** pill bar at the top of the interface to switch between accounts instantly during your physical presentation!

---

## 🚀 Local Installation & Running Guide

### Option A: Open directly in any modern browser
Because the project uses standard web technologies and self-contained vendor libraries in `assets/vendor/`, you can run it immediately without requiring Node.js:
1. Double-click `index.html` or open it in Chrome, Edge, or Firefox.
2. The application will initialize the persistent local presentation engine.

### Option B: Run with a local HTTP server (Recommended for Camera Access)
Modern web browsers require a secure origin (`http://localhost` or `https://`) for camera permissions.
Using Python:
```bash
# In the project directory:
python -m http.server 3000
```
Open `http://localhost:3000` in your web browser.

Using Node.js `npx serve`:
```bash
npx serve .
```

---

## ☁️ Connecting to Real Firebase (Optional Production Step)
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project (e.g., `fudma-eattendance`).
2. Enable **Authentication** (Email/Password provider).
3. Enable **Cloud Firestore** in Production mode.
4. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
5. Deploy Cloud Functions:
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```
6. In the web application interface:
   * Click the **Presentation Engine** badge in the navigation bar.
   * Paste your Firebase Project credentials (`apiKey`, `projectId`, `appId`).
   * Switch the toggle to **Live Google Firebase Cloud**.
   * Click **Save Configuration**.

---

## 🌐 Deploying to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run in the project directory:
   ```bash
   vercel
   ```
3. Follow the CLI prompts. Vercel will deploy the application with clean URLs configured via `vercel.json`.

---

## ✅ Presentation Testing Checklist
Use this step-by-step checklist to rehearse your project defense:
- [x] **Academic Branding Verification:** Header, footer, hero, and metadata show FUDMA, GET 411, GROUP 6, 2026/2027, and Malam Nura Muhammad.
- [x] **Editable Team Roster:** Navigate to `Group 6 Info` and edit member names/matriculation numbers to match your group.
- [x] **Lecturer Creates Lecture Session:** Select GET 411, configure 8:00 AM start, 8:15 AM threshold, and 9:00 AM closing.
- [x] **Projector Mode Display:** Open Projector view, confirm QR code renders, countdown timer ticks down, and 6-character code shows.
- [x] **Student Checks In (On-Time):** Switch to Student 1, scan the QR code or enter code before threshold. Verify **Present (Green)** badge.
- [x] **Duplicate Prevention:** Try submitting attendance again for the same student. Verify error: *"Your attendance has already been recorded for this lecture."*
- [x] **Latecomer Detection:** Create a session with a past late threshold (e.g., 5 minutes ago) or submit after threshold. Verify **Late (Orange)** badge.
- [x] **Unenrolled Rejection:** Test with a student not enrolled in GET 411. Verify registration rejection.
- [x] **Live Attendance Monitoring:** Check lecturer console to confirm real-time table update and metric cards.
- [x] **Finalize Absences:** Click *Finalize & Mark Absences* on a closed session. Verify remaining enrolled students receive **Absent (Red)** badges.
- [x] **CSV Export:** Download the session CSV and inspect columns (`S/N, Student Name, Matric Number, Check-In Time, Status, Late Arrival Flag`).
- [x] **Admin Auditing:** Switch to Administrator, inspect audit logs, course assignments, and user account toggles.

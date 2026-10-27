# E-ATTENDANCE SYSTEM WITH QR CODE

### Artificial Intelligence Mini Project (GET 411) | Group 6 | 2026/2027 Academic Session

**Federal University Dutsin-Ma (FUDMA), Katsina State, Nigeria**

**Course Lecturer:** Malam Nura Muhammad

---

## 1. Project Information

* **Institution:** Federal University Dutsin-Ma (FUDMA)
* **Course:** GET 411
* **Project Category:** Artificial Intelligence Mini Project
* **Project Group:** Group 6
* **Academic Session:** 2026/2027
* **Project Title:** E-Attendance System with QR Code
* **Course Lecturer:** Malam Nura Muhammad

## 2. Project Overview

The FUDMA E-Attendance System with QR Code is a web-based application designed to support electronic attendance recording during university lectures.

The system aims to reduce the limitations of paper-based attendance registers by providing a digital platform for managing student attendance, lecture sessions, courses, and attendance reports.

The application is being developed with a responsive interface and role-based access for administrators, lecturers, and students.

## 3. Project Objectives

The main objectives are to:

1. Digitize the process of recording lecture attendance.
2. Support QR-code-based attendance verification.
3. Provide separate interfaces for administrators, lecturers, and students.
4. Support course registration and student enrollment management.
5. Record attendance timestamps and attendance status.
6. Support the identification of late arrivals.
7. Reduce duplicate attendance submissions.
8. Provide attendance monitoring and reporting.
9. Support the generation of downloadable attendance reports.
10. Improve the organization and accessibility of academic attendance records.

## 4. Technology Stack

The project uses the following technologies and services, subject to the current implementation.

### Frontend

* HTML5 for page structure.
* CSS3 for styling and responsive layouts.
* JavaScript (ES6+) for application logic and user interactions.
* Vite for development and production builds.

### Backend and Database

* Supabase for authentication and database services.
* PostgreSQL for structured academic and attendance data.
* Server-side API endpoints for operations requiring trusted backend validation.
* Vercel for application deployment and serverless API hosting.

### QR Code Functionality

The application is designed to support QR-code generation and scanning for lecture attendance using high-performance vendor libraries:
* `qrcode.min.js` for dynamic SVG/Canvas token generation.
* `html5-qrcode.min.js` for camera stream QR scanning.

## 5. User Roles

### Administrator

The administrator interface is intended to support authorized academic management activities, including:

* Managing student and lecturer records.
* Managing courses and course assignments.
* Managing student enrollments.
* Reviewing attendance information.
* Accessing authorized administrative reports.

### Lecturer

The lecturer interface is intended to support:

* Viewing assigned courses.
* Creating and managing lecture sessions.
* Displaying attendance QR codes.
* Monitoring student check-ins.
* Reviewing attendance records.
* Generating attendance reports.

### Student

The student interface is intended to support:

* Accessing a personal account.
* Viewing registered courses.
* Participating in attendance verification.
* Viewing personal attendance records.

The availability of individual functions depends on the current application implementation and backend configuration.

## 6. Attendance Workflow

The intended workflow is:

1. An authorized lecturer creates a lecture session.
2. The application generates an attendance QR code associated with the session.
3. An eligible student scans the QR code or uses another supported attendance method (such as a 6-character manual attendance code).
4. The backend validates the request, including the student's identity, enrollment, session status, and duplicate attendance.
5. The system records the attendance result and timestamp.
6. The lecturer reviews the recorded attendance.
7. Authorized users access the relevant attendance reports.

Security-sensitive validation should be performed on the trusted backend rather than relying exclusively on browser-side JavaScript.

## 7. Database Structure

The Supabase database is designed around the following entities:

* `profiles` — User profile information and roles (`admin`, `lecturer`, `student`).
* `courses` — Course information and lecturer assignments (`GET 411`, etc.).
* `course_enrollments` — Relationships between students and courses.
* `lecture_sessions` — Lecture session details, status, and manual code hash.
* `attendance_records` — Attendance records and verification details with `UNIQUE(session_id, student_id)`.
* `audit_logs` — Relevant application activity and audit information.

Actual database columns, constraints, permissions, and available operations are determined by the project's Supabase schema and configuration in `supabase/migrations/`.

## 8. Security Considerations

The application should enforce the following principles:

* Authenticate users before allowing protected operations.
* Verify permissions on the server or through appropriate Row Level Security (RLS) policies.
* Confirm that students are enrolled before accepting attendance.
* Prevent duplicate attendance records for the same student and lecture session.
* Use trusted server-side timestamps for attendance decisions.
* Protect administrative operations from unauthorized access.
* Never expose Supabase service-role credentials in browser-side code.
* Avoid publishing real passwords, API secrets, or private credentials in the repository.

QR codes alone cannot guarantee that the person scanning them is physically present in a lecture hall. Additional verification may be considered for future improvements.

## 9. Local Development

### Prerequisites

Install:

* Node.js (v18+) and npm.
* Git.
* Visual Studio Code or another suitable code editor.

### Installation

Clone the repository:

```bash
git clone https://github.com/Ahmadiro081/fudma-group6-e-attendance.git
```

Enter the project directory:

```bash
cd fudma-group6-e-attendance
```

Install the project dependencies:

```bash
npm install
```

Configure the required environment variables using `.env.example`. Do not commit private credentials to GitHub.

Start the development server:

```bash
npm run dev
```

Follow the local URL displayed in the terminal (`http://localhost:3000`).

### Production Build

Run:

```bash
npm run build
```

Use the project's configured production preview or deployment process to test the resulting build.

## 10. Deployment

The project is configured for deployment using Vercel.

The deployment URL is:

[https://fudma-group6-e-attendance.vercel.app/](https://fudma-group6-e-attendance.vercel.app/)

Deployment success does not by itself confirm that authentication, database permissions, QR verification, or attendance recording are functioning correctly. These features should be tested separately.

## 11. Testing Checklist

The team should verify the following before presenting the application:

* Academic details correctly identify FUDMA, GET 411, Group 6, and the 2026/2027 session.
* Users can authenticate through the configured authentication service.
* Role-based access controls prevent unauthorized actions.
* Lecturers can access only their authorized courses and sessions.
* Students can access their permitted course and attendance information.
* QR-code generation and verification work as intended.
* Unenrolled students cannot record attendance for a course.
* Duplicate attendance submissions are rejected.
* Attendance timestamps and status are recorded correctly.
* Attendance reports contain the expected information.
* Administrative actions respect the configured permissions.
* The production deployment works with the required environment variables.

## 12. Academic Project Team

**Institution:** Federal University Dutsin-Ma (FUDMA)  
**Course:** GET 411  
**Project Group:** Group 6  
**Academic Session:** 2026/2027  
**Course Lecturer:** Malam Nura Muhammad  

### Group 6 Members

| S/N | Full Name | Matriculation Number | Department | Role |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **Nura HAMZA MASARI** | `ENG/2025/37401` | Engineering | Team Lead / Full-Stack Integration |
| 2 | **Abdullahi Nuhu** | `ENG/2024/31912` | Engineering | System Analysis & Requirements |
| 3 | **Adamu Jibril** | `ENG/2024/32388` | Engineering | Database & Supabase Architecture |
| 4 | **Dahiru Umar Karofi** | `ENG/2024/34360` | Engineering | Hardware Interface & QR Code Engine |
| 5 | **OLOYEDE PROMISE ISSAC** | `ENG/2024/35303` | Mechatronics | Frontend UI/UX & Responsive Design |
| 6 | **TAIYE JOHN OLONITOLA** | `ENG/2024/34750` | Engineering | Quality Assurance & Assessment Testing |
| 7 | **BAKIR MUHAMMAD MUSTAPHA** | `ENG/2024/35485` | Engineering | Security Rules & Documentation |

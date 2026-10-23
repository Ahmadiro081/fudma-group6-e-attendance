import React, { useState } from 'react';
import { dbService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Course, LectureSession } from '../types';

interface CreateSessionModalProps {
  isOpen: boolean;
  courses: Course[];
  onClose: () => void;
  onCreated: (session: LectureSession) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  courses,
  onClose,
  onCreated,
}) => {
  const { currentUser } = useAuth();

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const startStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const lateThresholdDate = new Date(now.getTime() + 15 * 60000);
  const lateThresholdStr = `${String(lateThresholdDate.getHours()).padStart(2, '0')}:${String(
    lateThresholdDate.getMinutes()
  ).padStart(2, '0')}`;

  const closeDate = new Date(now.getTime() + 60 * 60000);
  const closeStr = `${String(closeDate.getHours()).padStart(2, '0')}:${String(closeDate.getMinutes()).padStart(2, '0')}`;

  const [courseId, setCourseId] = useState(courses[0]?.id || 'course_get411');
  const [venue, setVenue] = useState('FUDMA Lecture Hall 3B');
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState(startStr);
  const [lateThreshold, setLateThreshold] = useState(lateThresholdStr);
  const [closeTime, setCloseTime] = useState(closeStr);
  const [allowManualCode, setAllowManualCode] = useState(true);
  const [manualCode, setManualCode] = useState(() => 'AI' + Math.floor(1000 + Math.random() * 9000));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedCourse = courses.find((c) => c.id === courseId) || courses[0];
    if (!selectedCourse) return;

    const newSession = dbService.saveSession({
      courseId: selectedCourse.id,
      courseCode: selectedCourse.courseCode,
      courseTitle: selectedCourse.courseTitle,
      lecturerUid: currentUser?.uid || 'lecturer_nura',
      lecturerName: currentUser?.fullName || 'Malam Nura Muhammad',
      venue,
      date,
      startTime,
      lateThreshold,
      closeTime,
      allowManualCode,
      manualCode: manualCode.trim().toUpperCase(),
      status: 'active',
    });

    onCreated(newSession);
    onClose();
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-dialog">
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', color: 'var(--gray-900)' }}>
            Create Lecture Attendance Session
          </h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Course</label>
              <select
                className="form-control"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode} - {c.courseTitle}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Lecture Venue</label>
              <input
                type="text"
                className="form-control"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                required
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Attendance Opens</label>
                <input
                  type="time"
                  className="form-control"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Late Arrival Threshold ⚠️</label>
                <input
                  type="time"
                  className="form-control"
                  value={lateThreshold}
                  onChange={(e) => setLateThreshold(e.target.value)}
                  required
                />
                <span className="form-help">Arrivals after this time are marked Late (Orange badge).</span>
              </div>
              <div className="form-group">
                <label>Attendance Closes 🔒</label>
                <input
                  type="time"
                  className="form-control"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  required
                />
                <span className="form-help">Submissions after this time are rejected.</span>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={allowManualCode}
                  onChange={(e) => setAllowManualCode(e.target.checked)}
                />
                Enable 6-Character Manual Code Fallback (For students whose camera fails)
              </label>
              <input
                type="text"
                className="form-control"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '2px',
                  width: '160px',
                  marginTop: '6px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Start Lecture & Generate QR
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LectureSession } from '../types';

interface ProjectorModalProps {
  session: LectureSession | null;
  onClose: () => void;
}

export const ProjectorModal: React.FC<ProjectorModalProps> = ({ session, onClose }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('--:--');
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    if (!session) return;

    const updateTimer = () => {
      const now = new Date();
      const [closeHours, closeMinutes] = (session.closeTime || '23:59').split(':').map(Number);
      const target = new Date();
      target.setHours(closeHours, closeMinutes, 0, 0);

      const diffMs = target.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeRemaining('SESSION CLOSED');
        setIsClosed(true);
        return;
      }

      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      setTimeRemaining(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      setIsClosed(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session]);

  if (!session) return null;

  // Verifiable session token
  const tokenPayload = JSON.stringify({
    app: 'FUDMA_E_ATTENDANCE',
    group: 'GROUP_6',
    sessionId: session.id,
    courseCode: session.courseCode,
    nonce: Date.now(),
    signature: btoa(`${session.id}:${session.startTime}`).slice(0, 16),
  });

  return (
    <div className="projector-overlay active">
      <div className="projector-card">
        <div className="projector-header">
          <div className="projector-institution">FEDERAL UNIVERSITY DUTSIN-MA • GET 411 GROUP 6</div>
          <div className="projector-course">
            {session.courseCode}: {session.courseTitle}
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--gray-600)', marginTop: '6px' }}>
            Venue: {session.venue} | Date: {session.date} | Late Threshold:{' '}
            <strong style={{ color: 'var(--warning-solid)' }}>{session.lateThreshold}</strong> | Closes:{' '}
            <strong>{session.closeTime}</strong>
          </div>
        </div>

        <div style={{ fontWeight: 700, color: 'var(--primary-800)', marginBottom: '8px' }}>
          SCAN WITH STUDENT PORTAL TO REGISTER ATTENDANCE
        </div>

        <div className="projector-qr-wrapper" style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: 'var(--shadow-md)' }}>
            <QRCodeSVG
              value={tokenPayload}
              size={280}
              level="H"
              fgColor="#08245b"
              bgColor="#ffffff"
              includeMargin={true}
            />
          </div>
        </div>

        {session.allowManualCode && session.manualCode && (
          <div>
            <div className="projector-manual-code">
              <span>Lecture Code: {session.manualCode}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '4px' }}>
              (Alternative code if student camera is unavailable)
            </div>
          </div>
        )}

        <div className="projector-timer-bar">
          <span>Attendance Window Closes In:</span>
          <span
            className="timer-countdown"
            style={{ color: isClosed ? 'var(--danger-solid)' : undefined }}
          >
            {timeRemaining}
          </span>
        </div>

        <div style={{ marginTop: '24px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Projector Screen
          </button>
        </div>
      </div>
    </div>
  );
};

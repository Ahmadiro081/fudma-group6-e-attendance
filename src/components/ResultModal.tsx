import React from 'react';
import { AttendanceRecord } from '../types';

interface ResultModalProps {
  record: AttendanceRecord | null;
  error: Error | null;
  onClose: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({ record, error, onClose }) => {
  if (!record && !error) return null;

  if (error) {
    return (
      <div className="modal-overlay active">
        <div className="modal-dialog">
          <div className="modal-header">
            <h3 style={{ fontSize: '1.15rem', color: 'var(--gray-900)' }}>
              Attendance Registration Notice
            </h3>
            <button className="close-btn" onClick={onClose}>
              &times;
            </button>
          </div>
          <div className="modal-body" style={{ textAlign: 'center', padding: '12px 8px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>❌</div>
            <h3 style={{ color: 'var(--danger-solid)', marginBottom: '8px' }}>Submission Denied</h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--gray-700)', marginBottom: '16px' }}>
              {error.message}
            </p>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (record) {
    const isLate = record.isLate;
    const badgeColor = isLate ? 'var(--warning-solid)' : 'var(--success-solid)';
    const icon = isLate ? '⚠️' : '🎉';

    return (
      <div className="modal-overlay active">
        <div className="modal-dialog">
          <div className="modal-header">
            <h3 style={{ fontSize: '1.15rem', color: 'var(--gray-900)' }}>
              {isLate ? 'Attendance Recorded (Late Arrival)' : 'Attendance Recorded Successfully!'}
            </h3>
            <button className="close-btn" onClick={onClose}>
              &times;
            </button>
          </div>
          <div className="modal-body" style={{ textAlign: 'center', padding: '12px 8px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>{icon}</div>
            <h3 style={{ color: badgeColor, marginBottom: '8px' }}>
              {isLate ? 'Marked Late' : 'Marked Present (On-Time)'}
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--gray-700)', marginBottom: '16px' }}>
              Your attendance for <strong>{record.courseCode}</strong> has been securely stamped in the institutional database.
            </p>
            <div
              style={{
                background: 'var(--gray-50)',
                border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                textAlign: 'left',
                fontSize: '0.85rem',
                marginBottom: '20px',
              }}
            >
              <p style={{ marginBottom: '4px' }}>
                <strong>Student:</strong> {record.studentName}
              </p>
              <p style={{ marginBottom: '4px' }}>
                <strong>Matric No:</strong> {record.matricNumber}
              </p>
              <p style={{ marginBottom: '4px' }}>
                <strong>Check-In Time:</strong> {record.checkInTime}
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong>Method:</strong>{' '}
                {record.verificationMethod === 'qr_scan' ? 'Camera QR Code Scan' : 'Manual Code'}
              </p>
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

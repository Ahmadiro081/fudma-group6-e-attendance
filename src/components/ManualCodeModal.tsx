import React, { useState } from 'react';
import { dbService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { AttendanceRecord } from '../types';

interface ManualCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: AttendanceRecord) => void;
  onError: (error: Error) => void;
}

export const ManualCodeModal: React.FC<ManualCodeModalProps> = ({ isOpen, onClose, onSuccess, onError }) => {
  const { currentUser } = useAuth();
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Please enter the 6-character lecture code.');
      return;
    }

    if (!currentUser) {
      setErrorMsg('Please sign in as a student.');
      return;
    }

    // Find active session matching manual code
    const allSessions = dbService.getSessions();
    const targetSession = allSessions.find(
      (s) =>
        (s.status === 'active' || s.status === 'paused') &&
        s.manualCode &&
        s.manualCode.toUpperCase() === cleanCode
    );

    if (!targetSession) {
      setErrorMsg('Invalid or expired lecture code. No active attendance session matches this code.');
      return;
    }

    try {
      const result = dbService.recordAttendanceSubmission({
        sessionId: targetSession.id,
        studentUid: currentUser.uid,
        verificationMethod: 'manual_code',
      });
      onClose();
      onSuccess(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission denied');
      onError(err);
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-dialog">
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', color: 'var(--gray-900)' }}>
            Enter Lecture Code Manually
          </h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: '0.88rem', color: 'var(--gray-600)', marginBottom: '16px' }}>
              Enter the 6-character lecture code displayed on the lecturer&apos;s projector screen if your device camera is unavailable:
            </p>

            <div className="form-group">
              <label>Lecture Code (e.g. AI4116)</label>
              <input
                type="text"
                className="form-control"
                placeholder="AI4116"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.4rem',
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  fontWeight: 800,
                }}
                required
                autoFocus
              />
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--danger-solid)', fontSize: '0.85rem', marginTop: '8px' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Submit Attendance
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

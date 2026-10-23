import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { dbService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { AttendanceRecord } from '../types';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: AttendanceRecord) => void;
  onError: (error: Error) => void;
  onOpenManualCode: () => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  onOpenManualCode,
}) => {
  const { currentUser } = useAuth();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current && isStartedRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch((e) => console.warn('Error stopping scanner:', e));
        isStartedRef.current = false;
      }
      setCameraError(null);
      return;
    }

    const elementId = 'scanner-viewfinder-react';
    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;

    const qrConfig = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    scanner
      .start(
        { facingMode: 'environment' },
        qrConfig,
        (decodedText) => {
          handleDecoded(decodedText);
        },
        () => {
          // scanner frame error, normal while looking for QR
        }
      )
      .then(() => {
        isStartedRef.current = true;
      })
      .catch((err) => {
        console.warn('Camera start error:', err);
        setCameraError(
          `Camera Access Notice: ${err.message || 'Camera permission denied or camera unavailable.'} You can use the manual lecture code option!`
        );
      });

    return () => {
      if (scannerRef.current && isStartedRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch((e) => console.warn('Scanner cleanup warning:', e));
        isStartedRef.current = false;
      }
    };
  }, [isOpen]);

  const handleDecoded = async (text: string) => {
    if (!isStartedRef.current) return;

    try {
      let targetSessionId = '';
      if (text.startsWith('{') && text.endsWith('}')) {
        const parsed = JSON.parse(text);
        targetSessionId = parsed.sessionId || '';
      } else if (text.includes('session_')) {
        const match = text.match(/(session_[a-zA-Z0-9_]+)/);
        targetSessionId = match ? match[1] : text.trim();
      } else {
        targetSessionId = text.trim();
      }

      if (!targetSessionId) {
        throw new Error('Scanned QR code is not a valid FUDMA lecture attendance token.');
      }

      if (!currentUser) {
        throw new Error('Please sign in as a student before scanning.');
      }

      // Stop scanner before processing
      if (scannerRef.current && isStartedRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        isStartedRef.current = false;
      }

      const record = dbService.recordAttendanceSubmission({
        sessionId: targetSessionId,
        studentUid: currentUser.uid,
        verificationMethod: 'qr_scan',
      });

      onClose();
      onSuccess(record);
    } catch (err: any) {
      onError(err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !scannerRef.current) return;
    const file = e.target.files[0];
    scannerRef.current
      .scanFile(file, true)
      .then((decodedText) => {
        handleDecoded(decodedText);
      })
      .catch((err) => {
        setCameraError(`Could not detect QR code in uploaded image: ${err.message || err}`);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="scanner-modal active">
      <div className="scanner-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--gray-900)' }}>Scan Lecture QR Code</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '8px' }}>
          Point your device camera at the QR code displayed on the lecturer&apos;s projector screen.
        </p>

        {cameraError && (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              marginBottom: '10px',
            }}
          >
            {cameraError}
          </div>
        )}

        <div id="scanner-viewfinder-react" className="scanner-viewport" style={{ width: '100%', minHeight: '260px' }}>
          {/* Html5Qrcode attaches video here */}
        </div>

        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <label
            style={{
              display: 'inline-block',
              fontSize: '0.78rem',
              color: 'var(--primary-700)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Or upload photo of QR code
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              onClose();
              onOpenManualCode();
            }}
          >
            ⌨️ Enter Code Manually
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dbService } from '../services/db';
import { FirebaseConfigState } from '../types';

export const FirebaseConfigModal: React.FC = () => {
  const { isFirebaseConfigModalOpen, closeFirebaseConfigModal, engineMode, setEngineMode } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'mock' | 'firebase'>(engineMode);
  const [config, setConfig] = useState<FirebaseConfigState>(() => dbService.getFirebaseConfig());

  if (!isFirebaseConfigModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.saveFirebaseConfig(config, mode);
    setEngineMode(mode);
    closeFirebaseConfigModal();
    showToast(`Database configuration saved! Operating in ${mode.toUpperCase()} mode.`, 'success');
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-dialog modal-lg">
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', color: 'var(--gray-900)' }}>
            Database Engine & Firebase Configuration
          </h3>
          <button className="close-btn" onClick={closeFirebaseConfigModal}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: '14px' }}>
            This application features a dual-engine architecture: use the{' '}
            <strong>High-Fidelity Presentation Engine</strong> for offline classroom defense, or connect your live{' '}
            <strong>Google Firebase Project</strong> for cloud synchronization.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Operating Engine Mode</label>
              <select
                className="form-control"
                value={mode}
                onChange={(e) => setMode(e.target.value as 'mock' | 'firebase')}
              >
                <option value="firebase">Live Google Firebase Cloud (Auth, Firestore & Functions)</option>
                <option value="mock">Local Presentation Engine (Offline Simulation / Demo Roster)</option>
              </select>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="AIzaSy..."
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Project ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="fudma-eattendance-xxxx"
                  value={config.projectId}
                  onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Auth Domain</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="fudma-xxxx.firebaseapp.com"
                  value={config.authDomain}
                  onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>App ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="1:xxxx:web:xxxx"
                  value={config.appId}
                  onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Storage Bucket (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="fudma-xxxx.appspot.com"
                  value={config.storageBucket || ''}
                  onChange={(e) => setConfig({ ...config, storageBucket: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Messaging Sender ID (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="1234567890"
                  value={config.messagingSenderId || ''}
                  onChange={(e) => setConfig({ ...config, messagingSenderId: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Cloud Functions Region</label>
              <input
                type="text"
                className="form-control"
                placeholder="us-central1"
                value={config.functionsRegion || 'us-central1'}
                onChange={(e) => setConfig({ ...config, functionsRegion: e.target.value })}
              />
              <span className="form-help">
                Default is us-central1 unless your Firebase project functions are deployed elsewhere.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={closeFirebaseConfigModal}>
                Close
              </button>
              <button type="submit" className="btn btn-primary">
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

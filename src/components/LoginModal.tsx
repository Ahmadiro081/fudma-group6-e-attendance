import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface LoginModalProps {
  onNavigate: (view: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onNavigate }) => {
  const { isLoginModalOpen, preferredLoginRole, closeLoginModal, login, quickSwitch } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (preferredLoginRole === 'lecturer') {
      setEmail('nura.muhammad@fudma.edu.ng');
      setPassword('lecturer123');
    } else if (preferredLoginRole === 'student') {
      setEmail('student1@fudma.edu.ng');
      setPassword('student123');
    } else if (preferredLoginRole === 'admin') {
      setEmail('admin@fudma.edu.ng');
      setPassword('admin123');
    } else {
      setEmail('');
      setPassword('');
    }
    setErrorMsg('');
  }, [preferredLoginRole, isLoginModalOpen]);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const user = await login(email, password);
      showToast(`Welcome back, ${user.fullName}!`, 'success');
      closeLoginModal();
      if (user.role === 'admin') onNavigate('admin-view');
      else if (user.role === 'lecturer') onNavigate('lecturer-view');
      else onNavigate('student-view');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    }
  };

  const handleQuick = async (role: string) => {
    try {
      const user = await quickSwitch(role);
      showToast(`Signed in as: ${user.fullName}`, 'success');
      closeLoginModal();
      if (user.role === 'admin') onNavigate('admin-view');
      else if (user.role === 'lecturer') onNavigate('lecturer-view');
      else onNavigate('student-view');
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick sign-in failed');
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-dialog">
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', color: 'var(--gray-900)' }}>
            Sign In to FUDMA E-Attendance
          </h3>
          <button className="close-btn" onClick={closeLoginModal}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.88rem', color: 'var(--gray-600)', marginBottom: '16px' }}>
            Enter your institutional credentials or use the demonstration quick-switch buttons below:
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Institutional Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="e.g. nura.muhammad@fudma.edu.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--danger-solid)', fontSize: '0.82rem', marginTop: '6px' }}>
                {errorMsg}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '14px' }}>
              Sign In
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--gray-200)' }}>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--gray-500)',
                textTransform: 'uppercase',
                marginBottom: '10px',
                letterSpacing: '0.5px',
              }}
            >
              ⚡ Quick Demo Accounts (For Group 6 Presentation)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                onClick={() => handleQuick('lecturer')}
              >
                👨‍🏫 <strong>Malam Nura Muhammad</strong> (Lecturer - GET 411)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                onClick={() => handleQuick('student1')}
              >
                🎓 <strong>Ibrahim Musa</strong> (Student 1 - FUDMA/2022/UG/ENG/0061)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                onClick={() => handleQuick('student2')}
              >
                🎓 <strong>Fatima Aliyu</strong> (Student 2 - FUDMA/2022/UG/ENG/0062)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                onClick={() => handleQuick('admin')}
              >
                🛡️ <strong>Academic Registry Admin</strong> (System Administrator)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

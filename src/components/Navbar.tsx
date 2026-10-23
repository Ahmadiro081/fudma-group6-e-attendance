import React from 'react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { currentUser, engineMode, logout, openLoginModal, openFirebaseConfigModal } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <nav className="main-navbar">
      <div className="navbar-container">
        <div className="brand-wrapper" onClick={() => onNavigate('landing-view')} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <div className="brand-text">
            <h1>E-ATTENDANCE SYSTEM</h1>
            <div className="brand-subtext">WITH QR CODE • GROUP 6</div>
          </div>
        </div>

        <div className="nav-links">
          <button
            className={`nav-item ${currentView === 'landing-view' ? 'active' : ''}`}
            onClick={() => onNavigate('landing-view')}
          >
            🏠 Home
          </button>
          <button
            className={`nav-item ${currentView === 'student-view' ? 'active' : ''}`}
            onClick={() => onNavigate('student-view')}
          >
            🎓 Student Portal
          </button>
          <button
            className={`nav-item ${currentView === 'lecturer-view' ? 'active' : ''}`}
            onClick={() => onNavigate('lecturer-view')}
          >
            👨‍🏫 Lecturer Console
          </button>
          <button
            className={`nav-item ${currentView === 'admin-view' ? 'active' : ''}`}
            onClick={() => onNavigate('admin-view')}
          >
            🛡️ Admin Registry
          </button>
          <button
            className={`nav-item ${currentView === 'project-info-view' ? 'active' : ''}`}
            onClick={() => onNavigate('project-info-view')}
          >
            👥 Group 6 Info
          </button>
        </div>

        <div className="user-controls">
          {/* Dual Engine Mode Indicator */}
          <div
            id="engine-mode-badge"
            className={`engine-indicator ${engineMode === 'firebase' ? 'firebase' : 'mock'}`}
            onClick={openFirebaseConfigModal}
            title={
              engineMode === 'firebase'
                ? 'Connected to Firebase Cloud Engine. Click to inspect or reconfigure.'
                : 'Running in high-fidelity presentation database. Click to view or configure Firebase.'
            }
          >
            <span className={`pulse-dot ${engineMode === 'firebase' ? 'green' : 'amber'}`}></span>{' '}
            {engineMode === 'firebase' ? 'Live Firebase Cloud' : 'Presentation Engine'}
          </div>

          {/* User Sign In / Profile */}
          <div id="navbar-user-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentUser ? (
              <>
                <div className="user-badge" title={`${currentUser.fullName} (${currentUser.email})`}>
                  <div className="user-avatar">{getInitials(currentUser.fullName)}</div>
                  <div className="user-meta">
                    <div className="user-name">{currentUser.fullName}</div>
                    <span
                      className={`user-role-chip ${
                        currentUser.role === 'admin'
                          ? 'chip-admin'
                          : currentUser.role === 'lecturer'
                          ? 'chip-lecturer'
                          : 'chip-student'
                      }`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => logout()}>
                  Sign Out
                </button>
              </>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => openLoginModal()}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

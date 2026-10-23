import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface QuickDemoBarProps {
  onNavigate: (view: string) => void;
}

export const QuickDemoBar: React.FC<QuickDemoBarProps> = ({ onNavigate }) => {
  const { quickSwitch } = useAuth();
  const { showToast } = useToast();

  const handleSwitch = async (role: string, targetView: string) => {
    try {
      const user = await quickSwitch(role);
      showToast(`Switched account to: ${user.fullName} (${user.role.toUpperCase()})`, 'info');
      onNavigate(targetView);
    } catch (e: any) {
      showToast(e.message || 'Quick switch failed', 'danger');
    }
  };

  return (
    <div className="app-container" style={{ paddingBottom: 0 }}>
      <div className="demo-bar">
        <div className="demo-title">
          <span>⚡ Quick Role Switcher for Assessment:</span>
        </div>
        <div className="demo-pills">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleSwitch('lecturer', 'lecturer-view')}
          >
            👨‍🏫 Lecturer (Nura Muhammad)
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleSwitch('student1', 'student-view')}
          >
            🎓 Student 1 (Ibrahim)
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleSwitch('student2', 'student-view')}
          >
            🎓 Student 2 (Fatima)
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleSwitch('admin', 'admin-view')}
          >
            🛡️ Administrator
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('project-info-view')}
          >
            👥 Team Roster & Guide
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="fudma-institutional-header">
      <div className="header-identity-left">
        <span className="fudma-crest-badge">FUDMA</span>
        <span className="institution-title">FEDERAL UNIVERSITY DUTSIN-MA</span>
        <span className="course-meta-tag">
          • GET 411: Artificial Intelligence Mini Project{' '}
          <span className="badge-group6">GROUP 6</span>
        </span>
      </div>
      <div className="header-session-info">
        <span>Lecturer: <strong>Nura Muhammad</strong></span>
        <span>•</span>
        <span>Session: <strong>2026/2027</strong></span>
      </div>
    </header>
  );
};

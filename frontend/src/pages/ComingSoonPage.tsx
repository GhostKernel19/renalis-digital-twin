import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './ComingSoonPage.css';

const PAGE_METADATA: Record<string, { title: string; description: string; icon: string }> = {
  '/patients': {
    title: 'Patient Directory & Digital Twins',
    description: 'Comprehensive longitudinal patient telemetry, baseline demographics, and counterfactual trajectory viewer.',
    icon: '👥',
  },
  '/assessment': {
    title: 'New Progression Risk Assessment',
    description: 'Interactive counterfactual simulation and ML progression risk evaluation from months 1-9 telemetry.',
    icon: '⚡',
  },
  '/referrals': {
    title: 'Multidisciplinary Referral Queue',
    description: 'KDIGO guideline-driven care coordination, nephrology consultation requests, and triage workflows.',
    icon: '📋',
  },
  '/follow-ups': {
    title: 'Scheduled Patient Follow-ups',
    description: 'Automated care touchpoints, medication adherence reminders, and repeat lab test scheduling.',
    icon: '📅',
  },
  '/reports': {
    title: 'Clinical Cohort & Audit Reports',
    description: 'Population-level CKD progression trends, model evaluation audits, and quality metrics export.',
    icon: '📊',
  },
};

export const ComingSoonPage: React.FC = () => {
  const location = useLocation();
  const info = PAGE_METADATA[location.pathname] || {
    title: 'Clinical Module',
    description: 'This digital twin care coordination module is scheduled for the upcoming development phase.',
    icon: '🩺',
  };

  return (
    <div className="coming-soon-container">
      <div className="coming-soon-card">
        <div className="coming-soon-icon">{info.icon}</div>
        <span className="coming-soon-badge">Phase 2 • Coming Soon</span>
        <h2 className="coming-soon-title">{info.title}</h2>
        <p className="coming-soon-description">{info.description}</p>
        <div className="coming-soon-actions">
          <Link to="/" className="coming-soon-button">
            ← Return to Clinical Overview
          </Link>
        </div>
      </div>
    </div>
  );
};

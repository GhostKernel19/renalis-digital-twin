import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string>('Nephrologist (Lead)');

  const navItems: NavItem[] = [
    {
      label: 'Overview',
      path: '/',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      label: 'Patients',
      path: '/patients',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'New Assessment',
      path: '/assessment',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      badge: 'ML',
    },
    {
      label: 'Referrals',
      path: '/referrals',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 14h6" />
          <path d="M9 10h6" />
          <path d="M9 18h4" />
        </svg>
      ),
    },
    {
      label: 'Follow-ups',
      path: '/follow-ups',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-mark">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
              stroke="#5279B9"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M12 6L7 9V15L12 18L17 15V9L12 6Z"
              fill="#176B63"
              fillOpacity="0.7"
              stroke="#176B63"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
          </svg>
        </div>
        <div className="sidebar-brand-text">
          <h1 className="sidebar-brand-title">RENALIS</h1>
          <span className="sidebar-brand-subtitle">CKD Digital Twin</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-section-label">CLINICAL NAVIGATION</div>
        <ul className="sidebar-nav-list">
          {navItems.map((item) => (
            <li key={item.path} className="sidebar-nav-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-nav-link ${isActive ? 'active' : ''}`
                }
                end={item.path === '/'}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
                {item.badge && <span className="sidebar-nav-badge">{item.badge}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section: Role Selector & User Profile */}
      <div className="sidebar-footer">
        <div className="sidebar-role-selector">
          <label htmlFor="role-select" className="sidebar-role-label">
            ACTIVE ROLE
          </label>
          <div className="sidebar-select-wrapper">
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="sidebar-select"
            >
              <option value="Nephrologist (Lead)">Nephrologist (Lead)</option>
              <option value="Care Coordinator">Care Coordinator</option>
              <option value="Clinical Informatics">Clinical Informatics</option>
            </select>
            <span className="sidebar-select-arrow">▾</span>
          </div>
        </div>

        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">
            <span>SL</span>
            <span className="sidebar-user-status-dot" title="Online" />
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">Dr. Sarah Lin</span>
            <span className="sidebar-user-role">{selectedRole}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

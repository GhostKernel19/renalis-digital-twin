import React, { useState } from 'react';
import './TopBar.css';

interface TopBarProps {
  onSearch?: (query: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  // Format current date e.g. "Saturday, Oct 17, 2026"
  const [formattedDate] = useState(() =>
    new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date())
  );

  return (
    <header className="topbar">
      {/* Search Input */}
      <div className="topbar-search-container">
        <div className="topbar-search-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search patients by ID, name, or clinical condition..."
          className="topbar-search-input"
        />
        {searchQuery && (
          <button
            type="button"
            className="topbar-search-clear"
            onClick={() => {
              setSearchQuery('');
              if (onSearch) onSearch('');
            }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="topbar-actions">
        {/* Synthetic Data Notice Pill */}
        <div className="topbar-synthetic-pill" title="All patient records and outcomes are 100% synthetic for the Digital Twin Challenge 2026.">
          <span className="synthetic-dot" />
          <span className="synthetic-label">Synthetic Cohort</span>
          <span className="synthetic-tag">Non-Clinical</span>
        </div>

        {/* Current Date Display */}
        <div className="topbar-date">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{formattedDate}</span>
        </div>

        {/* Notifications Bell */}
        <button
          type="button"
          className="topbar-icon-button"
          aria-label="Notifications"
          title="Care alerts & pending reviews"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="topbar-bell-badge" />
        </button>
      </div>
    </header>
  );
};

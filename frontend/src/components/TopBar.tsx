import React, { useState, useRef, useEffect } from 'react';
import { useApp, type AppLanguage } from '../context/AppContext';
import './TopBar.css';

export const TopBar: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    language,
    setLanguage,
    patientId,
    setPatientId,
    availablePatientIds,
    t,
  } = useApp();

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleLanguageToggle = (lang: AppLanguage) => {
    setLanguage(lang);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredPatientIds = availablePatientIds.filter((id) =>
    id.toLowerCase().includes(pickerSearch.toLowerCase().trim())
  );

  return (
    <header className="renalis-topbar" role="banner">
      {/* Left: Brand Logo & Title */}
      <div className="topbar-brand">
        <div className="topbar-logo-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l.77.78L12 21l7.65-7.99.77-.78a5.4 5.4 0 0 0 0-7.65z" />
            <path d="M3.5 12h4l2-3 3 6 2-3h5" />
          </svg>
        </div>
        <span className="topbar-brand-name">RENALIS</span>
      </div>

      {/* Center/Right Controls */}
      <div className="topbar-controls">
        {/* View Mode Toggle: Patient / Care team */}
        <div className="topbar-view-mode-wrapper">
          <span className="view-mode-label">{t.viewAs}</span>
          <div className="topbar-view-mode-toggle" role="radiogroup" aria-label="View as role">
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'patient'}
              className={`view-mode-btn ${viewMode === 'patient' ? 'is-active' : ''}`}
              onClick={() => setViewMode('patient')}
            >
              {t.rolePatient}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'care-team'}
              className={`view-mode-btn ${viewMode === 'care-team' ? 'is-active' : ''}`}
              onClick={() => setViewMode('care-team')}
            >
              {t.roleCareTeam}
            </button>
          </div>
        </div>

        {/* Patient Picker (Visible in Patient Mode) */}
        {viewMode === 'patient' && (
          <div className="topbar-patient-picker" ref={pickerRef}>
            <button
              type="button"
              className="patient-picker-trigger"
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              aria-expanded={isPickerOpen}
              aria-haspopup="listbox"
              title="Select synthetic patient ID"
            >
              <span className="patient-picker-label">ID:</span>
              <strong className="patient-picker-id">{patientId}</strong>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isPickerOpen && (
              <div className="patient-picker-dropdown" role="listbox">
                <div className="patient-picker-search-box">
                  <input
                    type="text"
                    className="patient-picker-search-input"
                    placeholder="Search synthetic ID..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="patient-picker-list">
                  {filteredPatientIds.length > 0 ? (
                    filteredPatientIds.slice(0, 30).map((id) => (
                      <button
                        key={id}
                        type="button"
                        role="option"
                        aria-selected={id === patientId}
                        className={`patient-picker-item ${id === patientId ? 'is-selected' : ''}`}
                        onClick={() => {
                          setPatientId(id);
                          setIsPickerOpen(false);
                          setPickerSearch('');
                        }}
                      >
                        <span>{id}</span>
                        {id === patientId && <span className="check-indicator">✓</span>}
                      </button>
                    ))
                  ) : (
                    <div className="patient-picker-empty">No synthetic IDs match "{pickerSearch}"</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Language Switch: English / हिंदी / मराठी */}
        <div className="topbar-language-switch" aria-label="Select language">
          <button
            type="button"
            className={`lang-btn ${language === 'en' ? 'is-selected' : ''}`}
            onClick={() => handleLanguageToggle('en')}
            aria-label="English"
          >
            English
          </button>
          <span className="lang-separator" aria-hidden="true">/</span>
          <button
            type="button"
            className={`lang-btn ${language === 'hi' ? 'is-selected' : ''}`}
            onClick={() => handleLanguageToggle('hi')}
            aria-label="Hindi"
          >
            हिंदी
          </button>
          <span className="lang-separator" aria-hidden="true">/</span>
          <button
            type="button"
            className={`lang-btn ${language === 'mr' ? 'is-selected' : ''}`}
            onClick={() => handleLanguageToggle('mr')}
            aria-label="Marathi"
          >
            मराठी
          </button>
        </div>

        {/* User Chip */}
        <div
          className="topbar-user-chip"
          title={viewMode === 'patient' ? `Active Synthetic Patient: ${patientId}` : 'Active Care Team View'}
        >
          <div className={`user-chip-avatar ${viewMode === 'patient' ? 'avatar-patient' : 'avatar-careteam'}`}>
            {viewMode === 'patient' ? 'ID' : 'CT'}
          </div>
          <span className="user-chip-name">
            {viewMode === 'patient' ? `Patient ${patientId}` : t.roleCareTeam}
          </span>
        </div>
      </div>
    </header>
  );
};

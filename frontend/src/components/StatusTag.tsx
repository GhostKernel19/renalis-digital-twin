import React from 'react';
import './StatusTag.css';

export type StatusTagVariant = 'green' | 'amber' | 'red' | 'routine' | 'urgent' | 'complete' | 'current';

export interface StatusTagProps {
  variant: StatusTagVariant;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const StatusTag: React.FC<StatusTagProps> = ({
  variant,
  label,
  icon,
  className = '',
}) => {
  // Normalize color tier
  const colorTier: 'green' | 'amber' | 'red' =
    variant === 'routine' || variant === 'complete' || variant === 'green'
      ? 'green'
      : variant === 'urgent' || variant === 'red'
      ? 'red'
      : 'amber';

  // Default display labels if none provided
  const displayLabel =
    label ||
    (variant === 'routine'
      ? 'Routine'
      : variant === 'complete'
      ? 'Complete'
      : variant === 'urgent'
      ? 'Urgent'
      : variant === 'current'
      ? 'Current step'
      : variant.toUpperCase());

  // Default icons matching the images
  const renderDefaultIcon = () => {
    if (colorTier === 'green') {
      if (variant === 'complete') {
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      }
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    }
    if (colorTier === 'red') {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    }
    // amber
    if (variant === 'current') {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    }
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  };

  return (
    <span className={`status-tag status-tag--${colorTier} ${className}`}>
      <span className="status-tag-icon" aria-hidden="true">
        {icon || renderDefaultIcon()}
      </span>
      <span className="status-tag-label">{displayLabel}</span>
    </span>
  );
};

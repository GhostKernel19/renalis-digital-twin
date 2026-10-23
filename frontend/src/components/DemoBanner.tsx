import React from 'react';
import './DemoBanner.css';

interface DemoBannerProps {
  text?: string;
  className?: string;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({
  text = 'Demo only: all patient data is synthetic',
  className = '',
}) => {
  return (
    <aside className={`demo-banner ${className}`} role="status" aria-label="Synthetic demo disclaimer">
      <div className="demo-banner-content">
        <svg
          className="demo-banner-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Flask / Beaker Icon matching the design image */}
          <path d="M10 2v6.5L4.5 18A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 8.5V2" />
          <path d="M8.5 2h7" />
          <path d="M7 16h10" />
        </svg>
        <span className="demo-banner-text">{text}</span>
      </div>
    </aside>
  );
};

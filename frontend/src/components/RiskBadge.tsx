import React from 'react';
import './RiskBadge.css';

export type RiskLevel = 'High' | 'Medium' | 'Low';

interface RiskBadgeProps {
  level: RiskLevel | string;
  size?: 'sm' | 'md';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md' }) => {
  const normalizedLevel: RiskLevel =
    level?.toLowerCase() === 'high'
      ? 'High'
      : level?.toLowerCase() === 'low'
      ? 'Low'
      : 'Medium';

  return (
    <span className={`risk-badge risk-${normalizedLevel.toLowerCase()} size-${size}`}>
      <span className="risk-dot" />
      <span className="risk-label">{normalizedLevel}</span>
    </span>
  );
};

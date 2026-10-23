import React from 'react';
import './Toggle.css';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  id,
  disabled = false,
}) => {
  const switchId = id || React.useId();

  return (
    <label htmlFor={switchId} className={`renalis-switch-label ${disabled ? 'disabled' : ''}`}>
      <span className="switch-wrapper">
        <input
          id={switchId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="switch-input"
        />
        <span className="switch-slider" aria-hidden="true" />
      </span>
      {label && <span className="switch-text">{label}</span>}
    </label>
  );
};

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedToggleProps<T extends string> {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (val: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel = 'Select option',
  className = '',
}: SegmentedToggleProps<T>) {
  return (
    <div className={`renalis-segmented-toggle ${className}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`segmented-button ${isSelected ? 'is-selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.icon && <span className="segmented-icon">{option.icon}</span>}
            <span className="segmented-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const Toggle = {
  Switch,
  Segmented: SegmentedToggle,
};

import React, { useId } from 'react';
import './Field.css';

export interface FieldProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  helperText,
  error,
  required,
  className = '',
  children,
}) => {
  const generatedId = useId();

  return (
    <div className={`renalis-field ${className}`}>
      {label && (
        <label htmlFor={generatedId} className="renalis-field-label">
          {label}
          {required && <span className="field-required-star" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="renalis-field-control">
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, {
              id: (children as React.ReactElement<any>).props.id || generatedId,
            })
          : children}
      </div>
      {error && <p className="renalis-field-error" role="alert">{error}</p>}
      {!error && helperText && <p className="renalis-field-helper">{helperText}</p>}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  iconLeft,
  iconRight,
  className = '',
  ...props
}) => {
  return (
    <div className="renalis-input-wrapper">
      {iconLeft && <span className="input-icon-left">{iconLeft}</span>}
      <input
        className={`renalis-input ${iconLeft ? 'has-icon-left' : ''} ${iconRight ? 'has-icon-right' : ''} ${className}`}
        {...props}
      />
      {iconRight && <span className="input-icon-right">{iconRight}</span>}
    </div>
  );
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  options,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className="renalis-select-wrapper">
      <select className={`renalis-select ${className}`} {...props}>
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      <span className="select-arrow" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </div>
  );
};

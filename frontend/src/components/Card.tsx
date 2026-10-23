import React from 'react';
import './Card.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'raised' | 'inset' | 'flat';
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: React.ElementType;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'raised',
  className = '',
  padding = 'md',
  as: Component = 'div',
  ...rest
}) => {
  return (
    <Component
      className={`renalis-card renalis-card--${variant} renalis-card--pad-${padding} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
};

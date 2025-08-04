import React from 'react';

interface IconProps {
  className?: string;
}

export const RefreshCw: React.FC<IconProps> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export const AlertCircle: React.FC<IconProps> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

export const CheckCircle: React.FC<IconProps> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const Clock: React.FC<IconProps> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12,6 12,12 16,14"></polyline>
  </svg>
);

export const BarChart3: React.FC<IconProps> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13l4-4 4 4 4-4 4 4" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21l18 0" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21l0-8" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21l0-12" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21l0-6" />
  </svg>
);

export const Activity: React.FC<IconProps> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"></polyline>
  </svg>
);

export const ChevronDown: React.FC<IconProps> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="6,9 12,15 18,9"></polyline>
  </svg>
);

export const ChevronUp: React.FC<IconProps> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="18,15 12,9 6,15"></polyline>
  </svg>
);

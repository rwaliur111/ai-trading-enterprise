import React from 'react';

export function Button({ 
  children, 
  onClick, 
  className = '', 
  disabled = false 
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  className?: string, 
  disabled?: boolean 
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
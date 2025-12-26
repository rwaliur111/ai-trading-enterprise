import React from 'react';

export function Input({ 
  type = 'text', 
  value, 
  onChange, 
  placeholder = '', 
  className = '' 
}: { 
  type?: string, 
  value: string, 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
  placeholder?: string, 
  className?: string 
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`border rounded-md px-3 py-2 ${className}`}
    />
  );
}
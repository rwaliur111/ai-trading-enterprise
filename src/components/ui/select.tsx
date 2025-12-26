import React from 'react';

export function Select({ 
  value, 
  onValueChange, 
  children 
}: { 
  value: string, 
  onValueChange: (value: string) => void, 
  children: React.ReactNode 
}) {
  return (
    <select 
      value={value} 
      onChange={(e) => onValueChange(e.target.value)}
      className="border rounded-md px-3 py-2 w-full"
    >
      {children}
    </select>
  );
}

export function SelectTrigger({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span>{placeholder || 'Select...'}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({ value, children }: { value: string, children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}
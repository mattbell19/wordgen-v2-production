import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormErrorProps {
  message?: string;
  className?: string;
}

/**
 * Form error component to display validation errors
 */
export const FormError: React.FC<FormErrorProps> = ({ 
  message, 
  className = '' 
}) => {
  if (!message) return null;
  
  return (
    <div className={`flex items-center text-destructive text-sm mt-1 ${className}`}>
      <AlertCircle className="h-4 w-4 mr-1" />
      <span>{message}</span>
    </div>
  );
};

/**
 * Form success component to display success messages
 */
export const FormSuccess: React.FC<FormErrorProps> = ({ 
  message, 
  className = '' 
}) => {
  if (!message) return null;
  
  return (
    <div className={`flex items-center text-green-500 text-sm mt-1 ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 mr-1"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
};

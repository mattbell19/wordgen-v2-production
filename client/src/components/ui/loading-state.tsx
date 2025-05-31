import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Loading state component for async operations
 * Displays a loading spinner and text when isLoading is true
 * Otherwise, renders the children
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  children,
  loadingText = 'Loading...',
  className = '',
  size = 'md',
}) => {
  if (isLoading) {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-6 w-6',
    };

    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className={`mr-2 ${sizeClasses[size]} animate-spin`} />
        <span>{loadingText}</span>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Full page loading spinner
 */
export const FullPageLoading: React.FC<{
  loadingText?: string;
}> = ({ loadingText = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{loadingText}</p>
      </div>
    </div>
  );
};

/**
 * Button loading spinner
 */
export const ButtonLoading: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return <Loader2 className={`h-4 w-4 animate-spin ${className}`} />;
};

/**
 * Card loading skeleton
 */
export const CardSkeleton: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <div className="space-y-3">
        <div className="h-5 w-2/3 rounded-md bg-muted animate-pulse"></div>
        <div className="h-4 w-full rounded-md bg-muted animate-pulse"></div>
        <div className="h-4 w-full rounded-md bg-muted animate-pulse"></div>
        <div className="h-4 w-1/2 rounded-md bg-muted animate-pulse"></div>
      </div>
    </div>
  );
};

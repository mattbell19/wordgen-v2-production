import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Info,
  RefreshCw,
  Wifi,
  Server,
  ShieldAlert,
  BadgeAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ErrorType = 
  | 'default'
  | 'network'
  | 'server'
  | 'auth'
  | 'validation'
  | 'notFound'
  | 'permission'
  | 'timeout'
  | 'fatal';

export interface ErrorDisplayProps {
  title?: string;
  description?: string;
  details?: string;
  type?: ErrorType;
  className?: string;
  error?: Error | null;
  showRetry?: boolean;
  onRetry?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Helper function to get the appropriate icon for the error type
 */
const getErrorIcon = (type: ErrorType) => {
  switch (type) {
    case 'network':
      return <Wifi className="h-5 w-5 text-destructive" />;
    case 'server':
      return <Server className="h-5 w-5 text-destructive" />;
    case 'auth':
      return <ShieldAlert className="h-5 w-5 text-destructive" />;
    case 'validation':
      return <BadgeAlert className="h-5 w-5 text-destructive" />;
    case 'notFound':
      return <AlertTriangle className="h-5 w-5 text-destructive" />;
    case 'permission':
      return <Ban className="h-5 w-5 text-destructive" />;
    case 'timeout':
      return <RefreshCw className="h-5 w-5 text-destructive" />;
    case 'fatal':
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    case 'default':
    default:
      return <Info className="h-5 w-5 text-destructive" />;
  }
};

/**
 * Helper function to get default title based on error type
 */
const getDefaultTitle = (type: ErrorType): string => {
  switch (type) {
    case 'network':
      return 'Network Error';
    case 'server':
      return 'Server Error';
    case 'auth':
      return 'Authentication Error';
    case 'validation':
      return 'Validation Error';
    case 'notFound':
      return 'Not Found';
    case 'permission':
      return 'Permission Denied';
    case 'timeout':
      return 'Request Timeout';
    case 'fatal':
      return 'Fatal Error';
    case 'default':
    default:
      return 'An Error Occurred';
  }
};

/**
 * Helper function to get default description based on error type
 */
const getDefaultDescription = (type: ErrorType): string => {
  switch (type) {
    case 'network':
      return 'Unable to connect. Please check your internet connection and try again.';
    case 'server':
      return 'The server encountered an error. Please try again later.';
    case 'auth':
      return 'You must be logged in to access this resource.';
    case 'validation':
      return 'Please check your input and try again.';
    case 'notFound':
      return 'The requested resource could not be found.';
    case 'permission':
      return 'You do not have permission to access this resource.';
    case 'timeout':
      return 'The request took too long to complete. Please try again.';
    case 'fatal':
      return 'A critical error has occurred. Please contact support.';
    case 'default':
    default:
      return 'Something unexpected went wrong. Please try again.';
  }
};

/**
 * A standardized component for displaying errors throughout the application
 */
export function ErrorDisplay({
  title,
  description,
  details,
  type = 'default',
  className,
  error,
  showRetry = false,
  onRetry,
  actionLabel,
  onAction,
}: ErrorDisplayProps) {
  // Use provided title/description or fall back to defaults
  const displayTitle = title || getDefaultTitle(type);
  const displayDescription = description || getDefaultDescription(type);
  
  // Use error message if provided and no description was set
  const errorMessage = !description && error?.message 
    ? error.message 
    : details || '';

  return (
    <Alert 
      variant="destructive" 
      className={cn('my-4', className)}
    >
      {getErrorIcon(type)}
      <AlertTitle>{displayTitle}</AlertTitle>
      <AlertDescription className="mt-2">
        {displayDescription}
        {errorMessage && (
          <div className="mt-2 text-sm opacity-80">
            {errorMessage}
          </div>
        )}
        {(showRetry || actionLabel) && (
          <div className="mt-4 flex gap-2">
            {showRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                className="gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            )}
            {actionLabel && onAction && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
} 
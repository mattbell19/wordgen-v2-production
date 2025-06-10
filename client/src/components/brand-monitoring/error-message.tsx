import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';

interface ErrorMessageProps {
  title: string;
  message: string;
  onRetry?: () => void;
  showHelp?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  onRetry,
  showHelp = true
}) => {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          <p>{message}</p>
          
          {showHelp && (
            <div className="text-sm space-y-1 bg-red-50 p-3 rounded">
              <p className="font-semibold">Troubleshooting tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your internet connection</li>
                <li>Try refreshing the page</li>
                <li>If the issue persists, try again in a few minutes</li>
              </ul>
            </div>
          )}
          
          <div className="flex gap-2">
            {onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="bg-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              variant="outline"
              className="bg-white"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
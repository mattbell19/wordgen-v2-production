# Client-Side Error Handling Improvement Plan

This document outlines the plan for improving client-side error handling and user feedback in the WordGen v2 application.

## Current Issues

1. Inconsistent error handling across different components
2. Limited user feedback for errors and successful operations
3. No global error boundary to catch unexpected errors
4. No loading states for async operations
5. No retry mechanism for failed API calls

## Improvement Plan

### 1. Create a Global Error Boundary

Implement a global error boundary component to catch and display unexpected errors:

```tsx
// client/src/components/error-boundary.tsx
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    // Here we could send the error to an error tracking service like Sentry
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              {this.state.error?.message || 'An unexpected error occurred'}
            </AlertDescription>
            <div className="mt-4">
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Reload Page
              </Button>
            </div>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 2. Enhance the Toast Notification System

Improve the toast notification system to provide consistent feedback for errors and successful operations:

```tsx
// client/src/components/ui/toast-provider.tsx
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export const showSuccessToast = (title: string, description?: string) => {
  const { toast } = useToast();
  toast({
    title,
    description,
    variant: 'default',
  });
};

export const showErrorToast = (title: string, description?: string, action?: { label: string; onClick: () => void }) => {
  const { toast } = useToast();
  toast({
    title,
    description,
    variant: 'destructive',
    action: action ? (
      <ToastAction altText={action.label} onClick={action.onClick}>
        {action.label}
      </ToastAction>
    ) : undefined,
  });
};

export const showInfoToast = (title: string, description?: string) => {
  const { toast } = useToast();
  toast({
    title,
    description,
    variant: 'default',
  });
};
```

### 3. Create a Loading State Component

Implement a loading state component for async operations:

```tsx
// client/src/components/ui/loading-state.tsx
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  children,
  loadingText = 'Loading...',
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span>{loadingText}</span>
      </div>
    );
  }

  return <>{children}</>;
};
```

### 4. Enhance API Utility Functions

Update the API utility functions to handle errors consistently:

```tsx
// client/src/lib/api-utils.ts
import { showErrorToast } from '@/components/ui/toast-provider';

export async function fetchJSON<T = any>(url: string, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      },
      credentials: 'include',
      ...options
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || `API Error: ${response.status}`);
      (error as any).status = response.status;
      (error as any).errorCode = data.error;
      (error as any).details = data.details;
      throw error;
    }

    return data.data;
  } catch (error) {
    console.error('API request failed:', error);
    
    // Show toast notification for the error
    if (error instanceof Error) {
      showErrorToast(
        'Request Failed', 
        error.message || 'An unexpected error occurred'
      );
    } else {
      showErrorToast('Request Failed', 'An unexpected error occurred');
    }
    
    throw error;
  }
}

export async function postJSON<T = any>(url: string, data: any, options = {}) {
  return fetchJSON<T>(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  });
}

export async function putJSON<T = any>(url: string, data: any, options = {}) {
  return fetchJSON<T>(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options
  });
}

export async function deleteJSON<T = any>(url: string, options = {}) {
  return fetchJSON<T>(url, {
    method: 'DELETE',
    ...options
  });
}
```

### 5. Add Retry Mechanism for Failed API Calls

Implement a retry mechanism for failed API calls:

```tsx
// client/src/lib/retry-utils.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = (error) => true
  } = options;

  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (!shouldRetry(error) || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      
      console.log(`Retrying API call, attempt ${attempt + 1} of ${maxRetries}`);
    }
  }
  
  throw lastError;
}
```

### 6. Update React Query Configuration

Enhance the React Query configuration to handle errors consistently:

```tsx
// client/src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';
import { showErrorToast } from '@/components/ui/toast-provider';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (error: any) => {
        console.error('Query error:', error);
        showErrorToast(
          'Query Failed',
          error.message || 'An unexpected error occurred'
        );
      }
    },
    mutations: {
      retry: 0,
      onError: (error: any) => {
        console.error('Mutation error:', error);
        showErrorToast(
          'Operation Failed',
          error.message || 'An unexpected error occurred'
        );
      }
    }
  }
});
```

### 7. Implement Form Error Handling

Enhance form error handling to display validation errors consistently:

```tsx
// client/src/components/ui/form-error.tsx
import { AlertCircle } from 'lucide-react';

interface FormErrorProps {
  message?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ message }) => {
  if (!message) return null;
  
  return (
    <div className="flex items-center text-red-500 text-sm mt-1">
      <AlertCircle className="h-4 w-4 mr-1" />
      <span>{message}</span>
    </div>
  );
};
```

## Implementation Plan

1. Create the global error boundary component
2. Enhance the toast notification system
3. Create the loading state component
4. Update the API utility functions
5. Add the retry mechanism for failed API calls
6. Update the React Query configuration
7. Implement form error handling
8. Apply these improvements to key components:
   - Dashboard
   - Article generation
   - Word generation
   - User settings
   - Authentication forms

## Testing Plan

1. Test error handling for API failures
2. Test error boundary for component errors
3. Test loading states for async operations
4. Test form validation errors
5. Test retry mechanism for failed API calls

## Success Criteria

1. All API calls have consistent error handling
2. Users receive clear feedback for errors and successful operations
3. Loading states are displayed for all async operations
4. Unexpected errors are caught and displayed in a user-friendly way
5. Failed API calls are retried when appropriate

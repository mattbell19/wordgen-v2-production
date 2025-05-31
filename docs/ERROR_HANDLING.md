# Error Handling System Documentation

This document provides a comprehensive overview of the error handling system implemented in the Wordgen application.

## Overview

The error handling system is designed to provide a consistent, user-friendly way to handle and display errors throughout the application. It consists of several key components:

1. **Reusable error display components**
2. **Error boundary for React component errors**
3. **API request hook with built-in error handling**
4. **Custom error types and utilities**

## Components

### ErrorDisplay Component

Located at `client/src/components/ui/error-display.tsx`, this is the core component for displaying errors in a consistent format.

#### Features:
- Multiple visual variants (default, warning, info, network, auth)
- Built-in retry functionality
- Customizable titles and descriptions
- Icon selection based on error type
- Dismiss functionality
- Consistent styling using class-variance-authority

#### Usage:

```tsx
<ErrorDisplay
  title="Something went wrong"
  description="Failed to load user data"
  error={error}
  showRetry={true}
  onRetry={handleRetry}
  variant="network"
/>
```

### Specialized Error Components

For common error scenarios, we provide pre-configured components:

#### NetworkError
For connection or API request issues.

```tsx
<NetworkError 
  onRetry={handleRetry} 
  // Additional props passed to ErrorDisplay
/>
```

#### AuthenticationError
For authentication and authorization issues.

```tsx
<AuthenticationError 
  onRetry={handleLogin} 
  // Additional props passed to ErrorDisplay
/>
```

#### ValidationError
For form validation or data validation errors.

```tsx
<ValidationError 
  error={validationError} 
  // Additional props passed to ErrorDisplay
/>
```

#### NotFoundError
For resources not found.

```tsx
<NotFoundError 
  resource="article" 
  // Additional props passed to ErrorDisplay
/>
```

### ErrorBoundary Component

Located at `client/src/components/error-boundary.tsx`, this component uses React's error boundary feature to catch JavaScript errors in components.

#### Features:
- Catches errors thrown during rendering
- Provides a fallback UI
- Supports reset functionality
- Can notify error reporting services
- Tracks error state and allows recovery

#### Usage:

```tsx
<ErrorBoundary 
  onError={(error, errorInfo) => logErrorToService(error, errorInfo)}
  fallback={<CustomErrorComponent />}
>
  <YourComponent />
</ErrorBoundary>
```

#### Higher-Order Component Usage:

```tsx
const ProtectedComponent = withErrorBoundary(YourComponent, {
  onError: logErrorToService,
});
```

#### Hook Usage:

```tsx
function SomeComponent() {
  const throwError = useErrorBoundary();
  
  const handleDangerousOperation = () => {
    try {
      // risky operation
    } catch (error) {
      throwError(error);
    }
  };
  
  // Component code
}
```

## API Error Handling

### useApi Hook

Located at `client/src/hooks/use-api.ts`, this hook provides a consistent way to make API requests with built-in error handling.

#### Features:
- Consistent error format
- Automatic retry with exponential backoff
- Loading state tracking
- Toast notifications for errors
- TypeScript generics for type safety

#### Usage:

```tsx
// Basic usage
const { data, error, isLoading } = useApi<UserData>('/api/user');

// With options
const { data, error, isLoading, fetchData } = useApi<ArticleData>('/api/articles', {
  maxRetries: 3,
  retryDelay: 1000,
  showErrorToast: true,
});

// Manual request
const createArticle = () => {
  fetchData('/api/articles', {
    method: 'POST',
    body: { title, content },
    successMessage: 'Article created successfully',
  });
};
```

## Error Handling Flow

1. **API Request Error**:
   - `useApi` hook catches the error
   - Error is formatted and stored in state
   - Toast notification is shown if enabled
   - Automatic retry is attempted if configured
   - Component can display error using `ErrorDisplay`

2. **Component Render Error**:
   - `ErrorBoundary` catches the error
   - Error is logged to console and optional service
   - Fallback UI is displayed
   - User can retry or reset the component

3. **Form Validation Error**:
   - Validation errors are captured by form libraries
   - Displayed inline or using `ValidationError` component
   - Clear error messages guide user to fix issues

## Best Practices

1. **Always wrap route components with ErrorBoundary**:
   ```tsx
   export default function SomePage() {
     return (
       <ErrorBoundary>
         <PageContent />
       </ErrorBoundary>
     );
   }
   ```

2. **Use specialized error components for specific error types**:
   ```tsx
   {apiError && (
     <NetworkError 
       onRetry={refetchData} 
     />
   )}
   ```

3. **Provide helpful error messages**:
   - Be specific about what went wrong
   - Suggest possible solutions
   - Provide retry or alternative actions

4. **Configure retry strategies appropriately**:
   - Use fewer retries for user-initiated actions
   - Use more retries for background operations
   - Set appropriate delays to prevent API overload

5. **Log errors to monitoring service in production**:
   ```tsx
   <ErrorBoundary
     onError={(error, info) => {
       if (process.env.NODE_ENV === 'production') {
         logErrorToService(error, info);
       }
     }}
   >
     {children}
   </ErrorBoundary>
   ```

## Integration with Authentication

The error handling system is tightly integrated with the authentication flow:

1. Authentication errors are caught by the `useApi` hook
2. Unauthorized errors redirect to the login page
3. Session expiration is detected and handled gracefully
4. Auth state is cleared on authentication errors

## Conclusion

This error handling system provides a robust, user-friendly way to handle errors throughout the application. By using these components and patterns consistently, we ensure that users receive helpful feedback when errors occur and can recover gracefully from most issues. 
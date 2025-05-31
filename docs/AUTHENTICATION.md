# Authentication System Documentation

This document provides an overview of the authentication system implemented in the Wordgen application, highlighting the recent improvements made to fix issues and enhance reliability.

## Overview

The authentication system is based on session cookies and provides user registration, login, and session management. The system consists of both server-side components and client-side hooks to manage authentication state.

## Server-Side Components

### Session Management

- Sessions are managed using Express sessions with PostgreSQL storage
- Session IDs are stored in secure, HttpOnly cookies
- Sessions have configurable expiration (default: 30 days)
- CSRF protection is implemented for all authenticated routes

### Authentication Routes

Located in `server/routes/auth.ts`, the main authentication endpoints are:

- **POST /api/register**: Creates a new user account
- **POST /api/login**: Authenticates a user and creates a session
- **GET /api/user**: Returns the currently authenticated user
- **POST /api/logout**: Destroys the current session
- **POST /api/password/reset**: Initiates password reset process

### Response Format

All authentication endpoints return a consistent response format:

```typescript
interface AuthResponse {
  ok: boolean;
  message: string;
  user?: User;  // Only included for successful auth requests
}
```

## Client-Side Components

### Authentication Hooks

#### useAuth Hook

Located at `client/src/hooks/use-auth.ts`, this is the primary hook for managing authentication state and actions.

```typescript
const { 
  user,              // Current user or null if not authenticated
  isLoading,         // Loading state for auth queries
  isAuthenticated,   // Boolean indicating if user is authenticated
  login,             // Function to log in
  register,          // Function to register a new account
  logout             // Function to log out
} = useAuth();
```

Key improvements:
- Consistent query key usage (`['user']`)
- Preventing unnecessary redirects
- Improved error handling
- Better React Query cache management

#### useUser Hook

Located at `client/src/hooks/use-user.ts`, this hook is used to access the current user throughout the application.

```typescript
const {
  user,              // Current user or null
  isLoading,         // Loading state
  isAuthenticated    // Boolean indicating if user is authenticated
} = useUser();
```

Key improvements:
- Updated to use the same query key as useAuth (`['user']`)
- Standardized response handling
- Better type definitions

## Authentication Flow

### Registration Process

1. User submits registration form with email and password
2. Client sends POST request to `/api/register`
3. Server validates input, checks for existing users
4. If valid, server creates new user with hashed password
5. Server creates session and returns user data
6. Client updates query cache with user data
7. User is redirected to dashboard

Recent fixes:
- Ensured session regeneration after registration
- Fixed cache management to prevent unnecessary refetches
- Added better error handling in registration mutations

### Login Process

1. User submits login form with email and password
2. Client sends POST request to `/api/login`
3. Server validates credentials
4. If valid, server creates session and returns user data
5. Client updates query cache with user data
6. User is redirected to dashboard

Recent fixes:
- Improved error handling for failed login attempts
- Better UX with toast notifications for login errors
- Fixed redirect issues after successful login

### Session Validation

1. On app initialization, client queries `/api/user`
2. If user has valid session, server returns user data
3. Client stores user data in React Query cache
4. Authentication state is available throughout the app

Recent fixes:
- Prevented unnecessary redirects to login page
- Disabled window focus refetching that was causing race conditions
- Improved handling of authentication status changes

### Logout Process

1. User clicks logout button
2. Client sends POST request to `/api/logout`
3. Server destroys session
4. Client clears query cache
5. User is redirected to login page

## Authentication State in Components

### Protected Routes

```tsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }
  
  return children;
}
```

### User Profile Components

```tsx
function UserProfile() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div>
      <h1>Welcome, {user?.name || user?.email}</h1>
      {/* Profile content */}
    </div>
  );
}
```

## Error Handling

The authentication system includes robust error handling:

- Validation errors with clear messages
- Toast notifications for auth failures
- Automatic redirection on session expiration
- Consistent error formats across all auth operations

## Recent Improvements

1. **Unified Query Keys**
   - All authentication hooks now use the same query key (`['user']`)
   - Prevents cache inconsistencies and race conditions

2. **Preventing Redirect Loops**
   - Added path checking to prevent unnecessary redirects
   - Special handling for the authentication page to avoid loops

3. **Reduced Unnecessary Refetching**
   - Disabled automatic refetching that was causing issues
   - Implemented more intelligent cache management

4. **Enhanced Error Handling**
   - Added specific error types for authentication errors
   - Better user feedback for auth failures
   - Integration with the app's error handling system

5. **Response Format Standardization**
   - Ensured consistent response format between server and client
   - Fixed mismatch in expected response structure

## Security Considerations

- Passwords are hashed using bcrypt with appropriate salt rounds
- Session tokens are secure and HttpOnly
- CSRF protection is implemented for all authenticated routes
- Proper validation is performed on all user inputs
- Rate limiting is applied to authentication endpoints

## Best Practices

1. **Always use the authentication hooks**
   ```tsx
   // Good
   const { user } = useAuth();
   
   // Avoid direct API calls
   // Bad
   const fetchUser = async () => {
     const res = await fetch('/api/user');
     // ...
   };
   ```

2. **Handle loading states**
   ```tsx
   const { user, isLoading } = useAuth();
   
   if (isLoading) {
     return <LoadingSpinner />;
   }
   ```

3. **Use error boundaries for authentication components**
   ```tsx
   <ErrorBoundary>
     <AuthForm />
   </ErrorBoundary>
   ```

4. **Provide helpful error messages**
   ```tsx
   <form onSubmit={handleSubmit}>
     {formError && (
       <AuthenticationError 
         description={formError}
       />
     )}
     {/* Form fields */}
   </form>
   ```

## Troubleshooting

### Common Issues

1. **Session Expiration**
   - Check session cookie expiration settings
   - Verify session store is properly configured

2. **CORS Issues**
   - Ensure credentials are included in requests
   - Verify CORS config allows credentials

3. **Cache Inconsistencies**
   - Use the same query keys across the application
   - Make sure cache invalidation happens at appropriate times

4. **Redirect Loops**
   - Check path conditions in redirect logic
   - Ensure proper authentication state management 
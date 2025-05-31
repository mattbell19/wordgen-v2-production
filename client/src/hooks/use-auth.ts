import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { useState } from 'react';

// Function to get API URL with the correct port
function getApiUrl(endpoint: string): string {
  // In development, use the proxy configured in vite.config.ts
  return endpoint;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  company?: string;
  website?: string;
  timezone?: string;
  emailNotifications?: boolean;
  isAdmin: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginDate?: string;
  activeTeamId?: number | null;
}

interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  data?: User;
  error?: string;
}

// Constants for query keys to ensure consistency
export const AUTH_QUERY_KEYS = {
  user: ['auth', 'user'] as const,
};

/**
 * Handles authentication requests with better error handling
 */
async function handleAuthRequest(url: string, data?: LoginCredentials): Promise<AuthResponse> {
  try {
    // Add a timestamp to prevent caching
    const timestampedUrl = url.includes('?')
      ? `${url}&_t=${Date.now()}`
      : `${url}?_t=${Date.now()}`;

    console.log(`[Auth] Making request to ${timestampedUrl}`);

    const response = await fetch(timestampedUrl, {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': data ? 'application/json' : 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });

    console.log(`[Auth] Response status: ${response.status}`);

    // Always try to parse JSON response even if status is not OK
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      console.error('[Auth] Failed to parse JSON response:', e);
      throw {
        status: response.status,
        message: 'Invalid server response',
        error: 'INVALID_RESPONSE',
      };
    }

    // If not OK, throw a standardized error with our error format
    if (!response.ok) {
      console.warn('[Auth] Request failed:', {
        status: response.status,
        message: responseData.message,
        error: responseData.error
      });

      throw {
        status: response.status,
        message: responseData.message || 'Authentication failed',
        error: responseData.error || 'UNKNOWN_ERROR',
      };
    }

    // Map from the new API response format to our internal format
    const result: AuthResponse = {
      success: responseData.success,
      message: responseData.message || '',
    };

    // Handle both old format (user property) and new format (data property)
    if (responseData.user) {
      result.user = responseData.user;
    } else if (responseData.data) {
      result.user = responseData.data;
    }

    return result;
  } catch (error: any) {
    // Handle both network errors and application errors
    if (error.status) {
      // This is our formatted error from above
      throw error;
    } else if (error instanceof Error) {
      // Network or parsing error
      throw {
        status: 0,
        message: error.message,
        error: 'NETWORK_ERROR',
      };
    }
    // Fallback for any other error type
    throw {
      status: 0,
      message: 'Network error occurred',
      error: 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Improved authentication hook with consistent error handling and query key usage
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Set default to fetch user data automatically
  const [autoFetch] = useState(true);

  // Fetch user data
  const handleAuthRequest = async (url: string, credentials?: any) => {
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const requestUrl = `${url}?_t=${timestamp}`;

    console.log('[Auth] Making request to', requestUrl);

    try {
      const response = await fetch(requestUrl, {
        method: credentials ? 'POST' : 'GET',
        headers: {
          ...(credentials && { 'Content-Type': 'application/json' }),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        ...(credentials && { body: JSON.stringify(credentials) }),
        credentials: 'include'
      });

      console.log('[Auth] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      try {
        const data = await response.json();
        return data;
      } catch (error) {
        console.log('[Auth] Failed to parse JSON response:', error);
        throw new Error('Invalid server response');
      }
    } catch (error) {
      console.error('[Auth] Request error:', error);
      throw error;
    }
  };

  // Query for authenticated user
  const { data: user, error, isLoading, refetch } = useQuery({
    queryKey: ['user'],
    queryFn: () => handleAuthRequest('/api/user'),
    retry: false,
    enabled: autoFetch,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Login mutation with improved success/error handling
  const login = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await handleAuthRequest('/api/login', credentials);

      if (!response.success || (!response.data && !response.user)) {
        throw {
          status: 400,
          message: response.message || 'Login failed',
          error: response.error || 'LOGIN_FAILED',
        };
      }

      // Touch the session immediately after login to ensure it's active
      await fetch('/api/user', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // Invalidate all queries to fetch fresh data
      await queryClient.invalidateQueries({ queryKey: ['user'] });

      // Wait for query cache to update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update auth state
      queryClient.setQueryData(AUTH_QUERY_KEYS.user, response.user);

      // Show success toast
      toast({
        title: "Success",
        description: response.message || "Login successful",
      });

      // After a short delay, restore default query settings and redirect
      setTimeout(() => {
        // Restore default settings
        queryClient.setQueryDefaults(AUTH_QUERY_KEYS.user, {
          staleTime: 300000,
        });

        // Redirect to dashboard
        window.location.href = '/dashboard';
      }, 100);

      return response;
    },
    onError: (error: any) => {
      // Clear user data on login error
      queryClient.setQueryData(AUTH_QUERY_KEYS.user, null);

      // Show error toast
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Login failed. Please try again.",
      });
    },
  });

  // Register mutation with improved success/error handling
  const register = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await handleAuthRequest('/api/register', credentials);

      if (!response.success || (!response.data && !response.user)) {
        throw {
          status: 400,
          message: response.message || 'Registration failed',
          error: response.error || 'REGISTRATION_FAILED',
        };
      }

      // Touch the session immediately after registration to ensure it's active
      await fetch('/api/user', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // Invalidate all queries to fetch fresh data
      await queryClient.invalidateQueries({ queryKey: ['user'] });

      // Wait for query cache to update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update auth state
      queryClient.setQueryData(AUTH_QUERY_KEYS.user, response.user);

      // Show success toast
      toast({
        title: "Success",
        description: response.message || "Registration successful",
      });

      // After a short delay, restore default query settings and redirect
      setTimeout(() => {
        // Restore default settings
        queryClient.setQueryDefaults(AUTH_QUERY_KEYS.user, {
          staleTime: 300000,
        });

        // Redirect to dashboard
        window.location.href = '/dashboard';
      }, 100);

      return response;
    },
    onError: (error: any) => {
      // Clear user data on registration error
      queryClient.setQueryData(AUTH_QUERY_KEYS.user, null);

      // Show error toast
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Registration failed. Please try again.",
      });
    },
  });

  // Logout mutation with improved success/error handling
  const logout = useMutation({
    mutationFn: async () => {
      const response = await handleAuthRequest('/api/logout');

      // Clear user data and auth state
      queryClient.setQueryData(AUTH_QUERY_KEYS.user, null);

      // Show success toast
      toast({
        title: "Success",
        description: response.message || "Logout successful",
      });

      // Redirect to login
      window.location.href = '/auth';

      return response;
    },
    onError: (error: any) => {
      // Even on errors, try to clear user data to prevent issues
      queryClient.setQueryData(AUTH_QUERY_KEYS.user, null);

      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Logout failed. Please try again.",
      });

      // Redirect to login
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);
    },
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login: login.mutateAsync,
    register: register.mutateAsync,
    logout: logout.mutateAsync,
    loginStatus: login.status,
    registerStatus: register.status,
    logoutStatus: logout.status,
    refetchUser: refetch,
  };
}

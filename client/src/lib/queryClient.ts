import { QueryClient } from "@tanstack/react-query";
import { showErrorToast } from "@/components/ui/toast-provider";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const [endpoint] = queryKey;
        const url = typeof endpoint === 'string' ? endpoint : '/';

        try {
          const res = await fetch(url, {
            credentials: "include",
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          });

          if (!res.ok) {
            // Handle authentication errors specifically
            if (res.status === 401) {
              // Clear all queries on auth error
              queryClient.clear();
              // Redirect to login if not already there
              if (!window.location.pathname.includes('/auth')) {
                window.location.href = '/auth';
              }
              return null;
            }

            const text = await res.text();
            throw new Error(text || `${res.status}: ${res.statusText}`);
          }

          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Expected JSON response but got ${contentType}`);
          }

          const data = await res.json();
          return Array.isArray(data) ? [...data] : { ...data };
        } catch (error) {
          console.error('Query error:', error);

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
      },
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.message?.includes('401') || error?.message?.includes('Not authenticated')) {
          return false;
        }
        return failureCount < 2;
      },
      refetchInterval: false,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 60000, // Consider data fresh for 1 minute
      cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
      suspense: false,
      networkMode: 'always',
      structuralSharing: true
    },
    mutations: {
      retry: false,
      networkMode: 'always',
      onError: (error: any) => {
        console.error('Mutation error:', error);

        // Show toast notification for the error
        if (error instanceof Error) {
          showErrorToast(
            'Operation Failed',
            error.message || 'An unexpected error occurred'
          );
        } else {
          showErrorToast('Operation Failed', 'An unexpected error occurred');
        }
      }
    }
  },
});
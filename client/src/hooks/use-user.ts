import { useQuery } from "@tanstack/react-query";
import { AUTH_QUERY_KEYS, type User } from "./use-auth";

interface ApiResponse {
  success: boolean;
  message: string;
  data?: User;
  user?: User;
  error?: string;
}

interface UseUserResponse {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: unknown;
  refetch: () => Promise<User | null>;
}

/**
 * Hook to get the current user
 * Uses the same query key as useAuth for consistency
 */
export function useUser(): UseUserResponse {
  const { data, isLoading, error, refetch } = useQuery<User>({
    queryKey: AUTH_QUERY_KEYS.user,
    queryFn: async () => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include",
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
          },
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            // Don't trigger page navigation here, let the component handle it
            throw new Error("Session expired or not authenticated");
          }
          throw new Error("Failed to fetch user");
        }
        
        const data: ApiResponse = await response.json();
        
        if (!data.success) {
          throw new Error("User data not available");
        }
        
        // Handle both old and new API formats
        const userData = data.data || data.user;
        
        if (!userData) {
          throw new Error("User data not available");
        }
        
        return userData;
      } catch (error) {
        console.error("Error fetching user:", error);
        throw error;
      }
    },
    staleTime: 300000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Create a refetch wrapper that returns the user data
  const refetchUser = async (): Promise<User | null> => {
    try {
      const result = await refetch();
      return result.data || null;
    } catch (error) {
      console.error("Error refetching user:", error);
      return null;
    }
  };

  return {
    user: data || null,
    isLoading,
    isAuthenticated: !!data,
    error,
    refetch: refetchUser,
  };
} 
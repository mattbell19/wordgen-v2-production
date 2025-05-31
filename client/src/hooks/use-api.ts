import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { 
  fetchJSON, 
  postJSON, 
  putJSON, 
  deleteJSON, 
  getJSON, 
  type FetchWithRetryOptions 
} from '@/lib/api-utils';

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  retryOptions?: Omit<FetchWithRetryOptions, 'headers' | 'body' | 'method'>;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Custom hook for making API calls with loading, error, and toast states
 */
export function useApi<T = any>(defaultOptions: UseApiOptions = {}) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const { toast } = useToast();

  /**
   * Generic request handler with shared logic
   */
  const request = useCallback(
    async <R = T>(
      method: ApiMethod,
      url: string,
      body?: any,
      options: UseApiOptions = {}
    ): Promise<R> => {
      const finalOptions = { ...defaultOptions, ...options };
      const {
        showSuccessToast = false,
        showErrorToast = true,
        successMessage = 'Operation completed successfully',
        errorMessage = 'An error occurred',
        retryOptions = {},
      } = finalOptions;

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        let response: R;
        
        // Use the appropriate method based on the request type
        switch (method) {
          case 'GET':
            response = await getJSON<R>(url, body || {}, retryOptions);
            break;
          case 'POST':
            response = await postJSON<R>(url, body || {}, retryOptions);
            break;
          case 'PUT':
            response = await putJSON<R>(url, body || {}, retryOptions);
            break;
          case 'DELETE':
            response = await deleteJSON<R>(url, retryOptions);
            break;
          default:
            throw new Error(`Invalid method: ${method}`);
        }

        setState({
          data: response as unknown as T,
          loading: false,
          error: null,
        });

        if (showSuccessToast) {
          toast({
            title: 'Success',
            description: successMessage,
          });
        }

        return response;
      } catch (error) {
        console.error(`${method} ${url} error:`, error);
        
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        setState({
          data: null,
          loading: false,
          error: errorObj,
        });

        if (showErrorToast) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: errorObj.message || errorMessage,
          });
        }

        throw errorObj;
      }
    },
    [defaultOptions, toast]
  );

  /**
   * GET request with optional query params
   */
  const get = useCallback(
    <R = T>(
      url: string,
      params?: Record<string, string | number | boolean | undefined>,
      options?: UseApiOptions
    ) => {
      return request<R>('GET', url, params, options);
    },
    [request]
  );

  /**
   * POST request with optional body
   */
  const post = useCallback(
    <R = T>(url: string, body?: any, options?: UseApiOptions) => {
      return request<R>('POST', url, body, options);
    },
    [request]
  );

  /**
   * PUT request with optional body
   */
  const put = useCallback(
    <R = T>(url: string, body?: any, options?: UseApiOptions) => {
      return request<R>('PUT', url, body, options);
    },
    [request]
  );

  /**
   * DELETE request
   */
  const del = useCallback(
    <R = T>(url: string, options?: UseApiOptions) => {
      return request<R>('DELETE', url, undefined, options);
    },
    [request]
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    get,
    post,
    put,
    delete: del, // renamed to avoid conflict with keyword
    reset,
    isLoading: state.loading,
    isError: !!state.error,
    isSuccess: !!state.data && !state.error,
  };
}

// Usage example:
// const { data, error, isLoading, fetchData } = useApi<UserData>('/api/user');
// 
// // POST request with body
// const createUser = () => {
//   fetchData('/api/users', {
//     method: 'POST',
//     body: { name: 'John Doe', email: 'john@example.com' },
//     successMessage: 'User created successfully',
//     showSuccessToast: true,
//   });
// };
//
// // With retry logic
// const { data, error, isLoading } = useApi<ArticleData>('/api/articles/1', {
//   maxRetries: 3,
//   retryDelay: 1000,
//   onRetry: (attempt, error) => {
//     console.log(`Retrying (${attempt}/3)...`, error);
//   },
// }); 
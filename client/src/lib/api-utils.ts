/**
 * Utility functions for API calls with built-in retries and error handling
 */

/**
 * Options for fetch with retry
 */
export interface FetchWithRetryOptions extends RequestInit {
  maxRetries?: number;
  retryDelay?: number;
  retryStatusCodes?: number[];
  exponentialBackoff?: boolean;
}

/**
 * Fetch with automatic retry for transient errors
 * @param url - The URL to fetch
 * @param options - Extended fetch options with retry configuration
 * @returns Promise with the fetch response
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryStatusCodes = [408, 429, 500, 502, 503, 504],
    exponentialBackoff = true,
    ...fetchOptions
  } = options;

  let retries = 0;
  let lastError: Error | null = null;

  while (retries <= maxRetries) {
    try {
      // Always include credentials to ensure cookies are sent
      const response = await fetch(url, {
        ...fetchOptions,
        credentials: 'include'
      });

      // If response is ok or not in the retry status codes, return it
      if (response.ok || !retryStatusCodes.includes(response.status)) {
        return response;
      }

      // If we get here, the response has a status code we should retry
      lastError = new Error(`HTTP Error ${response.status}: ${response.statusText}`);

      // Try to get more details from the response body
      try {
        const errorData = await response.json();
        if (errorData.message) {
          lastError.message = errorData.message;
        }
      } catch (e) {
        // Ignore error, we'll use the default message
      }
    } catch (error) {
      // Network error, store it and continue with retry
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    // If we've reached max retries, throw the last error
    if (retries >= maxRetries) {
      break;
    }

    // Calculate delay with exponential backoff if enabled
    const delay = exponentialBackoff
      ? retryDelay * Math.pow(2, retries)
      : retryDelay;

    // Wait before next retry
    await new Promise(resolve => setTimeout(resolve, delay));
    retries++;
  }

  // If we get here, we've exhausted all retries
  throw lastError || new Error(`Failed after ${maxRetries} retries`);
}

/**
 * Typed wrapper around fetchWithRetry with JSON parsing
 * @param url - The URL to fetch
 * @param options - Extended fetch options with retry configuration
 * @returns Promise with the parsed JSON data
 */
export async function fetchJSON<T = any>(
  url: string,
  options: FetchWithRetryOptions & { showErrorToast?: boolean } = {}
): Promise<T> {
  const { showErrorToast = true, ...fetchOptions } = options;

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(fetchOptions.headers || {})
      },
      ...fetchOptions
    });

    // Check for non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`Expected JSON response but got ${contentType}`);
      const error = new Error(`Expected JSON response but got ${contentType}`);
      (error as any).status = response.status;
      (error as any).contentType = contentType;
      throw error;
    }

    // Parse JSON response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      const jsonError = e as Error;
      console.error('Failed to parse JSON response:', jsonError);
      const error = new Error(`Failed to parse JSON response: ${jsonError.message || 'Unknown error'}`);
      (error as any).status = response.status;
      (error as any).originalError = jsonError;
      throw error;
    }

    // Handle API error responses
    if (!response.ok) {
      const error = new Error(data.message || `API Error: ${response.status}`);
      (error as any).status = response.status;
      (error as any).errorCode = data.error;
      (error as any).details = data.details;
      throw error;
    }

    // For standardized API responses, return the data property
    return data.data !== undefined ? data.data : data;
  } catch (error) {
    console.error('API request failed:', error);

    // We don't show toast here because it would require importing the toast provider
    // which would create a circular dependency. Instead, the components using this
    // function should handle errors and show toasts as needed.

    throw error;
  }
}

/**
 * Typed POST request with JSON body
 * @param url - The URL to post to
 * @param body - The body to send (will be JSON.stringified)
 * @param options - Extended fetch options with retry configuration
 * @returns Promise with the parsed JSON response
 */
export async function postJSON<T = any, B = any>(
  url: string,
  body: B,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  return fetchJSON<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options
  });
}

/**
 * Typed PUT request with JSON body
 * @param url - The URL to put to
 * @param body - The body to send (will be JSON.stringified)
 * @param options - Extended fetch options with retry configuration
 * @returns Promise with the parsed JSON response
 */
export async function putJSON<T = any, B = any>(
  url: string,
  body: B,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  return fetchJSON<T>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
    ...options
  });
}

/**
 * Typed DELETE request
 * @param url - The URL to delete
 * @param options - Extended fetch options with retry configuration
 * @returns Promise with the parsed JSON response
 */
export async function deleteJSON<T = any>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  return fetchJSON<T>(url, {
    method: 'DELETE',
    ...options
  });
}

/**
 * Typed GET request with optional query parameters
 * @param url - The base URL
 * @param params - Query parameters as an object
 * @param options - Extended fetch options with retry configuration
 * @returns Promise with the parsed JSON response
 */
export async function getJSON<T = any>(
  url: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: FetchWithRetryOptions = {}
): Promise<T> {
  // Build URL with query parameters
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      queryParams.append(key, String(value));
    }
  }

  const queryString = queryParams.toString();
  const fullUrl = queryString ? `${url}?${queryString}` : url;

  return fetchJSON<T>(fullUrl, {
    method: 'GET',
    ...options
  });
}
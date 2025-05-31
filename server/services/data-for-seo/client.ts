/**
 * DataForSEO API Client
 *
 * This client provides a TypeScript interface to the DataForSEO API, specifically for
 * the OnPage API that enables comprehensive SEO audit functionality. It handles:
 *
 * - Authentication with DataForSEO API using Basic Auth
 * - Proper request formatting and response parsing
 * - Error handling with appropriate error messages
 * - Rate limiting with exponential backoff and retries
 * - Timeout handling to prevent hanging requests
 *
 * All methods return typed responses based on the DataForSEO API structure.
 *
 * Setup:
 * 1. Set DATA_FOR_SEO_USERNAME and DATA_FOR_SEO_PASSWORD environment variables
 * 2. Instantiate the client: const client = new DataForSEOClient();
 * 3. Make API calls: client.postOnPageTask({ target: 'https://example.com', max_crawl_pages: 100 });
 *
 * Configuration:
 * - REQUEST_TIMEOUT: Maximum time to wait for a response (default: 30s)
 * - MAX_RETRIES: Maximum number of retry attempts on failure (default: 3)
 * - RETRY_DELAY: Base delay between retries in ms (default: 2000ms, increases with each retry)
 */

import fetch from 'node-fetch';
import { AbortController } from 'node-abort-controller';

// DataForSEO API credentials and base URL
const DFS_BASE_URL = 'https://api.dataforseo.com/v3';
// Support both naming conventions for DataForSEO credentials
const DFS_USERNAME = process.env.DATA_FOR_SEO_USERNAME || process.env.DATAFORSEO_LOGIN || '';
const DFS_PASSWORD = process.env.DATA_FOR_SEO_PASSWORD || process.env.DATAFORSEO_PASSWORD || '';

// Ensure credentials are available
if (!DFS_USERNAME || !DFS_PASSWORD) {
  console.error('DataForSEO credentials are missing or invalid. Please set DATA_FOR_SEO_USERNAME and DATA_FOR_SEO_PASSWORD or DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables.');
}

// Rate limit handling
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * The base response structure from DataForSEO
 * All API responses follow this structure regardless of the endpoint
 */
export interface DataForSEOResponse<T> {
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path: string[];
    data: Record<string, any>;
    result: T[];
  }>;
}

/**
 * Interface for error handling from DataForSEO API
 */
export interface DataForSEOError {
  status_code: number;
  status_message: string;
  time?: string;
}

/**
 * Task POST request for OnPage API
 * This defines the parameters accepted when creating a new OnPage task
 */
export interface OnPageTaskPostRequest {
  target: string;                         // URL of the website to analyze
  max_crawl_pages: number;                // Maximum number of pages to crawl
  load_resources?: boolean;               // Whether to load and analyze external resources
  enable_javascript?: boolean;            // Whether to execute JavaScript during crawl
  enable_browser_rendering?: boolean;     // Whether to fully render pages in a browser
  custom_js?: string;                     // Custom JavaScript to execute during rendering
  store_raw_html?: boolean;               // Whether to store the raw HTML of pages
  url_regex_include?: string;             // Regex pattern for URLs to include
  url_regex_exclude?: string;             // Regex pattern for URLs to exclude
  check_spell?: boolean;                  // Whether to check spelling
  checks_threshold?: Record<string, number>; // Custom thresholds for SEO checks
  crawl_delay?: number;                   // Delay between page crawls
  calculate_keyword_density?: boolean;    // Whether to calculate keyword density
  pingback_url?: string;                  // URL to notify when task is complete
}

import {
  OnPageApiResponse,
  OnPageSummaryResponse,
  OnPagePageResponse,
  OnPageResourceResponse,
  OnPageDuplicateTagResponse,
  OnPageLinkResponse,
  OnPageNonIndexableResponse,
  OnPageSecurityResponse
} from './types/api-responses';

import { dataForSEOCache } from './cache-manager';
import { logError } from './error-handler';

/**
 * Main DataForSEO client class
 * Provides methods for accessing all OnPage API functionality
 */
export class DataForSEOClient {
  private credentials: string;

  constructor() {
    // Base64 encode credentials for Basic Auth
    this.credentials = Buffer.from(`${DFS_USERNAME}:${DFS_PASSWORD}`).toString('base64');
  }

  /**
   * Make an authenticated request to the DataForSEO API
   * This is the core method used by all other methods to communicate with the API
   *
   * @param method HTTP method (GET or POST)
   * @param endpoint API endpoint path
   * @param data Optional request body data for POST requests
   * @returns Typed API response
   * @throws Error if the request fails after all retries
   */
  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any
  ): Promise<DataForSEOResponse<T>> {
    const cacheKey = `${method}:${endpoint}:${data ? JSON.stringify(data) : ''}`;

    // For POST requests, always skip cache
    if (method === 'POST') {
      return this.makeRequest<T>(method, endpoint, data);
    }

    // For GET requests, check cache first
    const cachedResponse = dataForSEOCache.get(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Make actual API request
    const response = await this.makeRequest<T>(method, endpoint, data);

    // Cache successful responses
    if (response.status_code < 400) {
      dataForSEOCache.set(cacheKey, response);
    }

    return response;
  }

  /**
   * Make the actual HTTP request to DataForSEO API
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any
  ): Promise<DataForSEOResponse<T>> {
    const url = `${DFS_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${this.credentials}`,
    };

    let retries = 0;
    let lastError: Error | null = null;

    while (retries <= MAX_RETRIES) {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        const requestOptions = {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal
        };

        const response = await fetch(url, requestOptions);

        // Clear timeout
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json() as DataForSEOError;
          throw new Error(`DataForSEO API Error: ${errorData.status_message} (${errorData.status_code})`);
        }

        const result = await response.json() as DataForSEOResponse<T>;

        // Check for API-level errors
        if (result.status_code >= 400) {
          throw new Error(`DataForSEO API Error: ${result.status_message} (${result.status_code})`);
        }

        return result;
      } catch (error) {
        // Clear the timeout in case of an error
        clearTimeout(timeoutId);

        lastError = error instanceof Error ? error : new Error(String(error));

        // Log the error
        logError(lastError, { method, endpoint, data, retries });

        // Check if we should retry
        retries++;

        if (retries <= MAX_RETRIES) {
          console.warn(`DataForSEO API request failed, retrying (${retries}/${MAX_RETRIES}): ${lastError.message}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
        }
      }
    }

    throw lastError || new Error('Unknown error occurred while making request to DataForSEO API');
  }

  /**
   * Post a new OnPage API task to start crawling a website
   *
   * @param task Task configuration parameters
   * @returns Task creation response with task ID
   */
  async postOnPageTask(task: OnPageTaskPostRequest): Promise<DataForSEOResponse<any>> {
    return this.request('POST', '/on_page/task_post', [task]);
  }

  /**
   * Get tasks that are ready to be collected
   *
   * @returns List of tasks that have completed processing
   */
  async getOnPageTasksReady(): Promise<DataForSEOResponse<any>> {
    return this.request('GET', '/on_page/tasks_ready');
  }

  /**
   * Get OnPage summary for a specific task
   * This provides the overall crawl progress and main metrics
   *
   * @param taskId ID of the task to get summary for
   * @returns Summary data with crawl progress and metrics
   */
  async getOnPageSummary(taskId: string): Promise<OnPageApiResponse<OnPageSummaryResponse>> {
    return this.request<OnPageSummaryResponse>('GET', `/on_page/summary/${taskId}`);
  }

  /**
   * Get OnPage pages data for a specific task
   * This provides detailed information about each crawled page
   *
   * @param taskId ID of the task
   * @param limit Maximum number of pages to return
   * @param offset Pagination offset
   * @returns List of pages with their SEO metrics and issues
   */
  async getOnPagePages(taskId: string, limit: number = 100, offset: number = 0): Promise<OnPageApiResponse<OnPagePageResponse>> {
    return this.request<OnPagePageResponse>('GET', `/on_page/pages/${taskId}?limit=${limit}&offset=${offset}`);
  }

  /**
   * Get OnPage resources data for a specific task
   * This provides details about the resources (JS, CSS, images, etc.)
   *
   * @param taskId ID of the task
   * @param limit Maximum number of resources to return
   * @param offset Pagination offset
   * @returns List of resources with their metrics and issues
   */
  async getOnPageResources(taskId: string, limit: number = 100, offset: number = 0): Promise<OnPageApiResponse<OnPageResourceResponse>> {
    return this.request<OnPageResourceResponse>('GET', `/on_page/resources/${taskId}?limit=${limit}&offset=${offset}`);
  }

  /**
   * Get OnPage duplicate tags for a specific task
   * This shows pages with duplicate title, description, or H1 tags
   *
   * @param taskId ID of the task
   * @param limit Maximum number of items to return
   * @param offset Pagination offset
   * @returns List of pages with duplicate tags grouped by tag type
   */
  async getOnPageDuplicateTags(taskId: string, limit: number = 100, offset: number = 0): Promise<OnPageApiResponse<OnPageDuplicateTagResponse>> {
    return this.request<OnPageDuplicateTagResponse>('GET', `/on_page/duplicate_tags/${taskId}?limit=${limit}&offset=${offset}`);
  }

  /**
   * Get OnPage duplicate content for a specific task and URL
   * This shows other pages that have similar content to the specified URL
   *
   * @param taskId ID of the task
   * @param url URL to check for duplicate content
   * @param limit Maximum number of items to return
   * @param offset Pagination offset
   * @returns List of pages with content similar to the specified URL
   */
  async getOnPageDuplicateContent(taskId: string, url: string, limit: number = 100, offset: number = 0): Promise<DataForSEOResponse<any>> {
    const encodedUrl = encodeURIComponent(url);
    return this.request('GET', `/on_page/duplicate_content/${taskId}?url=${encodedUrl}&limit=${limit}&offset=${offset}`);
  }

  /**
   * Get OnPage links for a specific task
   * This provides information about internal and external links
   *
   * @param taskId ID of the task
   * @param limit Maximum number of links to return
   * @param offset Pagination offset
   * @returns List of links with their properties
   */
  async getOnPageLinks(taskId: string, limit: number = 100, offset: number = 0): Promise<OnPageApiResponse<OnPageLinkResponse>> {
    return this.request<OnPageLinkResponse>('GET', `/on_page/links/${taskId}?limit=${limit}&offset=${offset}`);
  }

  /**
   * Get OnPage non-indexable pages for a specific task
   * This shows pages that cannot be indexed by search engines
   *
   * @param taskId ID of the task
   * @param limit Maximum number of items to return
   * @param offset Pagination offset
   * @returns List of non-indexable pages with reasons
   */
  async getOnPageNonIndexable(taskId: string, limit: number = 100, offset: number = 0): Promise<OnPageApiResponse<OnPageNonIndexableResponse>> {
    return this.request<OnPageNonIndexableResponse>('GET', `/on_page/non_indexable/${taskId}?limit=${limit}&offset=${offset}`);
  }

  /**
   * Get OnPage raw HTML for a specific task and URL
   * This returns the stored raw HTML content for the specified URL
   *
   * @param taskId ID of the task
   * @param url URL to get HTML for
   * @returns Raw HTML content
   */
  async getOnPageRawHtml(taskId: string, url: string): Promise<DataForSEOResponse<any>> {
    const encodedUrl = encodeURIComponent(url);
    return this.request('GET', `/on_page/raw_html/${taskId}?url=${encodedUrl}`);
  }

  /**
   * Get OnPage security information for a specific task
   * This provides security-related metrics and issues
   *
   * @param taskId ID of the task
   * @returns Security information including SSL, headers, and vulnerabilities
   */
  async getOnPageSecurity(taskId: string): Promise<OnPageApiResponse<OnPageSecurityResponse>> {
    return this.request<OnPageSecurityResponse>('GET', `/on_page/security/${taskId}`);
  }

  /**
   * Force stop an ongoing OnPage task
   *
   * @param taskId ID of the task to stop
   * @returns Status of the stop operation
   */
  async forceStopOnPageTask(taskId: string): Promise<DataForSEOResponse<any>> {
    return this.request('POST', '/on_page/task_force_stop', [{ id: taskId }]);
  }

  /**
   * Get instant page data (Live mode)
   * This performs a quick analysis of a single page without creating a full task
   *
   * @param url URL to analyze
   * @param options Optional configuration options
   * @returns Instant analysis results
   */
  async getInstantOnPageData(url: string, options: Record<string, any> = {}): Promise<DataForSEOResponse<any>> {
    const data = [{
      url,
      ...options
    }];
    return this.request('POST', '/on_page/instant_pages', data);
  }
}
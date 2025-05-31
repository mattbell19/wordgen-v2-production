/**
 * SEO Audit Error Handler
 * 
 * This module provides consistent error handling for the SEO audit system.
 * It includes:
 * - Custom error classes for different types of errors
 * - Error logging functions
 * - Default fallback values for different data types
 */

// Custom error types
export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export class TaskNotFoundError extends Error {
  taskId: string;
  
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
    this.taskId = taskId;
  }
}

export class InvalidTaskStateError extends Error {
  taskId: string;
  status: string;
  
  constructor(taskId: string, status: string) {
    super(`Task is in invalid state: ${status}`);
    this.name = 'InvalidTaskStateError';
    this.taskId = taskId;
    this.status = status;
  }
}

export class DataProcessingError extends Error {
  dataType: string;
  
  constructor(message: string, dataType: string) {
    super(`Error processing ${dataType} data: ${message}`);
    this.name = 'DataProcessingError';
    this.dataType = dataType;
  }
}

// Default fallback values
export const fallbacks = {
  emptyArray: [],
  emptyObject: {},
  emptyString: '',
  zero: 0,
  defaultSummary: {
    onPageScore: 0,
    pagesAnalyzed: 0,
    totalIssues: 0,
    issuesBySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    },
    pageSpeed: {
      average: 0,
      min: 0,
      max: 0,
      distribution: { fast: 0, moderate: 0, slow: 0 }
    },
    resourceStats: {
      total: 0,
      broken: 0,
      slow: 0,
      byType: { scripts: 0, styles: 0, images: 0, fonts: 0, other: 0 },
      totalSize: 0,
      averageSize: 0
    },
    linkStats: {
      total: 0,
      internal: 0,
      external: 0,
      broken: 0,
      nofollow: 0,
      sponsored: 0,
      ugc: 0
    },
    mobileScore: 0,
    securityScore: 0
  },
  defaultWebsiteInfo: {
    domain: '',
    protocol: 'https',
    ip: '',
    cms: '',
    server: '',
    technologies: []
  }
};

// Error logging functions
export function logError(error: Error, context?: Record<string, any>): void {
  console.error({
    timestamp: new Date().toISOString(),
    errorType: error.name,
    message: error.message,
    stack: error.stack,
    ...context
  });
}

// Safe data getter with fallbacks
export function safeGet<T>(fn: () => T, fallback: T): T {
  try {
    const result = fn();
    return result !== undefined && result !== null ? result : fallback;
  } catch (error) {
    return fallback;
  }
}

// Safe array iteration with error handling
export function safeForEach<T>(arr: T[] | null | undefined, callback: (item: T, index: number) => void): void {
  if (!arr || !Array.isArray(arr)) return;
  
  arr.forEach((item, index) => {
    try {
      callback(item, index);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { item, index });
    }
  });
}

// Safe property access with type checking
export function safeAccess<T, K extends keyof T>(obj: T | null | undefined, key: K, fallback: T[K]): T[K] {
  if (obj == null) return fallback;
  return obj[key] !== undefined && obj[key] !== null ? obj[key] : fallback;
}

// Retry function with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let retries = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      
      if (retries > maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const backoffTime = delay * Math.pow(2, retries - 1) * (1 + Math.random() * 0.1);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
} 
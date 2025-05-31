import { DataForSEOClient, OnPageTaskPostRequest } from './client';

/**
 * Status of a SEO audit task
 */
export enum SeoAuditStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * SEO audit task details
 */
export interface SeoAuditTask {
  id: string;
  taskId?: string;
  target: string;
  status: SeoAuditStatus;
  progress?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  userId: number;
  maxCrawlPages: number;
  options?: Record<string, any>;
}

/**
 * SEO audit summary report
 */
export interface SeoAuditSummary {
  onPageScore?: number;
  crawlProgress?: number;
  pagesCount?: number;
  pagesCrawled?: number;
  issuesSummary?: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
    noIssue?: number;
  };
  topIssues?: Array<{
    title: string;
    severity: string;
    count: number;
    description?: string;
  }>;
  pageSpeedAverage?: number;
  totalChecks?: number;
  failedChecks?: number;
  totalResources?: number;
  brokenResources?: number;
  totalLinks?: number;
  brokenLinks?: number;
  nonIndexablePages?: number;
  duplicateContent?: number;
  duplicateTags?: number;
}

/**
 * SEO audit options interface
 */
export interface SeoAuditOptions {
  max_crawl_pages?: number;
  load_resources?: boolean;
  enable_javascript?: boolean;
  enable_browser_rendering?: boolean;
  store_raw_html?: boolean;
  [key: string]: any;
}

/**
 * SEO audit service for website performance analysis
 */
export class SeoAuditService {
  private client: DataForSEOClient;

  constructor() {
    this.client = new DataForSEOClient();
  }

  /**
   * Create a new SEO audit task
   */
  async createAuditTask(target: string, userId: number, options: SeoAuditOptions = {}): Promise<SeoAuditTask> {
    try {
      // Construct the task payload
      const auditRequest: OnPageTaskPostRequest = {
        target,
        max_crawl_pages: options.max_crawl_pages ?? 100,
        load_resources: options.load_resources ?? true,
        enable_javascript: options.enable_javascript ?? true,
        enable_browser_rendering: options.enable_browser_rendering ?? true,
        store_raw_html: options.store_raw_html ?? false,
        ...options
      };

      // Post task to DataForSEO
      const response = await this.client.postOnPageTask(auditRequest);

      // Check for successful task creation
      if (response.tasks?.[0]?.status_code !== 20000) {
        throw new Error(`Failed to create audit task: ${response.tasks?.[0]?.status_message || 'Unknown error'}`);
      }

      // Create a new task record
      const task: SeoAuditTask = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        taskId: response.tasks[0].id,
        target,
        status: SeoAuditStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId,
        maxCrawlPages: auditRequest.max_crawl_pages,
        options: {
          loadResources: auditRequest.load_resources,
          enableJavaScript: auditRequest.enable_javascript,
          enableBrowserRendering: auditRequest.enable_browser_rendering
        }
      };

      // In a production implementation, you would save this task to a database
      console.log('Created SEO audit task:', task);

      return task;
    } catch (error) {
      console.error('Error creating SEO audit task:', error);
      throw error;
    }
  }

  /**
   * Get the status and summary of an SEO audit task
   */
  async getAuditStatus(taskId) {
    try {
      const response = await this.client.getOnPageSummary(taskId);

      if (response.tasks?.[0]?.status_code !== 20000) {
        return {
          status: SeoAuditStatus.FAILED,
          progress: 0
        };
      }

      const result = response.tasks[0].result[0];
      const crawlProgress = result.crawl_progress || 0;

      // Determine status based on crawl progress
      let status;
      if (crawlProgress === 0) {
        status = SeoAuditStatus.PENDING;
      } else if (crawlProgress < 100) {
        status = SeoAuditStatus.IN_PROGRESS;
      } else {
        status = SeoAuditStatus.COMPLETED;
      }

      // Build the summary
      const summary = {
        onPageScore: result.onpage_score,
        crawlProgress: crawlProgress,
        pagesCount: result.total_pages || 0,
        pagesCrawled: result.pages_crawled || 0,
        issuesSummary: {
          critical: this.getSeverityCount(result, 'critical'),
          high: this.getSeverityCount(result, 'high'),
          medium: this.getSeverityCount(result, 'medium'),
          low: this.getSeverityCount(result, 'low'),
          noIssue: this.getSeverityCount(result, 'info')
        },
        topIssues: this.getTopIssues(result),
        pageSpeedAverage: result.page_speed?.average_page_load_time || 0,
        totalChecks: result.checks?.total || 0,
        failedChecks: result.checks?.failed || 0,
        totalLinks: result.links?.total || 0,
        brokenLinks: result.links?.broken || 0,
        totalResources: result.resources?.total || 0,
        brokenResources: result.resources?.broken || 0,
        nonIndexablePages: result.non_indexable?.total || 0,
        duplicateContent: result.duplicate_content?.total || 0,
        duplicateTags: result.duplicate_tags?.total || 0
      };

      return {
        status,
        progress: crawlProgress,
        summary
      };
    } catch (error) {
      console.error('Error getting SEO audit status:', error);
      return {
        status: SeoAuditStatus.FAILED,
        progress: 0
      };
    }
  }

  /**
   * Get detailed list of pages with their SEO issues
   */
  async getAuditPages(taskId, limit = 100, offset = 0) {
    try {
      const response = await this.client.getOnPagePages(taskId, limit, offset);
      return response.tasks[0].result;
    } catch (error) {
      console.error('Error getting SEO audit pages:', error);
      throw error;
    }
  }

  /**
   * Get detailed list of resources (js, css, images) with issues
   */
  async getAuditResources(taskId, limit = 100, offset = 0) {
    try {
      const response = await this.client.getOnPageResources(taskId, limit, offset);
      return response.tasks[0].result;
    } catch (error) {
      console.error('Error getting SEO audit resources:', error);
      throw error;
    }
  }

  /**
   * Get pages with duplicate title or description tags
   */
  async getAuditDuplicateTags(taskId, limit = 100, offset = 0) {
    try {
      const response = await this.client.getOnPageDuplicateTags(taskId, limit, offset);
      return response.tasks[0].result;
    } catch (error) {
      console.error('Error getting SEO audit duplicate tags:', error);
      throw error;
    }
  }

  /**
   * Get internal and external links from the website
   */
  async getAuditLinks(taskId, limit = 100, offset = 0) {
    try {
      const response = await this.client.getOnPageLinks(taskId, limit, offset);
      return response.tasks[0].result;
    } catch (error) {
      console.error('Error getting SEO audit links:', error);
      throw error;
    }
  }

  /**
   * Cancel an ongoing SEO audit task
   */
  async cancelAuditTask(taskId) {
    try {
      const response = await this.client.forceStopOnPageTask(taskId);
      return response.tasks[0].status_code === 20000;
    } catch (error) {
      console.error('Error canceling SEO audit task:', error);
      return false;
    }
  }

  /**
   * Get instant SEO audit for a single page
   */
  async getInstantPageAudit(url, options = {}) {
    try {
      const response = await this.client.getInstantOnPageData(url, options);
      return response.tasks[0].result;
    } catch (error) {
      console.error('Error getting instant page audit:', error);
      throw error;
    }
  }

  /**
   * Get non-indexable pages
   */
  async getAuditNonIndexable(taskId, limit = 100, offset = 0) {
    try {
      const response = await this.client.getOnPageNonIndexable(taskId, limit, offset);
      return response.tasks[0].result;
    } catch (error) {
      console.error('Error getting SEO audit non-indexable pages:', error);
      throw error;
    }
  }

  /**
   * Get security information
   */
  async getAuditSecurity(taskId) {
    try {
      const response = await this.client.getOnPageSecurity(taskId);
      return response.tasks[0].result;
    } catch (error) {
      console.error('Error getting SEO audit security information:', error);
      throw error;
    }
  }

  /**
   * Helper: Extract issue count for a specific severity from the result
   */
  getSeverityCount(result, severity) {
    try {
      return result.checks?.issues?.[severity]?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Helper: Get the top issues from the result
   */
  getTopIssues(result: any): Array<{ title: string; severity: string; count: number; description?: string }> {
    try {
      const topIssues: Array<{ title: string; severity: string; count: number; description?: string }> = [];
      const severities = ['critical', 'high', 'medium', 'low'];

      // Collect issues from all severities
      for (const severity of severities) {
        const issues = result.checks?.issues?.[severity]?.details || [];
        
        for (const issue of issues) {
          topIssues.push({
            title: issue.description || issue.name || 'Unknown Issue',
            severity,
            count: issue.count || 1,
            description: issue.help || issue.description
          });
        }
      }

      // Sort by severity and count
      topIssues.sort((a, b) => {
        const severityOrder: Record<string, number> = {
          'critical': 0,
          'high': 1,
          'medium': 2,
          'low': 3
        };

        const aSeverityOrder = severityOrder[a.severity] || 4;
        const bSeverityOrder = severityOrder[b.severity] || 4;

        if (aSeverityOrder !== bSeverityOrder) {
          return aSeverityOrder - bSeverityOrder;
        }

        return b.count - a.count;
      });

      return topIssues.slice(0, 10); // Return top 10 issues
    } catch (error) {
      return [];
    }
  }
} 
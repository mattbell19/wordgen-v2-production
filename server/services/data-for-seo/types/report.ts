/**
 * SEO Audit Report Types
 * Comprehensive type definitions for the SEO audit reporting system
 */

/**
 * Basic information about the website being audited
 */
export interface WebsiteInfo {
  domain: string;
  protocol: string;
  ip?: string;
  cms?: string;
  server?: string;
  technologies?: string[];
  ssl?: {
    valid: boolean;
    issuer?: string;
    expirationDate?: Date;
  };
}

/**
 * Detailed page timing metrics
 */
export interface PageTiming {
  timeToFirstByte: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  totalLoadTime: number;
  domContentLoaded: number;
  largestContentfulPaint?: number;
}

/**
 * Resource information
 */
export interface ResourceInfo {
  url: string;
  type: 'script' | 'style' | 'image' | 'font' | 'other';
  size: number;
  loadTime: number;
  status: number;
  compressed: boolean;
  cached: boolean;
  errors?: string[];
}

/**
 * Link information
 */
export interface LinkInfo {
  url: string;
  type: 'internal' | 'external' | 'resource';
  text: string;
  status: number;
  nofollow: boolean;
  sponsored: boolean;
  ugc: boolean;
  broken: boolean;
}

/**
 * Mobile optimization metrics
 */
export interface MobileOptimization {
  viewport: boolean;
  textReadability: boolean;
  tapTargetSpacing: boolean;
  contentWidth: boolean;
  mediaQueries: boolean;
  responsiveImages: boolean;
}

/**
 * Core Web Vitals metrics
 */
export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  si: number; // Speed Index
  tti: number; // Time to Interactive
}

/**
 * Page-level SEO metrics
 */
export interface PageSeoMetrics {
  url: string;
  statusCode: number;
  redirectChain?: string[];
  title: {
    text: string;
    length: number;
    pixelWidth: number;
    hasDuplicates: boolean;
  };
  metaDescription: {
    text: string;
    length: number;
    hasDuplicates: boolean;
  };
  headings: {
    h1: { count: number; values: string[] };
    h2: { count: number; values: string[] };
    h3: { count: number; values: string[] };
    h4: { count: number; values: string[] };
  };
  images: {
    total: number;
    missing_alt: number;
    alt_too_long: number;
    broken: number;
  };
  wordCount: number;
  readabilityScore: number;
  contentQualityScore: number;
  keywordDensity: Record<string, number>;
  internalLinks: number;
  externalLinks: number;
  brokenLinks: number;
  loadTime: number;
  mobileOptimization: MobileOptimization;
  coreWebVitals: CoreWebVitals;
}

/**
 * Individual SEO issue with detailed information
 */
export interface SeoIssue {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'technical' | 'content' | 'performance' | 'mobile' | 'security' | 'other';
  title: string;
  description: string;
  impact: string;
  affectedUrls: string[];
  recommendations: string[];
  helpUrl?: string;
  priority: number;
  effort: 'low' | 'medium' | 'high';
  technicalDetails?: Record<string, any>;
}

/**
 * Comprehensive SEO audit report
 */
export interface SeoAuditReport {
  // Basic information
  id: string;
  taskId: string;
  target: string;
  createdAt: Date;
  completedAt: Date;
  userId: number;
  
  // Website information
  websiteInfo: WebsiteInfo;
  
  // Summary metrics
  summary: {
    onPageScore: number;
    pagesAnalyzed: number;
    totalIssues: number;
    issuesBySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
    pageSpeed: {
      average: number;
      min: number;
      max: number;
      distribution: {
        fast: number; // 0-2s
        moderate: number; // 2-4s
        slow: number; // >4s
      };
    };
    resourceStats: {
      total: number;
      broken: number;
      slow: number;
      byType: {
        scripts: number;
        styles: number;
        images: number;
        fonts: number;
        other: number;
      };
      totalSize: number;
      averageSize: number;
    };
    linkStats: {
      total: number;
      internal: number;
      external: number;
      broken: number;
      nofollow: number;
      sponsored: number;
      ugc: number;
    };
    mobileScore: number;
    securityScore: number;
  };
  
  // Issues by category
  issues: {
    critical: SeoIssue[];
    high: SeoIssue[];
    medium: SeoIssue[];
    low: SeoIssue[];
  };
  
  // Performance metrics
  performance: {
    pageSpeedScores: { [url: string]: number };
    loadTimes: { [url: string]: PageTiming };
    resourceSizes: { [url: string]: number };
    coreWebVitals: {
      average: CoreWebVitals;
      byPage: { [url: string]: CoreWebVitals };
    };
    mobileOptimization: {
      score: number;
      byPage: { [url: string]: MobileOptimization };
    };
  };
  
  // Content analysis
  content: {
    wordCounts: { [url: string]: number };
    readabilityScores: { [url: string]: number };
    contentQualityScores: { [url: string]: number };
    duplicateContent: {
      pages: string[];
      similarityScore: number;
      matchedContent?: string;
    }[];
    missingMetadata: {
      url: string;
      missingElements: string[];
    }[];
    keywordAnalysis: {
      mainKeywords: { keyword: string; density: number; urls: string[] }[];
      missingKeywords: { keyword: string; suggestedUrls: string[] }[];
    };
  };
  
  // Security analysis
  security: {
    score: number;
    ssl: {
      valid: boolean;
      issuer?: string;
      expirationDate?: Date;
      protocol: string;
    };
    headers: {
      present: string[];
      missing: string[];
      invalid: string[];
    };
    vulnerabilities: {
      severity: 'critical' | 'high' | 'medium' | 'low';
      type: string;
      description: string;
      affectedUrls: string[];
    }[];
  };
  
  // Detailed page-level metrics
  pages: {
    [url: string]: PageSeoMetrics;
  };
  
  // Resources and assets
  resources: {
    [url: string]: ResourceInfo;
  };
  
  // Link analysis
  links: {
    [url: string]: LinkInfo[];
  };
  
  // Historical comparison (if available)
  historical?: {
    lastAuditDate?: Date;
    scoreChange: number;
    issuesChange: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    newIssues: SeoIssue[];
    resolvedIssues: SeoIssue[];
    performanceChange: {
      pageSpeed: number;
      resourceSize: number;
    };
  };
} 
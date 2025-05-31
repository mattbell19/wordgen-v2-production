/**
 * DataForSEO API Response Types
 * Type definitions for the various API responses from DataForSEO OnPage API
 */

// The base data structure for all OnPage API responses
export interface OnPageApiResponse<T> {
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: {
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path: string[];
    data: Record<string, any>;
    result: T[];
  }[];
}

// OnPage summary data types
export interface OnPageSummaryResponse {
  crawl_progress: number;
  crawl_status: string;
  total_pages: number;
  pages_crawled: number;
  onpage_score: number;
  checks: {
    total: number;
    failed: number;
    warnings: number;
    passed: number;
    issues: {
      critical: { count: number; details: OnPageIssueDetail[] };
      high: { count: number; details: OnPageIssueDetail[] };
      medium: { count: number; details: OnPageIssueDetail[] };
      low: { count: number; details: OnPageIssueDetail[] };
      info: { count: number; details: OnPageIssueDetail[] };
    };
  };
  links: {
    total: number;
    internal: number;
    external: number;
    broken: number;
  };
  resources: {
    total: number;
    broken: number;
    size_over: number;
    slow: number;
  };
  page_speed: {
    average_page_load_time: number;
    slowest_page_load_time: number;
    fastest_page_load_time: number;
  };
  non_indexable: {
    total: number;
    robots_txt: number;
    meta_robots: number;
    x_robots_tag: number;
    http_status: number;
    canonical: number;
    redirect: number;
    noindex: number;
  };
  duplicate_tags: {
    total: number;
    title: number;
    description: number;
    h1: number;
  };
  duplicate_content: {
    total: number;
  };
}

// OnPage issue detail structure
export interface OnPageIssueDetail {
  name: string;
  description?: string;
  count: number;
  help?: string;
  categories?: string[];
}

// OnPage page data structure
export interface OnPagePageResponse {
  url: string;
  status_code: number;
  redirect_chain?: string[];
  page_timing?: {
    time_to_interactive?: number;
    dom_complete?: number;
    dom_content_loaded?: number;
    load_time?: number;
    ttfb?: number;
    fcp?: number;
    lcp?: number;
  };
  checks: OnPageCheck[];
  meta?: {
    title?: string;
    title_length?: number;
    title_pixel_width?: number;
    title_duplicates?: boolean;
    description?: string;
    description_length?: number;
    description_duplicates?: boolean;
    charset?: string;
    og_title?: string;
    keywords?: Record<string, number>;
    internal?: {
      content_length?: number;
      readability_score?: number;
      content_quality_score?: number;
    };
  };
  headings?: {
    h1?: { count: number; values: string[] };
    h2?: { count: number; values: string[] };
    h3?: { count: number; values: string[] };
    h4?: { count: number; values: string[] };
  };
  images?: {
    total: number;
    missing_alt: number;
    alt_too_long: number;
    broken: number;
  };
  content?: {
    word_count: number;
    readability_score: number;
    quality_score: number;
    keyword_density: Record<string, number>;
  };
  links?: {
    internal: number;
    external: number;
    broken: number;
  };
  mobile?: {
    viewport: boolean;
    text_readability: boolean;
    tap_targets: boolean;
    content_width: boolean;
    media_queries: boolean;
    responsive_images: boolean;
  };
  core_web_vitals?: {
    lcp: number;
    fid: number;
    cls: number;
    ttfb: number;
    fcp: number;
    si: number;
    tti: number;
  };
}

// OnPage check item
export interface OnPageCheck {
  check_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  impact?: string;
  recommendation?: string;
  effort_estimate?: string;
  details?: Record<string, any>;
}

// OnPage resource data
export interface OnPageResourceResponse {
  url: string;
  source_url: string;
  resource_type: string;
  status_code: number;
  resource_size?: number;
  load_time?: number;
  compressed?: boolean;
  cached?: boolean;
  resource_errors?: string[];
}

// OnPage duplicate tag data
export interface OnPageDuplicateTagResponse {
  tag_type: 'title' | 'description' | 'h1' | 'content';
  value: string;
  pages: {
    url: string;
    status_code: number;
  }[];
  similarity_score?: number;
  matched_content?: string;
}

// OnPage link data
export interface OnPageLinkResponse {
  source_url: string;
  url: string;
  link_type: 'internal' | 'external' | 'resource';
  anchor: string;
  status_code: number;
  attributes?: {
    rel?: string[];
    target?: string;
  };
}

// OnPage non-indexable data
export interface OnPageNonIndexableResponse {
  url: string;
  issue_type: string;
  reason: string;
  details?: Record<string, any>;
}

// OnPage security data
export interface OnPageSecurityResponse {
  security: {
    score: number;
    ssl?: {
      valid: boolean;
      issuer?: string;
      expiration_date?: string;
      protocol?: string;
    };
    headers?: {
      present: string[];
      missing: string[];
      invalid: string[];
    };
    vulnerabilities?: {
      severity: 'critical' | 'high' | 'medium' | 'low';
      type: string;
      description: string;
      affected_urls: string[];
    }[];
  };
} 
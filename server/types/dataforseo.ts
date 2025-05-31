export interface TaskResult {
  onpage_score: number;
  total_pages: number;
  pages_crawled: number;
  issues: {
    critical: number;
    warnings: number;
    passed: number;
  };
  items: Array<{
    url: string;
    checks: Array<{
      type: string;
      category: string;
      description: string;
      recommendation: string;
      priority: number;
    }>;
  }>;
  crawl_progress: string;
  domain_info: {
    name: string;
    cms?: string;
    ip?: string;
    server?: string | null;
    crawl_start?: string;
    crawl_end?: string;
    ssl_info?: {
      valid_certificate: boolean;
      certificate_issuer?: string;
      certificate_subject?: string;
      certificate_version?: number;
      certificate_hash?: string;
      certificate_expiration_date?: string;
    };
    checks?: {
      sitemap?: boolean;
      robots_txt?: boolean;
      start_page_deny_flag?: boolean;
      ssl?: boolean;
      http2?: boolean;
      test_canonicalization?: boolean;
      test_page_not_found?: boolean;
      test_directory_browsing?: boolean;
      test_https_redirect?: boolean;
    };
    total_pages?: number;
    page_not_found_status_code?: number;
    canonicalization_status_code?: number;
    directory_browsing_status_code?: number;
    www_redirect_status_code?: number | null;
    main_domain?: string;
  };
  page_metrics?: {
    links_external: number;
    links_internal: number;
    duplicate_title: number;
    duplicate_description: number;
    duplicate_content: number;
    broken_links: number;
    broken_resources: number;
    links_relation_conflict: number;
    redirect_loop: number;
    onpage_score: number;
    non_indexable: number;
    checks: Record<string, number>;
  };
}
import { SeoAuditService } from './seo-audit.service';
import { taskManager } from './task-manager.service';
import type {
  SeoAuditReport,
  SeoIssue,
  WebsiteInfo,
  PageTiming,
  ResourceInfo,
  LinkInfo,
  MobileOptimization,
  CoreWebVitals,
  PageSeoMetrics
} from './types/report';

/**
 * SEO Audit Report Generator Service
 * Creates comprehensive reports from SEO audit data
 */
export class ReportGeneratorService {
  private seoAuditService: SeoAuditService;
  
  constructor() {
    this.seoAuditService = new SeoAuditService();
  }
  
  /**
   * Generate a comprehensive SEO audit report for a given task
   * 
   * @param taskId ID of the managed task
   * @returns Complete SEO audit report
   */
  async generateReport(taskId: string): Promise<SeoAuditReport | null> {
    try {
      // Get the managed task
      const task = taskManager.getTask(taskId);
      if (!task) {
        console.error(`Task not found: ${taskId}`);
        return null;
      }
      
      // Check if task has DataForSEO task ID and is completed
      if (!task.taskId || task.status !== 'completed') {
        console.error(`Task is not completed or has no DataForSEO task ID: ${taskId}`);
        return null;
      }
      
      // Fetch data from DataForSEO
      const [
        summaryData,
        pagesData,
        resourcesData,
        linksData,
        duplicateTagsData,
        nonIndexableData,
        securityData
      ] = await Promise.all([
        this.seoAuditService.getAuditStatus(task.taskId),
        this.seoAuditService.getAuditPages(task.taskId, 1000),
        this.seoAuditService.getAuditResources(task.taskId, 1000),
        this.seoAuditService.getAuditLinks(task.taskId, 1000),
        this.seoAuditService.getAuditDuplicateTags(task.taskId, 1000),
        this.seoAuditService.getAuditNonIndexable(task.taskId, 1000),
        this.seoAuditService.getAuditSecurity(task.taskId)
      ]);
      
      // Extract website information
      const websiteInfo: WebsiteInfo = this.extractWebsiteInfo(summaryData);
      
      // Extract relevant data and generate report
      const report: SeoAuditReport = {
        id: `report_${Date.now()}`,
        taskId: task.id,
        target: task.target,
        createdAt: new Date(),
        completedAt: new Date(),
        userId: task.userId,
        websiteInfo,
        summary: this.generateSummary(summaryData, pagesData, resourcesData, linksData),
        issues: this.extractIssues(pagesData, resourcesData, linksData, duplicateTagsData, nonIndexableData),
        performance: this.extractPerformanceMetrics(pagesData, resourcesData),
        content: this.extractContentStats(pagesData, duplicateTagsData),
        security: this.extractSecurityInfo(securityData),
        pages: this.extractPageMetrics(pagesData),
        resources: this.extractResourceInfo(resourcesData),
        links: this.extractLinkInfo(linksData)
      };
      
      // Add historical comparison if available
      const lastReport = await this.getLastReport(task.target, task.userId);
      if (lastReport) {
        report.historical = this.compareReports(report, lastReport);
      }
      
      return report;
    } catch (error) {
      console.error('Error generating SEO audit report:', error);
      return null;
    }
  }
  
  /**
   * Extract website information from summary data
   */
  private extractWebsiteInfo(summaryData: any): WebsiteInfo {
    const domain = summaryData.domain_info || {};
    return {
      domain: domain.name || '',
      protocol: domain.protocol || 'https',
      ip: domain.ip,
      cms: domain.cms,
      server: domain.server,
      technologies: domain.technologies || [],
      ssl: domain.ssl_info ? {
        valid: domain.ssl_info.valid_certificate || false,
        issuer: domain.ssl_info.issuer,
        expirationDate: domain.ssl_info.expiration_date ? new Date(domain.ssl_info.expiration_date) : undefined
      } : undefined
    };
  }
  
  /**
   * Generate summary metrics from audit data
   */
  private generateSummary(summaryData: any, pagesData: any, resourcesData: any, linksData: any): SeoAuditReport['summary'] {
    // Extract summary data
    const summary = summaryData.summary || {};
    
    // Calculate resource statistics
    const resourceStats = this.calculateResourceStats(resourcesData);
    
    // Calculate page speed distribution
    const speedDistribution = this.calculateSpeedDistribution(pagesData);
    
    // Default structure
    const result: SeoAuditReport['summary'] = {
      onPageScore: summary.onPageScore || 0,
      pagesAnalyzed: pagesData?.length || 0,
      totalIssues: 0,
      issuesBySeverity: {
        critical: summary.issuesSummary?.critical || 0,
        high: summary.issuesSummary?.high || 0,
        medium: summary.issuesSummary?.medium || 0,
        low: summary.issuesSummary?.low || 0,
        info: summary.issuesSummary?.noIssue || 0
      },
      pageSpeed: {
        average: summary.pageSpeedAverage || 0,
        min: 0,
        max: 0,
        distribution: speedDistribution
      },
      resourceStats: {
        total: resourceStats.total,
        broken: resourceStats.broken,
        slow: resourceStats.slow,
        byType: resourceStats.byType,
        totalSize: resourceStats.totalSize,
        averageSize: resourceStats.averageSize
      },
      linkStats: {
        total: summary.totalLinks || 0,
        internal: 0,
        external: 0,
        broken: summary.brokenLinks || 0,
        nofollow: 0,
        sponsored: 0,
        ugc: 0
      },
      mobileScore: summary.mobileScore || 0,
      securityScore: summary.securityScore || 0
    };
    
    // Calculate total issues
    result.totalIssues = (
      result.issuesBySeverity.critical +
      result.issuesBySeverity.high +
      result.issuesBySeverity.medium +
      result.issuesBySeverity.low
    );
    
    // Calculate page speed min/max if data is available
    if (pagesData && pagesData.length > 0) {
      const speedValues = pagesData
        .filter((page: any) => page.page_timing && page.page_timing.time_to_interactive)
        .map((page: any) => page.page_timing.time_to_interactive);
      
      if (speedValues.length > 0) {
        result.pageSpeed.min = Math.min(...speedValues);
        result.pageSpeed.max = Math.max(...speedValues);
      }
    }
    
    // Calculate link statistics if data is available
    if (linksData && linksData.length > 0) {
      const linkTypes = this.calculateLinkStats(linksData);
      result.linkStats = {
        ...result.linkStats,
        ...linkTypes
      };
    }
    
    return result;
  }
  
  /**
   * Calculate resource statistics
   */
  private calculateResourceStats(resourcesData: any[]): any {
    const stats = {
      total: 0,
      broken: 0,
      slow: 0,
      byType: {
        scripts: 0,
        styles: 0,
        images: 0,
        fonts: 0,
        other: 0
      },
      totalSize: 0,
      averageSize: 0
    };
    
    if (!resourcesData || !Array.isArray(resourcesData)) {
      return stats;
    }
    
    resourcesData.forEach(resource => {
      stats.total++;
      
      if (resource.status_code >= 400) {
        stats.broken++;
      }
      
      if (resource.load_time > 1000) {
        stats.slow++;
      }
      
      // Categorize by type
      const type = resource.resource_type?.toLowerCase() || 'other';
      if (type.includes('script')) stats.byType.scripts++;
      else if (type.includes('style')) stats.byType.styles++;
      else if (type.includes('image')) stats.byType.images++;
      else if (type.includes('font')) stats.byType.fonts++;
      else stats.byType.other++;
      
      // Add size
      if (resource.resource_size) {
        stats.totalSize += resource.resource_size;
      }
    });
    
    stats.averageSize = stats.total > 0 ? Math.round(stats.totalSize / stats.total) : 0;
    
    return stats;
  }
  
  /**
   * Calculate page speed distribution
   */
  private calculateSpeedDistribution(pagesData: any[]): { fast: number; moderate: number; slow: number } {
    const distribution = {
      fast: 0,
      moderate: 0,
      slow: 0
    };
    
    if (!pagesData || !Array.isArray(pagesData)) {
      return distribution;
    }
    
    pagesData.forEach(page => {
      const loadTime = page.page_timing?.time_to_interactive || 0;
      
      if (loadTime <= 2000) distribution.fast++;
      else if (loadTime <= 4000) distribution.moderate++;
      else distribution.slow++;
    });
    
    return distribution;
  }
  
  /**
   * Calculate link statistics
   */
  private calculateLinkStats(linksData: any[]): any {
    const stats = {
      internal: 0,
      external: 0,
      nofollow: 0,
      sponsored: 0,
      ugc: 0
    };
    
    if (!linksData || !Array.isArray(linksData)) {
      return stats;
    }
    
    linksData.forEach(link => {
      if (link.link_type === 'internal') stats.internal++;
      else if (link.link_type === 'external') stats.external++;
      
      if (link.attributes?.rel) {
        if (link.attributes.rel.includes('nofollow')) stats.nofollow++;
        if (link.attributes.rel.includes('sponsored')) stats.sponsored++;
        if (link.attributes.rel.includes('ugc')) stats.ugc++;
      }
    });
    
    return stats;
  }
  
  /**
   * Extract issues by category from audit data
   */
  private extractIssues(pagesData: any, resourcesData: any, linksData: any, duplicateTagsData: any, nonIndexableData: any): SeoAuditReport['issues'] {
    const issues: SeoAuditReport['issues'] = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    
    // Process page issues
    if (pagesData && pagesData.length > 0) {
      pagesData.forEach((page: any) => {
        if (page.checks && page.checks.length > 0) {
          page.checks.forEach((check: any) => {
            if (check.severity && ['critical', 'high', 'medium', 'low'].includes(check.severity)) {
              const issue: SeoIssue = {
                id: `${check.check_id || 'unknown'}_${Date.now()}`,
                type: check.check_id || 'unknown',
                category: this.getIssueCategory(check.check_id),
                severity: check.severity,
                title: check.title || 'Unknown Issue',
                description: check.description || 'No description available',
                impact: check.impact || 'Unknown impact',
                affectedUrls: [page.url],
                recommendations: [check.recommendation || 'No recommendation available'],
                priority: this.getIssuePriority(check.severity),
                effort: this.getIssueEffort(check.effort_estimate)
              };
              
              // Add to appropriate category
              issues[check.severity].push(issue);
            }
          });
        }
      });
    }
    
    // Process resource issues (broken resources)
    if (resourcesData && resourcesData.length > 0) {
      const brokenResources = resourcesData.filter((resource: any) => 
        resource.status_code >= 400 || resource.resource_errors);
      
      if (brokenResources.length > 0) {
        const issue: SeoIssue = {
          id: `broken_resources_${Date.now()}`,
          type: 'broken_resources',
          category: 'technical',
          severity: 'high',
          title: 'Broken Resources Detected',
          description: 'Broken resources found on the website',
          impact: 'Broken resources can negatively impact user experience and page load times',
          affectedUrls: brokenResources.map((r: any) => r.source_url).filter(Boolean),
          recommendations: ['Fix or remove broken resources to improve page load time and user experience'],
          priority: 2,
          effort: 'medium'
        };
        
        issues.high.push(issue);
      }
    }
    
    // Process duplicate tags issues
    if (duplicateTagsData && duplicateTagsData.length > 0) {
      // Group duplicate tags by type (title, description, h1)
      const groupedTags: { [key: string]: any[] } = {};
      
      duplicateTagsData.forEach((item: any) => {
        const tagType = item.tag_type || 'unknown';
        if (!groupedTags[tagType]) {
          groupedTags[tagType] = [];
        }
        groupedTags[tagType].push(item);
      });
      
      // Create issues for each tag type
      Object.entries(groupedTags).forEach(([tagType, items]) => {
        const issue: SeoIssue = {
          id: `duplicate_${tagType}_${Date.now()}`,
          type: `duplicate_${tagType}`,
          category: 'content',
          severity: tagType === 'title' ? 'high' : 'medium',
          title: `Duplicate ${tagType} Tags Found`,
          description: `Duplicate ${tagType} tags found across multiple pages`,
          impact: `Duplicate ${tagType} tags can confuse search engines and dilute SEO value`,
          affectedUrls: items.flatMap((item: any) => item.pages || []).map((p: any) => p.url).filter(Boolean),
          recommendations: [
            `Ensure each page has a unique, descriptive ${tagType}`,
            `Review and update duplicate ${tagType} tags to improve SEO performance`
          ],
          priority: tagType === 'title' ? 2 : 3,
          effort: 'medium'
        };
        
        issues[issue.severity].push(issue);
      });
    }
    
    // Process non-indexable issues
    if (nonIndexableData && nonIndexableData.length > 0) {
      // Group non-indexable issues by type (robots.txt, sitemap.xml)
      const groupedIssues: { [key: string]: any[] } = {};
      
      nonIndexableData.forEach((item: any) => {
        const issueType = item.issue_type || 'unknown';
        if (!groupedIssues[issueType]) {
          groupedIssues[issueType] = [];
        }
        groupedIssues[issueType].push(item);
      });
      
      // Create issues for each issue type
      Object.entries(groupedIssues).forEach(([issueType, items]) => {
        const issue: SeoIssue = {
          id: `non_indexable_${issueType}_${Date.now()}`,
          type: issueType,
          category: 'technical',
          severity: 'low',
          title: `Non-indexable Issue in ${issueType}`,
          description: `Non-indexable issue found in ${issueType}`,
          impact: 'Pages may not be properly indexed by search engines',
          affectedUrls: items.map((item: any) => item.url).filter(Boolean),
          recommendations: [
            `Ensure ${issueType} is properly configured to allow search engine indexing`,
            `Review and update ${issueType} to improve SEO performance`
          ],
          priority: 4,
          effort: 'low'
        };
        
        issues.low.push(issue);
      });
    }
    
    return issues;
  }
  
  /**
   * Extract performance metrics from audit data
   */
  private extractPerformanceMetrics(pagesData: any, resourcesData: any): SeoAuditReport['performance'] {
    const performance: SeoAuditReport['performance'] = {
      pageSpeedScores: {},
      loadTimes: {},
      resourceSizes: {},
      coreWebVitals: {
        average: {
          lcp: 0,
          fid: 0,
          cls: 0,
          ttfb: 0,
          fcp: 0,
          si: 0,
          tti: 0
        },
        byPage: {}
      },
      mobileOptimization: {
        score: 0,
        byPage: {}
      }
    };
    
    // Extract page speed metrics
    if (pagesData && pagesData.length > 0) {
      let totalLcp = 0, totalFid = 0, totalCls = 0;
      let totalTtfb = 0, totalFcp = 0, totalSi = 0, totalTti = 0;
      let pagesWithMetrics = 0;
      
      pagesData.forEach((page: any) => {
        if (page.url) {
          // Page speed score
          const timeToInteractive = page.page_timing?.time_to_interactive || 0;
          let score = 100;
          
          // Simple scoring: deduct points based on load time
          if (timeToInteractive > 5000) score = 50; // >5s: poor
          else if (timeToInteractive > 3000) score = 70; // 3-5s: needs improvement
          else if (timeToInteractive > 1000) score = 90; // 1-3s: good
          
          performance.pageSpeedScores[page.url] = score;
          
          // Load times
          if (page.page_timing) {
            performance.loadTimes[page.url] = {
              timeToFirstByte: page.page_timing.ttfb || 0,
              timeToInteractive: timeToInteractive,
              firstContentfulPaint: page.page_timing.fcp || 0,
              totalLoadTime: page.page_timing.load_time || 0,
              domContentLoaded: page.page_timing.dom_content_loaded || 0,
              largestContentfulPaint: page.page_timing.lcp || 0
            };
          }
          
          // Core Web Vitals
          if (page.core_web_vitals) {
            const vitals = page.core_web_vitals;
            performance.coreWebVitals.byPage[page.url] = {
              lcp: vitals.lcp || 0,
              fid: vitals.fid || 0,
              cls: vitals.cls || 0,
              ttfb: vitals.ttfb || 0,
              fcp: vitals.fcp || 0,
              si: vitals.si || 0,
              tti: vitals.tti || 0
            };
            
            // Add to totals for average calculation
            totalLcp += vitals.lcp || 0;
            totalFid += vitals.fid || 0;
            totalCls += vitals.cls || 0;
            totalTtfb += vitals.ttfb || 0;
            totalFcp += vitals.fcp || 0;
            totalSi += vitals.si || 0;
            totalTti += vitals.tti || 0;
            pagesWithMetrics++;
          }
          
          // Mobile optimization
          if (page.mobile) {
            performance.mobileOptimization.byPage[page.url] = {
              viewport: page.mobile.viewport || false,
              textReadability: page.mobile.text_readability || false,
              tapTargetSpacing: page.mobile.tap_targets || false,
              contentWidth: page.mobile.content_width || false,
              mediaQueries: page.mobile.media_queries || false,
              responsiveImages: page.mobile.responsive_images || false
            };
          }
        }
      });
      
      // Calculate averages for Core Web Vitals
      if (pagesWithMetrics > 0) {
        performance.coreWebVitals.average = {
          lcp: totalLcp / pagesWithMetrics,
          fid: totalFid / pagesWithMetrics,
          cls: totalCls / pagesWithMetrics,
          ttfb: totalTtfb / pagesWithMetrics,
          fcp: totalFcp / pagesWithMetrics,
          si: totalSi / pagesWithMetrics,
          tti: totalTti / pagesWithMetrics
        };
      }
      
      // Calculate mobile optimization score
      const mobileScores = Object.values(performance.mobileOptimization.byPage);
      if (mobileScores.length > 0) {
        let totalScore = 0;
        
        for (const page of mobileScores) {
          // Count number of enabled mobile optimizations
          const enabledOptimizations = Object.values(page).filter(Boolean).length;
          
          // Calculate score as percentage (out of 6 possible optimizations)
          const optimizationRatio = enabledOptimizations / 6;
          const pageScore = Math.floor(optimizationRatio * 100);
          
          totalScore += pageScore;
        }
        
        // Calculate average score across all pages
        const totalPages = mobileScores.length;
        performance.mobileOptimization.score = Math.floor(totalScore / totalPages);
      }
    }
    
    // Extract resource size metrics (total by page)
    if (resourcesData && resourcesData.length > 0) {
      const resourcesByPage: { [url: string]: number } = {};
      
      resourcesData.forEach((resource: any) => {
        if (resource.source_url && resource.resource_size) {
          if (!resourcesByPage[resource.source_url]) {
            resourcesByPage[resource.source_url] = 0;
          }
          resourcesByPage[resource.source_url] += resource.resource_size;
        }
      });
      
      performance.resourceSizes = resourcesByPage;
    }
    
    return performance;
  }
  
  /**
   * Extract content statistics from audit data
   */
  private extractContentStats(pagesData: any, duplicateTagsData: any): SeoAuditReport['content'] {
    const content: SeoAuditReport['content'] = {
      wordCounts: {},
      readabilityScores: {},
      contentQualityScores: {},
      duplicateContent: [],
      missingMetadata: [],
      keywordAnalysis: {
        mainKeywords: [],
        missingKeywords: []
      }
    };
    
    // Extract word counts and scores
    if (pagesData && pagesData.length > 0) {
      pagesData.forEach((page: any) => {
        if (page.url && page.meta && page.meta.internal) {
          // Word count
          const contentLength = page.meta.internal.content_length || 0;
          content.wordCounts[page.url] = Math.round(contentLength / 6); // Rough approximation
          
          // Readability score
          content.readabilityScores[page.url] = page.meta.internal.readability_score || 0;
          
          // Content quality score
          content.contentQualityScores[page.url] = page.meta.internal.content_quality_score || 0;
        }
      });
    }
    
    // Extract duplicate content
    if (duplicateTagsData && duplicateTagsData.length > 0) {
      const duplicateContents = duplicateTagsData.filter((item: any) => 
        item.tag_type === 'content' && item.pages && item.pages.length > 1);
      
      duplicateContents.forEach((item: any) => {
        content.duplicateContent.push({
          pages: item.pages.map((p: any) => p.url),
          similarityScore: item.similarity_score || 0.8,
          matchedContent: item.matched_content
        });
      });
    }
    
    // Extract missing metadata
    if (pagesData && pagesData.length > 0) {
      pagesData.forEach((page: any) => {
        if (page.url) {
          const missingElements: string[] = [];
          
          // Check for common missing metadata
          if (!page.meta?.title || page.meta?.title.length === 0) {
            missingElements.push('title');
          }
          
          if (!page.meta?.description || page.meta?.description.length === 0) {
            missingElements.push('description');
          }
          
          if (!page.meta?.charset) {
            missingElements.push('charset');
          }
          
          if (!page.meta?.og_title) {
            missingElements.push('og:title');
          }
          
          if (missingElements.length > 0) {
            content.missingMetadata.push({
              url: page.url,
              missingElements
            });
          }
        }
      });
    }
    
    // Extract keyword analysis
    if (pagesData && pagesData.length > 0) {
      const keywordMap = new Map<string, { density: number; urls: string[] }>();
      
      pagesData.forEach((page: any) => {
        if (page.url && page.meta?.keywords) {
          Object.entries(page.meta.keywords).forEach(([keyword, density]) => {
            if (!keywordMap.has(keyword)) {
              keywordMap.set(keyword, { density: 0, urls: [] });
            }
            const keywordInfo = keywordMap.get(keyword)!;
            keywordInfo.density = Math.max(keywordInfo.density, density as number);
            keywordInfo.urls.push(page.url);
          });
        }
      });
      
      // Convert to array and sort by density
      content.keywordAnalysis.mainKeywords = Array.from(keywordMap.entries())
        .map(([keyword, info]) => ({
          keyword,
          density: info.density,
          urls: info.urls
        }))
        .sort((a, b) => b.density - a.density)
        .slice(0, 10); // Top 10 keywords
    }
    
    return content;
  }
  
  /**
   * Extract security information from security data
   */
  private extractSecurityInfo(securityData: any): SeoAuditReport['security'] {
    const security = securityData?.security || {};
    return {
      score: security.score || 0,
      ssl: {
        valid: security.ssl?.valid || false,
        issuer: security.ssl?.issuer,
        expirationDate: security.ssl?.expiration_date ? new Date(security.ssl.expiration_date) : undefined,
        protocol: security.ssl?.protocol || 'unknown'
      },
      headers: {
        present: security.headers?.present || [],
        missing: security.headers?.missing || [],
        invalid: security.headers?.invalid || []
      },
      vulnerabilities: (security.vulnerabilities || []).map((vuln: any) => ({
        severity: vuln.severity || 'low',
        type: vuln.type || 'unknown',
        description: vuln.description || 'No description available',
        affectedUrls: vuln.affected_urls || []
      }))
    };
  }
  
  /**
   * Extract page-level metrics from pages data
   */
  private extractPageMetrics(pagesData: any[]): { [url: string]: PageSeoMetrics } {
    const pageMetrics: { [url: string]: PageSeoMetrics } = {};
    
    if (!pagesData || !Array.isArray(pagesData)) {
      return pageMetrics;
    }
    
    pagesData.forEach(page => {
      if (!page.url) return;
      
      pageMetrics[page.url] = {
        url: page.url,
        statusCode: page.status_code || 200,
        redirectChain: page.redirect_chain || [],
        title: {
          text: page.meta?.title || '',
          length: page.meta?.title?.length || 0,
          pixelWidth: page.meta?.title_pixel_width || 0,
          hasDuplicates: page.meta?.title_duplicates || false
        },
        metaDescription: {
          text: page.meta?.description || '',
          length: page.meta?.description?.length || 0,
          hasDuplicates: page.meta?.description_duplicates || false
        },
        headings: {
          h1: { count: page.headings?.h1?.count || 0, values: page.headings?.h1?.values || [] },
          h2: { count: page.headings?.h2?.count || 0, values: page.headings?.h2?.values || [] },
          h3: { count: page.headings?.h3?.count || 0, values: page.headings?.h3?.values || [] },
          h4: { count: page.headings?.h4?.count || 0, values: page.headings?.h4?.values || [] }
        },
        images: {
          total: page.images?.total || 0,
          missing_alt: page.images?.missing_alt || 0,
          alt_too_long: page.images?.alt_too_long || 0,
          broken: page.images?.broken || 0
        },
        wordCount: page.content?.word_count || 0,
        readabilityScore: page.content?.readability_score || 0,
        contentQualityScore: page.content?.quality_score || 0,
        keywordDensity: page.content?.keyword_density || {},
        internalLinks: page.links?.internal || 0,
        externalLinks: page.links?.external || 0,
        brokenLinks: page.links?.broken || 0,
        loadTime: page.page_timing?.time_to_interactive || 0,
        mobileOptimization: {
          viewport: page.mobile?.viewport || false,
          textReadability: page.mobile?.text_readability || false,
          tapTargetSpacing: page.mobile?.tap_targets || false,
          contentWidth: page.mobile?.content_width || false,
          mediaQueries: page.mobile?.media_queries || false,
          responsiveImages: page.mobile?.responsive_images || false
        },
        coreWebVitals: {
          lcp: page.core_web_vitals?.lcp || 0,
          fid: page.core_web_vitals?.fid || 0,
          cls: page.core_web_vitals?.cls || 0,
          ttfb: page.core_web_vitals?.ttfb || 0,
          fcp: page.core_web_vitals?.fcp || 0,
          si: page.core_web_vitals?.si || 0,
          tti: page.core_web_vitals?.tti || 0
        }
      };
    });
    
    return pageMetrics;
  }
  
  /**
   * Extract resource information from resources data
   */
  private extractResourceInfo(resourcesData: any[]): { [url: string]: ResourceInfo } {
    const resources: { [url: string]: ResourceInfo } = {};
    
    if (!resourcesData || !Array.isArray(resourcesData)) {
      return resources;
    }
    
    resourcesData.forEach(resource => {
      if (!resource.url) return;
      
      resources[resource.url] = {
        url: resource.url,
        type: this.getResourceType(resource.resource_type),
        size: resource.resource_size || 0,
        loadTime: resource.load_time || 0,
        status: resource.status_code || 200,
        compressed: resource.compressed || false,
        cached: resource.cached || false,
        errors: resource.resource_errors || []
      };
    });
    
    return resources;
  }
  
  /**
   * Extract link information from links data
   */
  private extractLinkInfo(linksData: any[]): { [url: string]: LinkInfo[] } {
    const links: { [url: string]: LinkInfo[] } = {};
    
    if (!linksData || !Array.isArray(linksData)) {
      return links;
    }
    
    linksData.forEach(link => {
      if (!link.source_url || !link.url) return;
      
      if (!links[link.source_url]) {
        links[link.source_url] = [];
      }
      
      links[link.source_url].push({
        url: link.url,
        type: link.link_type || 'other',
        text: link.anchor || '',
        status: link.status_code || 200,
        nofollow: link.attributes?.rel?.includes('nofollow') || false,
        sponsored: link.attributes?.rel?.includes('sponsored') || false,
        ugc: link.attributes?.rel?.includes('ugc') || false,
        broken: link.status_code >= 400
      });
    });
    
    return links;
  }
  
  /**
   * Get the last report for a given target and user
   */
  private async getLastReport(target: string, userId: number): Promise<SeoAuditReport | null> {
    // This would typically fetch from a database
    // For now, return null as we haven't implemented historical storage yet
    return null;
  }
  
  /**
   * Helper: Get resource type from raw type string
   */
  private getResourceType(rawType: string): 'script' | 'style' | 'image' | 'font' | 'other' {
    if (!rawType) return 'other';
    
    const type = rawType.toLowerCase();
    if (type.includes('script')) return 'script';
    if (type.includes('style') || type.includes('css')) return 'style';
    if (type.includes('image') || type.includes('img')) return 'image';
    if (type.includes('font')) return 'font';
    return 'other';
  }
  
  /**
   * Compare current report with a historical report
   * 
   * @param currentReport Current SEO audit report
   * @param historicalReport Previous SEO audit report to compare against
   * @returns Comparison of key metrics
   */
  compareReports(currentReport: SeoAuditReport, historicalReport: SeoAuditReport): any {
    // Compare summary metrics
    const comparison = {
      summary: {
        onPageScore: {
          current: currentReport.summary.onPageScore,
          previous: historicalReport.summary.onPageScore,
          change: currentReport.summary.onPageScore - historicalReport.summary.onPageScore
        },
        totalIssues: {
          current: currentReport.summary.totalIssues,
          previous: historicalReport.summary.totalIssues,
          change: currentReport.summary.totalIssues - historicalReport.summary.totalIssues
        },
        issuesBySeverity: {
          critical: {
            current: currentReport.summary.issuesBySeverity.critical,
            previous: historicalReport.summary.issuesBySeverity.critical,
            change: currentReport.summary.issuesBySeverity.critical - historicalReport.summary.issuesBySeverity.critical
          },
          high: {
            current: currentReport.summary.issuesBySeverity.high,
            previous: historicalReport.summary.issuesBySeverity.high,
            change: currentReport.summary.issuesBySeverity.high - historicalReport.summary.issuesBySeverity.high
          },
          medium: {
            current: currentReport.summary.issuesBySeverity.medium,
            previous: historicalReport.summary.issuesBySeverity.medium,
            change: currentReport.summary.issuesBySeverity.medium - historicalReport.summary.issuesBySeverity.medium
          },
          low: {
            current: currentReport.summary.issuesBySeverity.low,
            previous: historicalReport.summary.issuesBySeverity.low,
            change: currentReport.summary.issuesBySeverity.low - historicalReport.summary.issuesBySeverity.low
          }
        },
        pageSpeed: {
          average: {
            current: currentReport.summary.pageSpeed.average,
            previous: historicalReport.summary.pageSpeed.average,
            change: currentReport.summary.pageSpeed.average - historicalReport.summary.pageSpeed.average
          }
        }
      },
      newIssues: this.findNewIssues(currentReport, historicalReport),
      resolvedIssues: this.findResolvedIssues(currentReport, historicalReport),
      performanceChanges: this.comparePerformance(currentReport, historicalReport)
    };
    
    return comparison;
  }
  
  /**
   * Find issues that are present in current report but not in historical report
   */
  private findNewIssues(currentReport: SeoAuditReport, historicalReport: SeoAuditReport): any[] {
    // This is a simplified implementation - a real one would be more sophisticated
    const newIssues: any[] = [];
    
    // Helper function to find if an issue existed in historical report
    const findMatchingIssue = (issue: SeoIssue, historicalIssues: SeoIssue[]): boolean => {
      return historicalIssues.some(histIssue => 
        histIssue.type === issue.type && 
        histIssue.severity === issue.severity &&
        this.arraysHaveOverlap(histIssue.affectedUrls, issue.affectedUrls)
      );
    };
    
    // Check each severity level
    ['critical', 'high', 'medium', 'low'].forEach((severity) => {
      currentReport.issues[severity as keyof typeof currentReport.issues].forEach(issue => {
        if (!findMatchingIssue(issue, historicalReport.issues[severity as keyof typeof historicalReport.issues])) {
          newIssues.push({
            ...issue,
            status: 'new'
          });
        }
      });
    });
    
    return newIssues;
  }
  
  /**
   * Find issues that were present in historical report but resolved in current report
   */
  private findResolvedIssues(currentReport: SeoAuditReport, historicalReport: SeoAuditReport): any[] {
    // This is a simplified implementation - a real one would be more sophisticated
    const resolvedIssues: any[] = [];
    
    // Helper function to find if an issue exists in current report
    const findMatchingIssue = (issue: SeoIssue, currentIssues: SeoIssue[]): boolean => {
      return currentIssues.some(currIssue => 
        currIssue.type === issue.type && 
        currIssue.severity === issue.severity &&
        this.arraysHaveOverlap(currIssue.affectedUrls, issue.affectedUrls)
      );
    };
    
    // Check each severity level
    ['critical', 'high', 'medium', 'low'].forEach((severity) => {
      historicalReport.issues[severity as keyof typeof historicalReport.issues].forEach(issue => {
        if (!findMatchingIssue(issue, currentReport.issues[severity as keyof typeof currentReport.issues])) {
          resolvedIssues.push({
            ...issue,
            status: 'resolved'
          });
        }
      });
    });
    
    return resolvedIssues;
  }
  
  /**
   * Compare performance metrics between reports
   */
  private comparePerformance(currentReport: SeoAuditReport, historicalReport: SeoAuditReport): any {
    // Find URLs that exist in both reports
    const commonUrls = Object.keys(currentReport.performance.pageSpeedScores)
      .filter(url => url in historicalReport.performance.pageSpeedScores);
    
    // Compare metrics for common URLs
    const performanceChanges = commonUrls.map(url => {
      const currentSpeed = currentReport.performance.pageSpeedScores[url];
      const previousSpeed = historicalReport.performance.pageSpeedScores[url];
      const speedChange = currentSpeed - previousSpeed;
      
      const currentLoadTime = currentReport.performance.loadTimes[url];
      const previousLoadTime = historicalReport.performance.loadTimes[url];
      const loadTimeChange = currentLoadTime - previousLoadTime;
      
      return {
        url,
        pageSpeed: {
          current: currentSpeed,
          previous: previousSpeed,
          change: speedChange,
          percentChange: (speedChange / previousSpeed) * 100
        },
        loadTime: {
          current: currentLoadTime,
          previous: previousLoadTime,
          change: loadTimeChange,
          percentChange: (loadTimeChange / previousLoadTime) * 100
        }
      };
    });
    
    return performanceChanges;
  }
  
  /**
   * Helper: Check if two arrays have any overlapping elements
   */
  private arraysHaveOverlap(arr1: any[], arr2: any[]): boolean {
    return arr1.some(item => arr2.includes(item));
  }
  
  /**
   * Helper: Get issue category based on check ID
   */
  private getIssueCategory(checkId: string): SeoIssue['category'] {
    if (!checkId) return 'other';
    
    const id = checkId.toLowerCase();
    if (id.includes('speed') || id.includes('load')) return 'performance';
    if (id.includes('mobile') || id.includes('responsive')) return 'mobile';
    if (id.includes('content') || id.includes('text')) return 'content';
    if (id.includes('security') || id.includes('ssl')) return 'security';
    if (id.includes('technical') || id.includes('server')) return 'technical';
    return 'other';
  }
  
  /**
   * Helper: Get issue priority based on severity
   */
  private getIssuePriority(severity: SeoIssue['severity']): number {
    switch (severity) {
      case 'critical': return 1;
      case 'high': return 2;
      case 'medium': return 3;
      case 'low': return 4;
      case 'info': return 5;
      default: return 5;
    }
  }
  
  /**
   * Helper: Get issue effort based on estimate
   */
  private getIssueEffort(estimate?: string): SeoIssue['effort'] {
    if (!estimate) return 'medium';
    
    const effort = estimate.toLowerCase();
    if (effort.includes('quick') || effort.includes('easy')) return 'low';
    if (effort.includes('complex') || effort.includes('difficult')) return 'high';
    return 'medium';
  }
}

// Export singleton instance
export const reportGenerator = new ReportGeneratorService(); 
import { ReportGeneratorService } from '../report-generator.service';
import { SeoAuditService } from '../seo-audit.service';
import { taskManager } from '../task-manager.service';

// Mock the dependencies
jest.mock('../seo-audit.service');
jest.mock('../task-manager.service');

describe('ReportGeneratorService', () => {
  let reportGenerator: ReportGeneratorService;
  let mockSeoAuditService: jest.Mocked<SeoAuditService>;
  
  // Sample test data
  const mockTaskId = 'task-123';
  const mockTaskData = {
    id: mockTaskId,
    taskId: 'dfs-task-456',
    target: 'https://example.com',
    status: 'completed',
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const mockSummaryData = {
    status: 'completed',
    progress: 100,
    summary: {
      onPageScore: 85,
      crawlProgress: 100,
      pagesCount: 10,
      pagesCrawled: 10,
      issuesSummary: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
        noIssue: 5
      },
      topIssues: [
        { title: 'Issue 1', severity: 'critical', count: 1 }
      ],
      pageSpeedAverage: 2500,
      totalChecks: 50,
      failedChecks: 10,
      totalLinks: 100,
      brokenLinks: 5,
      totalResources: 200,
      brokenResources: 10
    },
    domain_info: {
      name: 'example.com',
      protocol: 'https',
      ip: '192.168.1.1',
      cms: 'WordPress',
      server: 'Apache',
      technologies: ['PHP', 'jQuery']
    }
  };
  
  const mockPagesData = [
    {
      url: 'https://example.com/',
      status_code: 200,
      page_timing: {
        time_to_interactive: 1500,
        ttfb: 200,
        fcp: 800,
        load_time: 2000,
        dom_content_loaded: 1000
      },
      checks: [
        {
          check_id: 'meta_title_length',
          severity: 'medium',
          title: 'Meta title is too long',
          description: 'Meta title should be less than 60 characters',
          recommendation: 'Shorten the meta title'
        }
      ],
      meta: {
        title: 'Example Page Title',
        description: 'Example page description'
      },
      mobile: {
        viewport: true,
        text_readability: true,
        tap_targets: false,
        content_width: true,
        media_queries: true,
        responsive_images: true
      }
    }
  ];
  
  const mockResourcesData = [
    {
      url: 'https://example.com/style.css',
      source_url: 'https://example.com/',
      resource_type: 'stylesheet',
      status_code: 200,
      resource_size: 10000,
      load_time: 300
    },
    {
      url: 'https://example.com/broken.js',
      source_url: 'https://example.com/',
      resource_type: 'script',
      status_code: 404,
      resource_size: 0,
      load_time: 0,
      resource_errors: ['Not found']
    }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Cast as any to avoid type errors with the mock
    mockSeoAuditService = new SeoAuditService() as jest.Mocked<SeoAuditService>;
    
    // Setup task manager mock
    (taskManager.getTask as jest.Mock).mockReturnValue(mockTaskData);
    
    // Setup SeoAuditService mock methods
    mockSeoAuditService.getAuditStatus = jest.fn().mockResolvedValue(mockSummaryData);
    mockSeoAuditService.getAuditPages = jest.fn().mockResolvedValue(mockPagesData);
    mockSeoAuditService.getAuditResources = jest.fn().mockResolvedValue(mockResourcesData);
    mockSeoAuditService.getAuditLinks = jest.fn().mockResolvedValue([]);
    mockSeoAuditService.getAuditDuplicateTags = jest.fn().mockResolvedValue([]);
    mockSeoAuditService.getAuditNonIndexable = jest.fn().mockResolvedValue([]);
    mockSeoAuditService.getAuditSecurity = jest.fn().mockResolvedValue({});
    
    // Create report generator with mocked dependencies
    reportGenerator = new ReportGeneratorService();
    // Replace the service with our mock
    reportGenerator['seoAuditService'] = mockSeoAuditService;
  });
  
  describe('generateReport', () => {
    it('should generate a complete report for a valid task', async () => {
      const report = await reportGenerator.generateReport(mockTaskId);
      
      // Check that the report was generated and has the correct structure
      expect(report).not.toBeNull();
      expect(report?.id).toBeDefined();
      expect(report?.taskId).toBe(mockTaskId);
      expect(report?.target).toBe('https://example.com');
      
      // Check that summary data was processed correctly
      expect(report?.summary.onPageScore).toBe(85);
      expect(report?.summary.issuesBySeverity.critical).toBe(1);
      expect(report?.summary.issuesBySeverity.high).toBe(2);
      
      // Check that all the required API methods were called
      expect(mockSeoAuditService.getAuditStatus).toHaveBeenCalledWith(mockTaskData.taskId);
      expect(mockSeoAuditService.getAuditPages).toHaveBeenCalledWith(mockTaskData.taskId, 1000);
      expect(mockSeoAuditService.getAuditResources).toHaveBeenCalledWith(mockTaskData.taskId, 1000);
    });
    
    it('should return null if task is not found', async () => {
      // Mock task not found
      (taskManager.getTask as jest.Mock).mockReturnValueOnce(null);
      
      const report = await reportGenerator.generateReport(mockTaskId);
      
      expect(report).toBeNull();
      expect(mockSeoAuditService.getAuditStatus).not.toHaveBeenCalled();
    });
    
    it('should return null if task is not completed', async () => {
      // Mock task not completed
      (taskManager.getTask as jest.Mock).mockReturnValueOnce({
        ...mockTaskData,
        status: 'pending'
      });
      
      const report = await reportGenerator.generateReport(mockTaskId);
      
      expect(report).toBeNull();
      expect(mockSeoAuditService.getAuditStatus).not.toHaveBeenCalled();
    });
    
    it('should handle errors during report generation', async () => {
      // Mock API error
      mockSeoAuditService.getAuditStatus = jest.fn().mockRejectedValue(new Error('API error'));
      
      const report = await reportGenerator.generateReport(mockTaskId);
      
      expect(report).toBeNull();
    });
  });
  
  describe('calculateResourceStats', () => {
    it('should correctly calculate resource statistics', () => {
      // Use the private method directly to test it in isolation
      const stats = reportGenerator['calculateResourceStats'](mockResourcesData);
      
      expect(stats.total).toBe(2);
      expect(stats.broken).toBe(1);
      expect(stats.totalSize).toBe(10000);
      expect(stats.averageSize).toBe(5000);
      expect(stats.byType.styles).toBe(1);
      expect(stats.byType.scripts).toBe(1);
    });
    
    it('should handle empty resource data', () => {
      const stats = reportGenerator['calculateResourceStats']([]);
      
      expect(stats.total).toBe(0);
      expect(stats.broken).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averageSize).toBe(0);
    });
  });
  
  describe('extractIssues', () => {
    it('should extract issues from pages data', () => {
      const pagesWithIssues = [
        {
          url: 'https://example.com/page1',
          checks: [
            {
              check_id: 'broken_link',
              severity: 'high',
              title: 'Broken Link Found',
              description: 'Page contains broken links',
              recommendation: 'Fix the broken links'
            }
          ]
        }
      ];
      
      const issues = reportGenerator['extractIssues'](pagesWithIssues, [], [], [], []);
      
      expect(issues.high.length).toBe(1);
      expect(issues.high[0].type).toBe('broken_link');
      expect(issues.high[0].affectedUrls).toEqual(['https://example.com/page1']);
    });
    
    it('should extract issues from resources data', () => {
      const resourcesWithIssues = [
        {
          source_url: 'https://example.com/page1',
          status_code: 404,
          resource_errors: ['Not found']
        }
      ];
      
      const issues = reportGenerator['extractIssues']([], resourcesWithIssues, [], [], []);
      
      expect(issues.high.length).toBe(1);
      expect(issues.high[0].type).toBe('broken_resources');
      expect(issues.high[0].affectedUrls).toEqual(['https://example.com/page1']);
    });
  });
  
  describe('extractPerformanceMetrics', () => {
    it('should extract performance metrics from pages data', () => {
      const performance = reportGenerator['extractPerformanceMetrics'](mockPagesData, []);
      
      expect(performance.pageSpeedScores['https://example.com/']).toBe(90); // 1-3s: good (90)
      expect(performance.loadTimes['https://example.com/'].timeToInteractive).toBe(1500);
    });
    
    it('should calculate mobile optimization score correctly', () => {
      const performance = reportGenerator['extractPerformanceMetrics'](mockPagesData, []);
      
      // 5 out of 6 mobile optimizations are true = 83%
      expect(performance.mobileOptimization.score).toBe(83);
    });
    
    it('should handle empty data', () => {
      const performance = reportGenerator['extractPerformanceMetrics']([], []);
      
      expect(Object.keys(performance.pageSpeedScores).length).toBe(0);
      expect(performance.mobileOptimization.score).toBe(0);
    });
  });
  
  describe('getResourceType', () => {
    it('should identify resource types correctly', () => {
      expect(reportGenerator['getResourceType']('script')).toBe('script');
      expect(reportGenerator['getResourceType']('javascript')).toBe('script');
      expect(reportGenerator['getResourceType']('css')).toBe('style');
      expect(reportGenerator['getResourceType']('stylesheet')).toBe('style');
      expect(reportGenerator['getResourceType']('image')).toBe('image');
      expect(reportGenerator['getResourceType']('img')).toBe('image');
      expect(reportGenerator['getResourceType']('font')).toBe('font');
      expect(reportGenerator['getResourceType']('unknown')).toBe('other');
      expect(reportGenerator['getResourceType']('')).toBe('other');
    });
  });
  
  describe('getIssueCategory', () => {
    it('should categorize issues correctly', () => {
      expect(reportGenerator['getIssueCategory']('page_load_speed')).toBe('performance');
      expect(reportGenerator['getIssueCategory']('mobile_viewport')).toBe('mobile');
      expect(reportGenerator['getIssueCategory']('content_duplicate')).toBe('content');
      expect(reportGenerator['getIssueCategory']('ssl_certificate')).toBe('security');
      expect(reportGenerator['getIssueCategory']('server_response')).toBe('technical');
      expect(reportGenerator['getIssueCategory']('unknown')).toBe('other');
      expect(reportGenerator['getIssueCategory']('')).toBe('other');
    });
  });
  
  describe('getIssuePriority', () => {
    it('should assign correct priority based on severity', () => {
      expect(reportGenerator['getIssuePriority']('critical')).toBe(1);
      expect(reportGenerator['getIssuePriority']('high')).toBe(2);
      expect(reportGenerator['getIssuePriority']('medium')).toBe(3);
      expect(reportGenerator['getIssuePriority']('low')).toBe(4);
      expect(reportGenerator['getIssuePriority']('info')).toBe(5);
    });
  });
  
  describe('getIssueEffort', () => {
    it('should determine effort level correctly', () => {
      expect(reportGenerator['getIssueEffort']('quick fix')).toBe('low');
      expect(reportGenerator['getIssueEffort']('easy')).toBe('low');
      expect(reportGenerator['getIssueEffort']('moderate')).toBe('medium');
      expect(reportGenerator['getIssueEffort']('complex')).toBe('high');
      expect(reportGenerator['getIssueEffort']('difficult')).toBe('high');
      expect(reportGenerator['getIssueEffort']()).toBe('medium'); // Default
    });
  });
  
  describe('arraysHaveOverlap', () => {
    it('should detect overlapping arrays', () => {
      expect(reportGenerator['arraysHaveOverlap']([1, 2, 3], [3, 4, 5])).toBe(true);
      expect(reportGenerator['arraysHaveOverlap'](['a', 'b'], ['b', 'c'])).toBe(true);
      expect(reportGenerator['arraysHaveOverlap']([1, 2], [3, 4])).toBe(false);
      expect(reportGenerator['arraysHaveOverlap']([], [1, 2])).toBe(false);
      expect(reportGenerator['arraysHaveOverlap']([], [])).toBe(false);
    });
  });
}); 
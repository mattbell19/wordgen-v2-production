// Use ESM imports for Jest
import { SeoAuditService, SeoAuditStatus } from '../seo-audit.service';
import { DataForSEOClient } from '../client';

// Mock the DataForSEOClient
jest.mock('../client');

// Extend the default timeout
jest.setTimeout(15000); // 15 seconds

describe('SeoAuditService', () => {
  let service;
  let mockClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mocked client instance
    mockClient = new DataForSEOClient();
    
    // Create service instance and inject mocked client
    service = new SeoAuditService();
    service.client = mockClient;
  });
  
  describe('createAuditTask', () => {
    it('should create an audit task successfully', async () => {
      // Mock successful task creation
      const taskResponse = {
        status_code: 20000,
        status_message: 'Ok',
        tasks: [
          {
            id: 'dfs-task-123',
            status_code: 20000,
            status_message: 'Ok',
            result: []
          }
        ]
      };
      
      mockClient.postOnPageTask.mockResolvedValue(taskResponse);
      
      // Test parameters
      const target = 'https://example.com';
      const userId = 123;
      const options = {
        max_crawl_pages: 200,
        load_resources: true,
        enable_javascript: true
      };
      
      // Execute the method
      const result = await service.createAuditTask(target, userId, options);
      
      // Check the result
      expect(result).toEqual(expect.objectContaining({
        target: 'https://example.com',
        status: SeoAuditStatus.PENDING,
        userId: 123,
        maxCrawlPages: 200,
        taskId: 'dfs-task-123',
        options: expect.objectContaining({
          loadResources: true,
          enableJavaScript: true
        })
      }));
      
      // Verify correct client call
      expect(mockClient.postOnPageTask).toHaveBeenCalledWith(expect.objectContaining({
        target: 'https://example.com',
        max_crawl_pages: 200,
        load_resources: true,
        enable_javascript: true
      }));
    });
    
    it('should handle errors and rethrow them', async () => {
      // Mock error
      const error = new Error('API error');
      mockClient.postOnPageTask.mockRejectedValue(error);
      
      // Execute and expect error
      await expect(service.createAuditTask('https://example.com', 123, {}))
        .rejects.toThrow('API error');
      
      // Ensure the client was called
      expect(mockClient.postOnPageTask).toHaveBeenCalled();
    });
    
    it('should handle task creation failure from the API', async () => {
      // Mock error response from API
      const errorResponse = {
        status_code: 20000,
        status_message: 'Ok',
        tasks: [
          {
            id: 'dfs-task-123',
            status_code: 40400,
            status_message: 'Invalid task parameters',
            result: []
          }
        ]
      };
      
      mockClient.postOnPageTask.mockResolvedValue(errorResponse);
      
      // Execute and expect error
      await expect(service.createAuditTask('https://example.com', 123, {}))
        .rejects.toThrow('Failed to create audit task: Invalid task parameters');
    });
  });
  
  describe('getAuditStatus', () => {
    it('should return pending status when crawl progress is 0', async () => {
      // Mock response
      const summaryResponse = {
        status_code: 20000,
        tasks: [
          {
            status_code: 20000,
            result: [
              {
                crawl_progress: 0,
                onpage_score: 0,
                total_pages: 100,
                pages_crawled: 0
              }
            ]
          }
        ]
      };
      
      mockClient.getOnPageSummary.mockResolvedValue(summaryResponse);
      
      // Execute the method
      const result = await service.getAuditStatus('dfs-task-123');
      
      // Check the result
      expect(result).toEqual({
        status: SeoAuditStatus.PENDING,
        progress: 0,
        summary: expect.objectContaining({
          onPageScore: 0,
          crawlProgress: 0,
          pagesCount: 100,
          pagesCrawled: 0
        })
      });
    });
    
    it('should return in_progress status when crawl progress is between 1 and 99', async () => {
      // Mock response
      const summaryResponse = {
        status_code: 20000,
        tasks: [
          {
            status_code: 20000,
            result: [
              {
                crawl_progress: 50,
                onpage_score: 75,
                total_pages: 100,
                pages_crawled: 50
              }
            ]
          }
        ]
      };
      
      mockClient.getOnPageSummary.mockResolvedValue(summaryResponse);
      
      // Execute the method
      const result = await service.getAuditStatus('dfs-task-123');
      
      // Check the result
      expect(result).toEqual({
        status: SeoAuditStatus.IN_PROGRESS,
        progress: 50,
        summary: expect.objectContaining({
          onPageScore: 75,
          crawlProgress: 50,
          pagesCount: 100,
          pagesCrawled: 50
        })
      });
    });
    
    it('should return completed status when crawl progress is 100', async () => {
      // Mock response
      const summaryResponse = {
        status_code: 20000,
        tasks: [
          {
            status_code: 20000,
            result: [
              {
                crawl_progress: 100,
                onpage_score: 85,
                total_pages: 100,
                pages_crawled: 100,
                checks: {
                  total: 500,
                  failed: 50,
                  issues: {
                    critical: { count: 5, details: [] },
                    high: { count: 10, details: [] },
                    medium: { count: 20, details: [] },
                    low: { count: 15, details: [] }
                  }
                }
              }
            ]
          }
        ]
      };
      
      mockClient.getOnPageSummary.mockResolvedValue(summaryResponse);
      
      // Execute the method
      const result = await service.getAuditStatus('dfs-task-123');
      
      // Check the result
      expect(result).toEqual({
        status: SeoAuditStatus.COMPLETED,
        progress: 100,
        summary: expect.objectContaining({
          onPageScore: 85,
          crawlProgress: 100,
          pagesCount: 100,
          pagesCrawled: 100,
          issuesSummary: {
            critical: 5,
            high: 10,
            medium: 20,
            low: 15,
            noIssue: 0
          }
        })
      });
    });
    
    it('should handle failed tasks', async () => {
      // Mock error response
      const errorResponse = {
        status_code: 20000,
        tasks: [
          {
            status_code: 40400,
            result: []
          }
        ]
      };
      
      mockClient.getOnPageSummary.mockResolvedValue(errorResponse);
      
      // Execute and check result
      const result = await service.getAuditStatus('dfs-task-123');
      expect(result.status).toBe(SeoAuditStatus.FAILED);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      mockClient.getOnPageSummary.mockRejectedValue(new Error('API connection error'));
      
      // Execute and check result
      const result = await service.getAuditStatus('dfs-task-123');
      expect(result.status).toBe(SeoAuditStatus.FAILED);
    });
  });
  
  describe('getAuditPages', () => {
    it('should return pages data', async () => {
      // Mock response
      const pagesResponse = {
        status_code: 20000,
        tasks: [
          {
            status_code: 20000,
            result: [
              { url: 'https://example.com', checks: { failed: 2 } },
              { url: 'https://example.com/page1', checks: { failed: 1 } }
            ]
          }
        ]
      };
      
      mockClient.getOnPagePages.mockResolvedValue(pagesResponse);
      
      // Execute the method
      const result = await service.getAuditPages('dfs-task-123');
      
      // Check the result
      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('https://example.com');
      
      // Verify client call
      expect(mockClient.getOnPagePages).toHaveBeenCalledWith('dfs-task-123', 100, 0);
    });
    
    it('should handle errors', async () => {
      // Mock error
      mockClient.getOnPagePages.mockRejectedValue(new Error('API error'));
      
      // Execute and expect error
      await expect(service.getAuditPages('dfs-task-123'))
        .rejects.toThrow('API error');
    });
  });
  
  // Additional tests for other methods
  describe('cancelAuditTask', () => {
    it('should cancel an audit task successfully', async () => {
      // Mock successful task cancellation
      const cancelResponse = {
        status_code: 20000,
        tasks: [
          {
            id: 'dfs-task-123',
            status_code: 20000,
            status_message: 'Ok',
            result: null
          }
        ]
      };
      
      mockClient.forceStopOnPageTask.mockResolvedValue(cancelResponse);
      
      // Execute the method
      const result = await service.cancelAuditTask('dfs-task-123');
      
      // Check the result
      expect(result).toBe(true);
      
      // Verify the client was called with the correct task ID
      expect(mockClient.forceStopOnPageTask).toHaveBeenCalledWith('dfs-task-123');
    });
    
    it('should handle unsuccessful task cancellation', async () => {
      // Mock unsuccessful task cancellation response
      const errorResponse = {
        status_code: 20000,
        tasks: [
          {
            id: 'dfs-task-123',
            status_code: 40400,
            status_message: 'Task not found',
            result: null
          }
        ]
      };
      
      mockClient.forceStopOnPageTask.mockResolvedValue(errorResponse);
      
      // Execute the method
      const result = await service.cancelAuditTask('dfs-task-123');
      
      // Check the result
      expect(result).toBe(false);
    });
    
    it('should handle errors during task cancellation', async () => {
      // Mock an error
      mockClient.forceStopOnPageTask.mockRejectedValue(new Error('Failed to cancel task'));
      
      // Execute the method and check it catches the error and returns false
      const result = await service.cancelAuditTask('dfs-task-123');
      expect(result).toBe(false);
    });
  });
}); 
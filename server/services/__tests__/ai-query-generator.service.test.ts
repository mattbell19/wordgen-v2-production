import { AIQueryGeneratorService, type QueryGenerationRequest, type GeneratedQuery } from '../ai-query-generator.service';
import { db } from '../../db/index';
import { brandMonitoring } from '../../../db/schema';
import { logger } from '../../lib/logger';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Mock dependencies
jest.mock('../../db/index', () => ({
  db: {
    select: jest.fn(),
  }
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn()
    }
  }));
});

describe('AIQueryGeneratorService', () => {
  let service: AIQueryGeneratorService;
  let mockDb: any;
  let mockOpenAI: jest.MockedClass<typeof OpenAI>;
  let mockAnthropic: jest.MockedClass<typeof Anthropic>;

  // Sample generated queries for testing
  const sampleGeneratedQueries: GeneratedQuery[] = [
    {
      text: 'What is TestBrand and how does it work?',
      category: 'direct',
      priority: 90,
      estimatedRelevance: 95,
      explanation: 'Direct brand inquiry'
    },
    {
      text: 'TestBrand vs CompetitorA comparison',
      category: 'comparative',
      priority: 85,
      estimatedRelevance: 90,
      explanation: 'Competitive comparison'
    },
    {
      text: 'Best CRM tools for small businesses',
      category: 'use_case',
      priority: 70,
      estimatedRelevance: 75,
      explanation: 'Use case inquiry'
    },
    {
      text: 'How to improve customer relationship management?',
      category: 'problem_solving',
      priority: 65,
      estimatedRelevance: 70,
      explanation: 'Problem-solving query'
    },
    {
      text: 'Top SaaS companies in 2024',
      category: 'industry_specific',
      priority: 60,
      estimatedRelevance: 65,
      explanation: 'Industry overview'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = db as any;
    
    // Set up environment variables for testing
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

    // Get mocked constructors
    mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
    mockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;
    
    service = new AIQueryGeneratorService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateQueries', () => {
    it('should generate queries successfully with OpenAI', async () => {
      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        industry: 'Technology',
        description: 'A leading CRM platform',
        count: 5
      };

      // Setup the service with direct mocking since constructor creates clients
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(sampleGeneratedQueries)
          }
        }]
      });

      // Override the service's openai property directly
      (service as any).openai = {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      };

      const result = await service.generateQueries(request);

      expect(result.queries).toHaveLength(5);
      expect(result.queries[0]).toHaveProperty('text');
      expect(result.queries[0]).toHaveProperty('category');
      expect(result.queries[0]).toHaveProperty('priority');
      expect(result.queries[0]).toHaveProperty('estimatedRelevance');
      expect(result.metadata.totalGenerated).toBe(5);
      expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should generate queries successfully with Anthropic when OpenAI is not available', async () => {
      // Remove OpenAI API key
      delete process.env.OPENAI_API_KEY;
      
      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        count: 3
      };

      // Mock Anthropic response
      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [{
              type: 'text',
              text: JSON.stringify(sampleGeneratedQueries.slice(0, 3))
            }]
          })
        }
      };

      mockAnthropic.mockImplementation(() => mockAnthropicInstance as any);

      // Create new service instance without OpenAI
      service = new AIQueryGeneratorService();
      const result = await service.generateQueries(request);

      expect(result.queries).toHaveLength(3);
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalled();
    });

    it('should throw error when no AI clients are available', async () => {
      // Remove all API keys
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      service = new AIQueryGeneratorService();

      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        count: 5
      };

      await expect(service.generateQueries(request)).rejects.toThrow(
        'No AI clients available for query generation'
      );
    });

    it('should validate request parameters', async () => {
      // Test empty brand name
      await expect(service.generateQueries({ brandName: '' }))
        .rejects.toThrow('Brand name is required');

      // Test invalid count (too low)
      await expect(service.generateQueries({ brandName: 'Test', count: 0 }))
        .rejects.toThrow('Count must be between 1 and 100');

      // Test invalid count (too high)  
      await expect(service.generateQueries({ brandName: 'Test', count: 150 }))
        .rejects.toThrow('Count must be between 1 and 100');

      // Test brand name too long
      await expect(service.generateQueries({ brandName: 'A'.repeat(101) }))
        .rejects.toThrow('Brand name is too long');
    });

    it('should handle duplicate queries correctly', async () => {
      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        existingQueries: ['What is TestBrand and how does it work?', 'TestBrand vs CompetitorA comparison'],
        count: 5
      };

      const queriesWithDuplicates = [
        ...sampleGeneratedQueries,
        {
          text: 'What is TestBrand and how does it work?', // Exact duplicate
          category: 'direct' as const,
          priority: 80,
          estimatedRelevance: 85,
          explanation: 'Duplicate query'
        }
      ];

      // Setup the service with direct mocking
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(queriesWithDuplicates)
          }
        }]
      });

      (service as any).openai = {
        chat: {
          completions: {
            create: mockCreate
          }
        }
      };

      const result = await service.generateQueries(request);

      // Should remove duplicates - the exact duplicate should not appear
      const duplicateQuery = result.queries.find(q => q.text === 'What is TestBrand and how does it work?');
      expect(duplicateQuery).toBeUndefined();
    });

    it('should ensure category balance', async () => {
      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        count: 10
      };

      // Mock response with imbalanced categories (all direct)
      const imbalancedQueries = Array.from({ length: 15 }, (_, i) => ({
        text: `Direct query ${i + 1}`,
        category: 'direct' as const,
        priority: 70,
        estimatedRelevance: 75,
        explanation: 'Direct query'
      }));

      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify(imbalancedQueries)
                }
              }]
            })
          }
        }
      };

      mockOpenAI.mockImplementation(() => mockOpenAIInstance as any);

      const result = await service.generateQueries(request);

      expect(result.queries).toHaveLength(10);
      // Should balance categories even with imbalanced input
      const categories = result.queries.map(q => q.category);
      const uniqueCategories = new Set(categories);
      expect(uniqueCategories.size).toBeGreaterThan(1);
    });
  });

  describe('generateQueriesForBrand', () => {
    it('should generate queries for existing brand', async () => {
      const brandId = 1;
      const mockBrand = {
        id: brandId,
        userId: 1,
        brandName: 'TestBrand',
        description: 'Test description',
        trackingQueries: ['existing query'],
        competitors: ['CompetitorA', 'CompetitorB'],
        monitoringFrequency: 'daily',
        isActive: true,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockBrand])
        })
      });

      // Mock OpenAI response
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify(sampleGeneratedQueries)
                }
              }]
            })
          }
        }
      };

      mockOpenAI.mockImplementation(() => mockOpenAIInstance as any);

      const result = await service.generateQueriesForBrand(brandId, 5);

      expect(result.queries).toHaveLength(5);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should throw error for non-existent brand', async () => {
      const brandId = 999;

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      await expect(service.generateQueriesForBrand(brandId))
        .rejects.toThrow(`Brand monitoring configuration not found: ${brandId}`);
    });
  });

  describe('query validation and normalization', () => {
    it('should validate and normalize queries correctly', async () => {
      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        count: 3
      };

      const invalidQueries = [
        {}, // Missing text
        { text: '' }, // Empty text
        { text: 'Valid query', category: 'invalid_category' }, // Invalid category
        { text: 'A'.repeat(600), category: 'direct' }, // Too long
        { text: 'Valid query with undefined value', category: 'direct', priority: 'undefined' },
      ];

      const validQuery = {
        text: 'Valid test query',
        category: 'direct',
        priority: 85,
        estimatedRelevance: 90,
        explanation: 'Test explanation'
      };

      const mixedQueries = [...invalidQueries, validQuery];

      // Mock OpenAI response with mixed valid/invalid queries
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify(mixedQueries)
                }
              }]
            })
          }
        }
      };

      mockOpenAI.mockImplementation(() => mockOpenAIInstance as any);

      const result = await service.generateQueries(request);

      // Should only include valid queries
      expect(result.queries).toHaveLength(1);
      expect(result.queries[0].text).toBe('Valid test query');
    });

    it('should throw error when no valid queries are generated', async () => {
      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        count: 3
      };

      // Mock response with only invalid queries
      const invalidQueries = [
        {}, // Missing text
        { text: '' }, // Empty text
        { text: 'Invalid', category: 'invalid' }, // Invalid category
      ];

      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify(invalidQueries)
                }
              }]
            })
          }
        }
      };

      mockOpenAI.mockImplementation(() => mockOpenAIInstance as any);

      await expect(service.generateQueries(request)).rejects.toThrow('No valid queries generated');
    });
  });

  describe('error handling', () => {
    it('should handle OpenAI API errors', async () => {
      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        count: 5
      };

      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('OpenAI API Error'))
          }
        }
      };

      mockOpenAI.mockImplementation(() => mockOpenAIInstance as any);

      await expect(service.generateQueries(request)).rejects.toThrow('OpenAI generation failed');
    });

    it('should handle Anthropic API errors', async () => {
      delete process.env.OPENAI_API_KEY; // Force use of Anthropic

      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        count: 5
      };

      const mockAnthropicInstance = {
        messages: {
          create: jest.fn().mockRejectedValue(new Error('Anthropic API Error'))
        }
      };

      mockAnthropic.mockImplementation(() => mockAnthropicInstance as any);

      service = new AIQueryGeneratorService();

      await expect(service.generateQueries(request)).rejects.toThrow('Anthropic generation failed');
    });

    it('should handle invalid JSON responses', async () => {
      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        count: 5
      };

      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'Invalid JSON response'
                }
              }]
            })
          }
        }
      };

      mockOpenAI.mockImplementation(() => mockOpenAIInstance as any);

      await expect(service.generateQueries(request)).rejects.toThrow();
    });

    it('should handle empty responses from AI', async () => {
      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        count: 5
      };

      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: null
                }
              }]
            })
          }
        }
      };

      mockOpenAI.mockImplementation(() => mockOpenAIInstance as any);

      await expect(service.generateQueries(request)).rejects.toThrow('No response from OpenAI');
    });
  });

  describe('utility methods', () => {
    it('should return query categories', () => {
      const categories = service.getQueryCategories();

      expect(categories).toHaveLength(5);
      expect(categories[0]).toHaveProperty('id');
      expect(categories[0]).toHaveProperty('name');
      expect(categories[0]).toHaveProperty('description');
      expect(categories[0]).toHaveProperty('examples');
      expect(categories[0].examples).toBeInstanceOf(Array);
    });

    it('should suggest query improvements', async () => {
      const suggestions = await service.suggestQueryImprovements(1);

      expect(suggestions).toHaveProperty('suggestions');
      expect(suggestions).toHaveProperty('missingCategories');
      expect(suggestions).toHaveProperty('lowPerformingQueries');
      expect(suggestions.suggestions).toBeInstanceOf(Array);
    });
  });

  describe('cost calculation', () => {
    it('should calculate estimated cost correctly', async () => {
      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        count: 10
      };

      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify(sampleGeneratedQueries.slice(0, 10))
                }
              }]
            })
          }
        }
      };

      mockOpenAI.mockImplementation(() => mockOpenAIInstance as any);

      const result = await service.generateQueries(request);

      expect(result.metadata.estimatedCost).toBeGreaterThan(0);
      expect(typeof result.metadata.estimatedCost).toBe('number');
    });
  });

  describe('performance', () => {
    it('should complete query generation within reasonable time', async () => {
      const request: QueryGenerationRequest = {
        brandName: 'TestBrand',
        count: 25
      };

      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify(Array.from({ length: 25 }, (_, i) => ({
                    text: `Query ${i + 1}`,
                    category: 'direct',
                    priority: 70,
                    estimatedRelevance: 75,
                    explanation: 'Test query'
                  })))
                }
              }]
            })
          }
        }
      };

      mockOpenAI.mockImplementation(() => mockOpenAIInstance as any);

      const startTime = Date.now();
      const result = await service.generateQueries(request);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
      expect(result.metadata.processingTimeMs).toBeLessThan(5000);
    });
  });
});
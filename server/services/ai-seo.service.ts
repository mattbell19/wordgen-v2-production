import axios, { AxiosError } from 'axios';

export interface AISeORequest {
  keywords: string[];
  siteUrl?: string;
  targetWordCount: number;
  tone: string;
  industry: string;
  userId: number;
  includeInternalLinks: boolean;
  includeExternalLinks: boolean;
  customInstructions?: string;
}

export interface AISeOResponse {
  success: boolean;
  message: string;
  data?: any;
  taskId?: string;
  status?: string;
  article?: any;
  analytics?: any;
  processingTime?: number;
  agentLogs?: string[];
}

export interface TaskStatus {
  taskId: string;
  status: string;
  progress: number;
  currentAgent?: string;
  createdAt: string;
  updatedAt: string;
  result?: AISeOResponse;
  error?: string;
}

export interface UserTasks {
  tasks: TaskStatus[];
  total: number;
}

class AISeOService {
  private baseUrl: string;
  private timeout: number;
  private isServiceAvailable: boolean = false;

  constructor() {
    this.baseUrl = process.env.AI_SEO_SERVICE_URL || 'https://wordgen-ai-seo-agent.herokuapp.com';
    this.timeout = 60000; // 60 seconds
    this.checkServiceAvailability();
  }

  /**
   * Check if the AI SEO service is available
   */
  private async checkServiceAvailability(): Promise<void> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000,
        headers: { 'User-Agent': 'WordGen-v2' }
      });
      this.isServiceAvailable = response.status === 200;
    } catch (error) {
      console.warn('[AI SEO Service] External service not available:', this.baseUrl);
      this.isServiceAvailable = false;
    }
  }

  /**
   * Throw service unavailable error
   */
  private throwServiceUnavailable(): never {
    const error = new Error('AI SEO agent service is currently unavailable. This feature is under development.');
    (error as any).status = 503;
    throw error;
  }

  /**
   * Generate SEO-optimized article using AI agents
   */
  async generateArticle(request: AISeORequest): Promise<AISeOResponse> {
    // Check service availability
    if (!this.isServiceAvailable) {
      await this.checkServiceAvailability();
      if (!this.isServiceAvailable) {
        this.throwServiceUnavailable();
      }
    }

    try {
      console.log('[AI SEO Service] Sending request to:', `${this.baseUrl}/api/v1/generate-article`);

      const response = await axios.post(
        `${this.baseUrl}/api/v1/generate-article`,
        {
          keywords: request.keywords,
          site_url: request.siteUrl,
          target_word_count: request.targetWordCount,
          tone: request.tone,
          industry: request.industry,
          user_id: request.userId,
          include_internal_links: request.includeInternalLinks,
          include_external_links: request.includeExternalLinks,
          custom_instructions: request.customInstructions
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WordGen-v2'
          }
        }
      );

      return response.data;

    } catch (error) {
      console.error('[AI SEO Service] Generate article error:', error);
      this.handleError(error);
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    if (!this.isServiceAvailable) {
      this.throwServiceUnavailable();
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/task/${taskId}`,
        {
          timeout: this.timeout,
          headers: {
            'User-Agent': 'WordGen-v2'
          }
        }
      );

      return response.data;

    } catch (error) {
      console.error('[AI SEO Service] Get task status error:', error);
      this.handleError(error);
    }
  }

  /**
   * Cancel task
   */
  async cancelTask(taskId: string): Promise<void> {
    if (!this.isServiceAvailable) {
      this.throwServiceUnavailable();
    }

    try {
      await axios.delete(
        `${this.baseUrl}/api/v1/task/${taskId}`,
        {
          timeout: this.timeout,
          headers: {
            'User-Agent': 'WordGen-v2'
          }
        }
      );

    } catch (error) {
      console.error('[AI SEO Service] Cancel task error:', error);
      this.handleError(error);
    }
  }

  /**
   * Get user tasks
   */
  async getUserTasks(userId: number, limit: number = 10): Promise<UserTasks> {
    // Return empty task list instead of failing
    return {
      tasks: [],
      total: 0
    };
  }

  /**
   * Test agents (development only)
   */
  async testAgents(request: AISeORequest): Promise<any> {
    if (!this.isServiceAvailable) {
      this.throwServiceUnavailable();
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/test-agents`,
        {
          keywords: request.keywords,
          site_url: request.siteUrl,
          target_word_count: request.targetWordCount,
          tone: request.tone,
          industry: request.industry,
          user_id: request.userId,
          include_internal_links: request.includeInternalLinks,
          include_external_links: request.includeExternalLinks,
          custom_instructions: request.customInstructions
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WordGen-v2'
          }
        }
      );

      return response.data;

    } catch (error) {
      console.error('[AI SEO Service] Test agents error:', error);
      this.handleError(error);
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/health`,
        {
          timeout: 5000,
          headers: {
            'User-Agent': 'WordGen-v2'
          }
        }
      );

      const isHealthy = response.status === 200 && response.data.status === 'healthy';
      this.isServiceAvailable = isHealthy;
      return isHealthy;

    } catch (error) {
      console.error('[AI SEO Service] Health check failed:', error);
      this.isServiceAvailable = false;
      return false;
    }
  }

  /**
   * Handle service errors
   */
  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        this.isServiceAvailable = false;
        this.throwServiceUnavailable();
      }

      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as any;
        
        const serviceError = new Error(data?.message || data?.detail || 'AI SEO service error');
        (serviceError as any).status = status;
        (serviceError as any).data = data;
        throw serviceError;
      }

      if (axiosError.request) {
        this.isServiceAvailable = false;
        this.throwServiceUnavailable();
      }
    }

    throw error;
  }
}

// Export singleton instance
export const aiSeoService = new AISeOService();

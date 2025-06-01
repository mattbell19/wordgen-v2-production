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

  constructor() {
    this.baseUrl = process.env.AI_SEO_SERVICE_URL || 'https://wordgen-ai-seo-agent.herokuapp.com';
    this.timeout = 60000; // 60 seconds
  }

  /**
   * Generate SEO-optimized article using AI agents
   */
  async generateArticle(request: AISeORequest): Promise<AISeOResponse> {
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
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v1/tasks/user/${userId}`,
        {
          params: { limit },
          timeout: this.timeout,
          headers: {
            'User-Agent': 'WordGen-v2'
          }
        }
      );

      return response.data;

    } catch (error) {
      console.error('[AI SEO Service] Get user tasks error:', error);
      this.handleError(error);
    }
  }

  /**
   * Test agents (development only)
   */
  async testAgents(request: AISeORequest): Promise<any> {
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

      return response.status === 200 && response.data.status === 'healthy';

    } catch (error) {
      console.error('[AI SEO Service] Health check failed:', error);
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
        const serviceError = new Error('AI SEO service is unavailable');
        (serviceError as any).status = 503;
        throw serviceError;
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
        const serviceError = new Error('AI SEO service did not respond');
        (serviceError as any).status = 503;
        throw serviceError;
      }
    }

    // Generic error
    const serviceError = new Error('AI SEO service error');
    (serviceError as any).status = 500;
    throw serviceError;
  }
}

export const aiSeoService = new AISeOService();

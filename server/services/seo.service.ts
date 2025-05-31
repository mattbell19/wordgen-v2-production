// Temporary mock SEO service to replace DataForSEO
export const seoService = {
  async createAuditTask(domain: string, path: string) {
    return {
      id: `mock-${Date.now()}`,
      status: 'pending'
    };
  },

  async checkReadyTasks() {
    return [];
  },

  async getTaskStatus(taskId: string) {
    return {
      ready: false,
      status: 'processing'
    };
  },

  async getTaskSummary(taskId: string) {
    return {
      total_pages: 0,
      onpage_score: 0,
      issues: {
        critical: 0,
        warnings: 0,
        passed: 0
      }
    };
  }
}; 
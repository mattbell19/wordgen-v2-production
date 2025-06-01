import { http, HttpResponse } from 'msw';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest extends LoginRequest {}

interface SeoAuditRequest {
  domain: string;
}

interface KeywordResearchRequest {
  keyword: string;
}

export const handlers = [
  // MSW handlers disabled - using real authentication
  // Auth handlers removed to prevent interference with real auth system

  // Article handlers
  http.get('/api/articles', () => {
    return HttpResponse.json({
      ok: true,
      articles: [
        {
          id: 1,
          title: 'Test Article',
          content: 'Test content',
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }),

  // SEO handlers
  http.post('/api/seo/audit', async ({ request }) => {
    const { domain } = await request.json() as SeoAuditRequest;
    
    return HttpResponse.json({
      ok: true,
      taskId: 'test-task-id',
    });
  }),

  // Keyword handlers
  http.post('/api/keywords/research', async ({ request }) => {
    const { keyword } = await request.json() as KeywordResearchRequest;
    
    return HttpResponse.json({
      ok: true,
      results: [
        {
          keyword,
          searchVolume: 1000,
          difficulty: 50,
          cpc: 1.5,
        },
      ],
    });
  }),
]; 
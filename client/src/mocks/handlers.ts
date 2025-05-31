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
  // Auth handlers
  http.post('/api/login', async ({ request }) => {
    const { email, password } = await request.json() as LoginRequest;
    
    if (email === 'test@example.com' && password === 'password') {
      return HttpResponse.json({
        ok: true,
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          isAdmin: false,
        },
      });
    }
    
    return new HttpResponse(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
  }),

  http.post('/api/register', async ({ request }) => {
    const { email, password } = await request.json() as RegisterRequest;
    
    return HttpResponse.json({
      ok: true,
      user: {
        id: 1,
        email,
        name: email.split('@')[0],
        isAdmin: false,
      },
    });
  }),

  http.get('/api/user', () => {
    return HttpResponse.json({
      ok: true,
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isAdmin: false,
      },
    });
  }),

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
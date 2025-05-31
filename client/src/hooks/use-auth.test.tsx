import { renderHook, act } from '@testing-library/react';
import { useAuth } from './use-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    queryClient.clear();
    mockFetch.mockClear();
    // Mock successful user fetch by default
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/user') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            user: {
              id: 1,
              email: 'test@example.com',
              name: 'Test User',
              isAdmin: false,
            }
          })
        });
      }
      return Promise.reject(new Error('Unmocked fetch call'));
    });
  });

  it('should login successfully with correct credentials', async () => {
    // Mock successful login
    mockFetch.mockImplementation((url: string, options: RequestInit) => {
      if (url === '/api/login') {
        const body = JSON.parse(options.body as string);
        if (body.email === 'test@example.com' && body.password === 'password') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              ok: true,
              user: {
                id: 1,
                email: 'test@example.com',
                name: 'Test User',
                isAdmin: false,
              }
            })
          });
        }
      }
      // Fall back to default mock
      return mockFetch.getMockImplementation()!(url, options);
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const response = await result.current.login({
        email: 'test@example.com',
        password: 'password',
      });

      expect(response.ok).toBe(true);
      expect(response.user).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        isAdmin: false,
      });
    });
  });

  it('should fail login with incorrect credentials', async () => {
    // Mock failed login
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/login') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({
            ok: false,
            message: 'Invalid credentials'
          })
        });
      }
      // Fall back to default mock
      return mockFetch.getMockImplementation()!(url);
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      try {
        await result.current.login({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  it('should register a new user successfully', async () => {
    // Mock successful registration
    mockFetch.mockImplementation((url: string, options: RequestInit) => {
      if (url === '/api/register') {
        const body = JSON.parse(options.body as string);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            user: {
              id: 1,
              email: body.email,
              name: body.email.split('@')[0],
              isAdmin: false,
            }
          })
        });
      }
      // Fall back to default mock
      return mockFetch.getMockImplementation()!(url, options);
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const response = await result.current.register({
        email: 'newuser@example.com',
        password: 'password123',
      });

      expect(response.ok).toBe(true);
      expect(response.user).toEqual({
        id: 1,
        email: 'newuser@example.com',
        name: 'newuser',
        isAdmin: false,
      });
    });
  });

  it('should fetch user data when authenticated', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial user fetch
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.user).toEqual({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      isAdmin: false,
    });
  });
}); 
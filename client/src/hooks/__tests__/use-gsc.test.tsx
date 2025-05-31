import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGSC } from '../use-gsc';

// Mock fetch
global.fetch = jest.fn();

// Mock window.open
global.window.open = jest.fn();

// Mock toast provider
jest.mock('@/components/ui/toast-provider', () => ({
  useToastProvider: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showInfo: jest.fn()
  })
}));

describe('useGSC Hook', () => {
  let queryClient;
  let wrapper;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
    queryClient.clear();
  });

  describe('connectionStatus', () => {
    it('should fetch connection status', async () => {
      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isConnected: true })
      });

      const { result, waitForNextUpdate } = renderHook(() => useGSC(), { wrapper });

      // Initial state
      expect(result.current.isLoading).toBe(true);

      await waitForNextUpdate();

      // After loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isConnected).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/gsc/status');
    });

    it('should handle error when fetching connection status', async () => {
      // Mock error response
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result, waitForNextUpdate } = renderHook(() => useGSC(), { wrapper });

      await waitForNextUpdate();

      // Should default to not connected on error
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('getAuthUrl', () => {
    it('should fetch auth URL and open in new window', async () => {
      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authUrl: 'https://example.com/auth' })
      });

      const { result } = renderHook(() => useGSC(), { wrapper });

      await act(async () => {
        result.current.getAuthUrl.mutate();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/gsc/auth');
      expect(global.window.open).toHaveBeenCalledWith(
        'https://example.com/auth',
        '_blank',
        'width=800,height=600'
      );
    });

    it('should handle error when fetching auth URL', async () => {
      // Mock error response
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useGSC(), { wrapper });

      await act(async () => {
        result.current.getAuthUrl.mutate();
      });

      expect(global.window.open).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from GSC', async () => {
      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const { result } = renderHook(() => useGSC(), { wrapper });

      await act(async () => {
        result.current.disconnect.mutate();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/gsc/disconnect', {
        method: 'POST'
      });
    });
  });

  describe('sites', () => {
    it('should fetch sites when connected', async () => {
      // Mock connection status
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isConnected: true })
      });

      // Mock sites response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sites: [
            { id: 1, siteUrl: 'https://example.com', isDefault: true },
            { id: 2, siteUrl: 'https://test.com', isDefault: false }
          ]
        })
      });

      const { result, waitForNextUpdate } = renderHook(() => useGSC(), { wrapper });

      await waitForNextUpdate(); // Wait for connection status
      await waitForNextUpdate(); // Wait for sites

      expect(result.current.sites).toHaveLength(2);
      expect(result.current.sites[0].siteUrl).toBe('https://example.com');
      expect(result.current.sites[0].isDefault).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/gsc/sites');
    });

    it('should not fetch sites when not connected', async () => {
      // Mock connection status
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isConnected: false })
      });

      const { result, waitForNextUpdate } = renderHook(() => useGSC(), { wrapper });

      await waitForNextUpdate();

      expect(result.current.sites).toHaveLength(0);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only connection status
    });
  });

  describe('setDefaultSite', () => {
    it('should set default site', async () => {
      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const { result } = renderHook(() => useGSC(), { wrapper });

      await act(async () => {
        result.current.setDefaultSite.mutate(1);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/gsc/sites/default', {
        method: 'POST',
        body: JSON.stringify({ siteId: 1 }),
        headers: expect.any(Object)
      });
    });
  });

  describe('getPerformanceData', () => {
    it('should create a query for performance data', () => {
      const { result } = renderHook(() => useGSC(), { wrapper });

      const performanceQuery = result.current.getPerformanceData(1, '2023-01-01', '2023-01-31');

      expect(performanceQuery.queryKey).toEqual([
        'gsc',
        'performance',
        {
          siteId: 1,
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          dimensions: ['query'],
          rowLimit: 1000
        }
      ]);
    });
  });

  describe('getTopKeywords', () => {
    it('should create a query for top keywords', () => {
      const { result } = renderHook(() => useGSC(), { wrapper });

      const keywordsQuery = result.current.getTopKeywords(1, '2023-01-01', '2023-01-31', 100);

      expect(keywordsQuery.queryKey).toEqual([
        'gsc',
        'keywords',
        {
          siteId: 1,
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          limit: 100
        }
      ]);
    });
  });

  describe('getTopPages', () => {
    it('should create a query for top pages', () => {
      const { result } = renderHook(() => useGSC(), { wrapper });

      const pagesQuery = result.current.getTopPages(1, '2023-01-01', '2023-01-31', 100);

      expect(pagesQuery.queryKey).toEqual([
        'gsc',
        'pages',
        {
          siteId: 1,
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          limit: 100
        }
      ]);
    });
  });
});

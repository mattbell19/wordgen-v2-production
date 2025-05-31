import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJSON } from '@/lib/api-utils';
import { useToastProvider } from '@/components/ui/toast-provider';

/**
 * Hook for interacting with Google Search Console API
 */
export function useGSC() {
  const queryClient = useQueryClient();
  const toast = useToastProvider();

  /**
   * Check if user is connected to GSC
   */
  const connectionStatus = useQuery({
    queryKey: ['gsc', 'status'],
    queryFn: async () => {
      try {
        const response = await fetchJSON('/api/gsc/status');
        return response;
      } catch (error) {
        console.error('Error checking GSC connection status:', error);
        return { isConnected: false };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Get GSC authorization URL
   */
  const getAuthUrl = useMutation({
    mutationFn: async () => {
      const response = await fetchJSON('/api/gsc/auth');
      return response.authUrl;
    },
    onSuccess: (authUrl) => {
      // Open the auth URL in a new window
      window.open(authUrl, '_blank', 'width=800,height=600');
    },
    onError: (error) => {
      console.error('Error getting auth URL:', error);
      toast.showError(
        'Authentication Error',
        'Failed to generate Google authorization URL'
      );
    },
  });

  /**
   * Disconnect from GSC
   */
  const disconnect = useMutation({
    mutationFn: async () => {
      await fetchJSON('/api/gsc-direct/disconnect', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['gsc'] });
      toast.showSuccess(
        'Disconnected',
        'Successfully disconnected from Google Search Console'
      );
    },
    onError: (error) => {
      console.error('Error disconnecting from GSC:', error);
      toast.showError(
        'Disconnection Error',
        'Failed to disconnect from Google Search Console'
      );
    },
  });

  /**
   * Get GSC sites
   */
  const sites = useQuery({
    queryKey: ['gsc', 'sites'],
    queryFn: async () => {
      try {
        const response = await fetchJSON('/api/gsc/sites');
        return response.sites || [];
      } catch (error) {
        console.error('Error fetching GSC sites:', error);
        return [];
      }
    },
    enabled: connectionStatus.data?.isConnected === true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Set default GSC site
   */
  const setDefaultSite = useMutation({
    mutationFn: async (siteId: number) => {
      await fetchJSON('/api/gsc/sites/default', {
        method: 'POST',
        body: JSON.stringify({ siteId }),
      });
    },
    onSuccess: () => {
      // Invalidate sites query to refresh data
      queryClient.invalidateQueries({ queryKey: ['gsc', 'sites'] });
      toast.showSuccess('Default Site Updated', 'Default site set successfully');
    },
    onError: (error) => {
      console.error('Error setting default site:', error);
      toast.showError(
        'Update Error',
        'Failed to set default site'
      );
    },
  });

  /**
   * Get search performance data
   */
  const getPerformanceData = (
    siteId?: number,
    startDate?: string,
    endDate?: string,
    dimensions: string[] = ['query'],
    rowLimit: number = 1000
  ) => {
    return useQuery({
      queryKey: ['gsc', 'performance', { siteId, startDate, endDate, dimensions, rowLimit }],
      queryFn: async () => {
        try {
          // Build query params
          const params = new URLSearchParams();
          if (siteId) params.append('siteId', siteId.toString());
          if (startDate) params.append('startDate', startDate);
          if (endDate) params.append('endDate', endDate);
          if (dimensions) params.append('dimensions', dimensions.join(','));
          if (rowLimit) params.append('rowLimit', rowLimit.toString());

          const response = await fetchJSON(`/api/gsc/performance?${params.toString()}`);
          return response;
        } catch (error) {
          console.error('Error fetching GSC performance data:', error);
          throw error;
        }
      },
      enabled: connectionStatus.data?.isConnected === true,
      staleTime: 30 * 60 * 1000, // 30 minutes
    });
  };

  /**
   * Get top keywords
   */
  const getTopKeywords = (
    siteId?: number,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ) => {
    return useQuery({
      queryKey: ['gsc', 'keywords', { siteId, startDate, endDate, limit }],
      queryFn: async () => {
        try {
          // Build query params
          const params = new URLSearchParams();
          if (siteId) params.append('siteId', siteId.toString());
          if (startDate) params.append('startDate', startDate);
          if (endDate) params.append('endDate', endDate);
          if (limit) params.append('limit', limit.toString());

          const response = await fetchJSON(`/api/gsc/keywords?${params.toString()}`);
          return response.keywords || [];
        } catch (error) {
          console.error('Error fetching GSC keywords:', error);
          throw error;
        }
      },
      enabled: connectionStatus.data?.isConnected === true,
      staleTime: 30 * 60 * 1000, // 30 minutes
    });
  };

  /**
   * Get top pages
   */
  const getTopPages = (
    siteId?: number,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ) => {
    return useQuery({
      queryKey: ['gsc', 'pages', { siteId, startDate, endDate, limit }],
      queryFn: async () => {
        try {
          // Build query params
          const params = new URLSearchParams();
          if (siteId) params.append('siteId', siteId.toString());
          if (startDate) params.append('startDate', startDate);
          if (endDate) params.append('endDate', endDate);
          if (limit) params.append('limit', limit.toString());

          const response = await fetchJSON(`/api/gsc/pages?${params.toString()}`);
          return response.pages || [];
        } catch (error) {
          console.error('Error fetching GSC pages:', error);
          throw error;
        }
      },
      enabled: connectionStatus.data?.isConnected === true,
      staleTime: 30 * 60 * 1000, // 30 minutes
    });
  };

  return {
    isConnected: connectionStatus.data?.isConnected || false,
    isLoading: connectionStatus.isLoading,
    getAuthUrl,
    disconnect,
    sites: sites.data || [],
    sitesLoading: sites.isLoading,
    setDefaultSite,
    getPerformanceData,
    getTopKeywords,
    getTopPages,
  };
}

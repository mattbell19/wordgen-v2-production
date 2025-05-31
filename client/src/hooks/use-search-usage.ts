import { useState, useEffect } from 'react';
import { useToast } from './use-toast';

interface SearchUsage {
  searchesUsed: number;
  searchLimit: number;
  remaining: number;
  lastResetDate: string;
}

export function useSearchUsage() {
  const [usage, setUsage] = useState<SearchUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsage = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/search-usage', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch search usage');
      }
      
      const data = await response.json();
      setUsage(data.data);
    } catch (error: any) {
      console.error('Error fetching search usage:', error);
      setError(error.message || 'Failed to fetch search usage');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch usage on hook initialization
  useEffect(() => {
    fetchUsage();
  }, []);

  return {
    usage,
    isLoading,
    error,
    fetchUsage,
    hasQuotaRemaining: usage ? usage.remaining > 0 : true,
  };
}

import { useState, useEffect } from 'react';
import { useToast } from './use-toast';

interface InternalLink {
  url: string;
  topic: string;
  relevance: number;
}

export function useSitemap() {
  const [links, setLinks] = useState<InternalLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchLinks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sitemap/links', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch links');
      }
      
      const data = await response.json();
      setLinks(data.data.links || []);
    } catch (error: any) {
      console.error('Error fetching sitemap links:', error);
      setError(error.message || 'Failed to fetch sitemap links');
    } finally {
      setIsLoading(false);
    }
  };

  const addSitemap = async (sitemapUrl: string) => {
    if (!sitemapUrl) {
      toast({
        title: "Error",
        description: "Please enter a sitemap URL",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      const response = await fetch('/api/sitemap/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sitemapUrl }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process sitemap');
      }
      
      const data = await response.json();
      
      toast({
        title: "Success",
        description: `Processed sitemap with ${data.data.linksFound} links found`,
      });
      
      // Refresh the links
      await fetchLinks();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process sitemap",
        variant: "destructive",
      });
      return false;
    }
  };

  // Fetch links on hook initialization
  useEffect(() => {
    fetchLinks();
  }, []);

  return {
    links,
    isLoading,
    error,
    hasSitemap: links.length > 0,
    fetchLinks,
    addSitemap,
  };
}

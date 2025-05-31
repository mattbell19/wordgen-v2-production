import React, { useState } from 'react';
import { useGSC } from '@/hooks/use-gsc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { Globe, RefreshCw } from 'lucide-react';

interface SiteSelectorProps {
  onSiteChange?: (siteId: number) => void;
}

/**
 * Component for selecting a Google Search Console site
 */
export function SiteSelector({ onSiteChange }: SiteSelectorProps) {
  const { sites, sitesLoading, setDefaultSite } = useGSC();
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  // Find default site
  const defaultSite = sites.find(site => site.isDefault);
  
  // Set selected site to default site if available and not already set
  React.useEffect(() => {
    if (defaultSite && !selectedSiteId) {
      setSelectedSiteId(defaultSite.id.toString());
    }
  }, [defaultSite, selectedSiteId]);

  const handleSiteChange = (value: string) => {
    setSelectedSiteId(value);
    
    // Set as default site
    const siteId = parseInt(value);
    setDefaultSite.mutate(siteId);
    
    // Notify parent component
    if (onSiteChange) {
      onSiteChange(siteId);
    }
  };

  // Format site URL for display
  const formatSiteUrl = (url: string) => {
    try {
      // Remove protocol and trailing slash
      return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    } catch (error) {
      return url;
    }
  };

  if (sites.length === 0 && !sitesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Sites Available</CardTitle>
          <CardDescription>
            No sites found in your Google Search Console account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please add your website to Google Search Console first, then refresh this page.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" asChild>
            <a href="https://search.google.com/search-console/welcome" target="_blank" rel="noopener noreferrer">
              Add Site to Search Console
            </a>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <LoadingState isLoading={sitesLoading} loadingText="Loading sites...">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedSiteId} onValueChange={handleSiteChange}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a website" />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id.toString()}>
                {formatSiteUrl(site.siteUrl)}
                {site.isDefault && ' (Default)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          disabled={setDefaultSite.isLoading}
          title="Set as default site"
        >
          {setDefaultSite.isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : null}
        </Button>
      </div>
    </LoadingState>
  );
}

import React from 'react';
import { useGSC } from '@/hooks/use-gsc';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorDisplay } from '@/components/ui/error-display';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown, ExternalLink } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface PageTableProps {
  siteId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * Component for displaying Google Search Console page data
 */
export function PageTable({
  siteId,
  startDate,
  endDate,
  limit = 100
}: PageTableProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortColumn, setSortColumn] = React.useState<string>('clicks');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  
  const { getTopPages, sites } = useGSC();
  const { data: pages, isLoading, error, refetch } = getTopPages(siteId, startDate, endDate, limit);

  // Get the current site URL
  const currentSite = React.useMemo(() => {
    if (!siteId) return '';
    const site = sites.find(s => s.id === siteId);
    return site ? site.siteUrl : '';
  }, [siteId, sites]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Filter and sort pages
  const filteredAndSortedPages = React.useMemo(() => {
    if (!pages) return [];

    // Filter by search term
    let filtered = pages;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = pages.filter(page => 
        page.keys[0].toLowerCase().includes(term)
      );
    }

    // Sort by column
    return [...filtered].sort((a, b) => {
      let valueA, valueB;

      switch (sortColumn) {
        case 'page':
          valueA = a.keys[0].toLowerCase();
          valueB = b.keys[0].toLowerCase();
          break;
        case 'clicks':
          valueA = a.clicks;
          valueB = b.clicks;
          break;
        case 'impressions':
          valueA = a.impressions;
          valueB = b.impressions;
          break;
        case 'ctr':
          valueA = a.ctr;
          valueB = b.ctr;
          break;
        case 'position':
          valueA = a.position;
          valueB = b.position;
          break;
        default:
          valueA = a.clicks;
          valueB = b.clicks;
      }

      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }, [pages, searchTerm, sortColumn, sortDirection]);

  // Format CTR as percentage
  const formatCtr = (ctr: number) => {
    return `${(ctr * 100).toFixed(2)}%`;
  };

  // Format position as number with 1 decimal place
  const formatPosition = (position: number) => {
    return position.toFixed(1);
  };

  // Format page URL for display
  const formatPageUrl = (url: string) => {
    try {
      // Remove protocol and domain
      return url.replace(/^https?:\/\/[^/]+/, '');
    } catch (error) {
      return url;
    }
  };

  // Get full URL for a page
  const getFullUrl = (pagePath: string) => {
    if (!currentSite) return pagePath;
    
    // Handle if pagePath is already a full URL
    if (pagePath.startsWith('http')) {
      return pagePath;
    }
    
    // Handle if currentSite has trailing slash
    const baseUrl = currentSite.endsWith('/') ? currentSite.slice(0, -1) : currentSite;
    
    // Handle if pagePath starts with slash
    const path = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
    
    return `${baseUrl}${path}`;
  };

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load page data"
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            className="pl-8"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['gsc', 'pages'] })}
        >
          Refresh
        </Button>
      </div>

      <LoadingState isLoading={isLoading} loadingText="Loading page data...">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('page')}
                    className="flex items-center gap-1 p-0 font-medium"
                  >
                    Page
                    {sortColumn === 'page' && (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('clicks')}
                    className="flex items-center gap-1 p-0 font-medium ml-auto"
                  >
                    Clicks
                    {sortColumn === 'clicks' && (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('impressions')}
                    className="flex items-center gap-1 p-0 font-medium ml-auto"
                  >
                    Impressions
                    {sortColumn === 'impressions' && (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('ctr')}
                    className="flex items-center gap-1 p-0 font-medium ml-auto"
                  >
                    CTR
                    {sortColumn === 'ctr' && (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('position')}
                    className="flex items-center gap-1 p-0 font-medium ml-auto"
                  >
                    Position
                    {sortColumn === 'position' && (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedPages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No pages found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedPages.map((page, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="truncate max-w-[300px]" title={page.keys[0]}>
                        {formatPageUrl(page.keys[0])}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{page.clicks}</TableCell>
                    <TableCell className="text-right">{page.impressions}</TableCell>
                    <TableCell className="text-right">{formatCtr(page.ctr)}</TableCell>
                    <TableCell className="text-right">{formatPosition(page.position)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="Open page"
                      >
                        <a
                          href={getFullUrl(page.keys[0])}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </LoadingState>
    </div>
  );
}

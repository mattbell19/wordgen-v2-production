import React from 'react';
import { useGSC } from '@/hooks/use-gsc';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorDisplay } from '@/components/ui/error-display';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown, ExternalLink } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface KeywordTableProps {
  siteId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * Component for displaying Google Search Console keyword data
 */
export function KeywordTable({
  siteId,
  startDate,
  endDate,
  limit = 100
}: KeywordTableProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortColumn, setSortColumn] = React.useState<string>('clicks');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  
  const { getTopKeywords } = useGSC();
  const { data: keywords, isLoading, error, refetch } = getTopKeywords(siteId, startDate, endDate, limit);

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

  // Filter and sort keywords
  const filteredAndSortedKeywords = React.useMemo(() => {
    if (!keywords) return [];

    // Filter by search term
    let filtered = keywords;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = keywords.filter(keyword => 
        keyword.keys[0].toLowerCase().includes(term)
      );
    }

    // Sort by column
    return [...filtered].sort((a, b) => {
      let valueA, valueB;

      switch (sortColumn) {
        case 'query':
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
  }, [keywords, searchTerm, sortColumn, sortDirection]);

  // Format CTR as percentage
  const formatCtr = (ctr: number) => {
    return `${(ctr * 100).toFixed(2)}%`;
  };

  // Format position as number with 1 decimal place
  const formatPosition = (position: number) => {
    return position.toFixed(1);
  };

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load keyword data"
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
            placeholder="Search keywords..."
            className="pl-8"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['gsc', 'keywords'] })}
        >
          Refresh
        </Button>
      </div>

      <LoadingState isLoading={isLoading} loadingText="Loading keyword data...">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('query')}
                    className="flex items-center gap-1 p-0 font-medium"
                  >
                    Keyword
                    {sortColumn === 'query' && (
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
              {filteredAndSortedKeywords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No keywords found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedKeywords.map((keyword, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{keyword.keys[0]}</TableCell>
                    <TableCell className="text-right">{keyword.clicks}</TableCell>
                    <TableCell className="text-right">{keyword.impressions}</TableCell>
                    <TableCell className="text-right">{formatCtr(keyword.ctr)}</TableCell>
                    <TableCell className="text-right">{formatPosition(keyword.position)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        title="Search on Google"
                      >
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(keyword.keys[0])}`}
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

import React from 'react';
import { useGSC } from '@/hooks/use-gsc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorDisplay } from '@/components/ui/error-display';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface PerformanceChartProps {
  siteId?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Component for displaying Google Search Console performance charts
 */
export function PerformanceChart({
  siteId,
  startDate,
  endDate
}: PerformanceChartProps) {
  const queryClient = useQueryClient();
  const { getPerformanceData } = useGSC();
  
  // Get performance data by date
  const { data: performanceData, isLoading, error, refetch } = getPerformanceData(
    siteId,
    startDate,
    endDate,
    ['date'],
    1000
  );

  // Process data for charts
  const chartData = React.useMemo(() => {
    if (!performanceData || !performanceData.rows) return [];
    
    // Sort by date
    return [...performanceData.rows]
      .sort((a, b) => {
        return a.keys[0].localeCompare(b.keys[0]);
      })
      .map(row => ({
        date: formatDateForDisplay(row.keys[0]),
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: (row.ctr * 100).toFixed(2),
        position: row.position.toFixed(1)
      }));
  }, [performanceData]);

  // Format date for display (YYYY-MM-DD to MM/DD)
  function formatDateForDisplay(dateStr: string) {
    try {
      const [year, month, day] = dateStr.split('-');
      return `${month}/${day}`;
    } catch (error) {
      return dateStr;
    }
  }

  // Calculate summary metrics
  const summaryMetrics = React.useMemo(() => {
    if (!performanceData || !performanceData.rows) {
      return {
        totalClicks: 0,
        totalImpressions: 0,
        avgCtr: 0,
        avgPosition: 0
      };
    }
    
    const totalClicks = performanceData.rows.reduce((sum, row) => sum + row.clicks, 0);
    const totalImpressions = performanceData.rows.reduce((sum, row) => sum + row.impressions, 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    
    // Calculate weighted average position
    let weightedPositionSum = 0;
    let impressionsSum = 0;
    
    performanceData.rows.forEach(row => {
      weightedPositionSum += row.position * row.impressions;
      impressionsSum += row.impressions;
    });
    
    const avgPosition = impressionsSum > 0 ? weightedPositionSum / impressionsSum : 0;
    
    return {
      totalClicks,
      totalImpressions,
      avgCtr: avgCtr.toFixed(2),
      avgPosition: avgPosition.toFixed(1)
    };
  }, [performanceData]);

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load performance data"
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['gsc', 'performance'] })}
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Data
        </Button>
      </div>
      
      <LoadingState isLoading={isLoading} loadingText="Loading performance data...">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clicks</CardTitle>
              <CardDescription>Total clicks from search</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.totalClicks.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Impressions</CardTitle>
              <CardDescription>Total impressions in search</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.totalImpressions.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">CTR</CardTitle>
              <CardDescription>Average click-through rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.avgCtr}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Position</CardTitle>
              <CardDescription>Average position in search</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.avgPosition}</div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-6">
          <Tabs defaultValue="clicks">
            <TabsList>
              <TabsTrigger value="clicks">Clicks</TabsTrigger>
              <TabsTrigger value="impressions">Impressions</TabsTrigger>
              <TabsTrigger value="ctr">CTR</TabsTrigger>
              <TabsTrigger value="position">Position</TabsTrigger>
            </TabsList>
            
            <TabsContent value="clicks" className="pt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="clicks" fill="#3b82f6" name="Clicks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="impressions" className="pt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="impressions" fill="#10b981" name="Impressions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="ctr" className="pt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis unit="%" />
                    <Tooltip />
                    <Line type="monotone" dataKey="ctr" stroke="#f59e0b" name="CTR (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="position" className="pt-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis reversed domain={[dataMin => Math.floor(dataMin), dataMax => Math.ceil(dataMax)]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="position" stroke="#ef4444" name="Position" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </LoadingState>
    </div>
  );
}

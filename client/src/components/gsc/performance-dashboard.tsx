import React, { useState } from 'react';
import { useGSC } from '@/hooks/use-gsc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SiteSelector } from './site-selector';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorDisplay } from '@/components/ui/error-display';
import { KeywordTable } from './keyword-table';
import { PageTable } from './page-table';
import { PerformanceChart } from './performance-chart';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { addDays, format, subDays } from 'date-fns';

/**
 * Component for displaying Google Search Console performance data
 */
export function PerformanceDashboard() {
  const { isConnected } = useGSC();
  const [selectedSiteId, setSelectedSiteId] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 28),
    to: new Date(),
  });

  const handleSiteChange = (siteId: number) => {
    setSelectedSiteId(siteId);
  };

  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    setDateRange(range);
  };

  // Format dates for API requests
  const formatDateForApi = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Search Performance</CardTitle>
            <CardDescription>
              View your website's performance in Google Search
            </CardDescription>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <SiteSelector onSiteChange={handleSiteChange} />
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              maxDate={new Date()}
              minDate={subDays(new Date(), 90)} // Google Search Console allows up to 90 days
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <PerformanceChart
              siteId={selectedSiteId}
              startDate={formatDateForApi(dateRange.from)}
              endDate={formatDateForApi(dateRange.to)}
            />
          </TabsContent>
          
          <TabsContent value="keywords">
            <KeywordTable
              siteId={selectedSiteId}
              startDate={formatDateForApi(dateRange.from)}
              endDate={formatDateForApi(dateRange.to)}
            />
          </TabsContent>
          
          <TabsContent value="pages">
            <PageTable
              siteId={selectedSiteId}
              startDate={formatDateForApi(dateRange.from)}
              endDate={formatDateForApi(dateRange.to)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

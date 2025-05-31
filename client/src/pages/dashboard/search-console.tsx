import React from 'react';
import { ConnectGSC } from '@/components/gsc/connect-gsc';
import { PerformanceDashboard } from '@/components/gsc/performance-dashboard';
import { useGSC } from '@/hooks/use-gsc';
import { LoadingState } from '@/components/ui/loading-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';

/**
 * Google Search Console Dashboard Page
 */
export default function SearchConsolePage() {
  const { isConnected, isLoading } = useGSC();
  const [activeTab, setActiveTab] = React.useState('overview');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search Console</h1>
        <p className="text-muted-foreground">
          View your website's performance in Google Search
        </p>
      </div>

      <LoadingState isLoading={isLoading} loadingText="Loading connection status...">
        <ConnectGSC />

        {isConnected && (
          <div className="mt-6">
            <Tabs defaultValue="overview" onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="keywords">Keywords</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <PerformanceDashboard />
              </TabsContent>

              <TabsContent value="keywords" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Keyword Insights</CardTitle>
                    <CardDescription>
                      Analyze your top-performing keywords and find opportunities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Coming Soon</AlertTitle>
                      <AlertDescription>
                        Advanced keyword analysis and tracking features are coming soon.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Content Recommendations</CardTitle>
                    <CardDescription>
                      Get recommendations for improving your content based on search data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Coming Soon</AlertTitle>
                      <AlertDescription>
                        Content recommendations based on your search performance data are coming soon.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {!isConnected && (
          <Alert className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Not Connected</AlertTitle>
            <AlertDescription>
              Connect to Google Search Console to view your search performance data.
            </AlertDescription>
          </Alert>
        )}
      </LoadingState>
    </div>
  );
}

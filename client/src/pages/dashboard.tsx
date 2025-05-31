import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ArrowRight, PlusCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { ErrorDisplay } from "@/components/ui/error-display";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-state";
import { UsageStat } from "@/components/dashboard/usage-stat";

// Demo data for when real data is not available
const demoData = [
  { name: "Jan", value: 12 },
  { name: "Feb", value: 18 },
  { name: "Mar", value: 23 },
  { name: "Apr", value: 27 },
  { name: "May", value: 34 },
  { name: "Jun", value: 28 },
  { name: "Jul", value: 25 },
];

interface UserUsage {
  totalArticlesGenerated: number;
  totalKeywordsAnalyzed: number;
  freeArticlesUsed: number;
  creditsUsed: number;
  totalWordCount: number;
  lastArticleDate: string | null;
  lastKeywordDate: string | null;
}

interface RecentArticle {
  id: number;
  title: string;
  createdAt: string;
  wordCount: number;
}

export default function Dashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate("/auth");
    }
  }, [user, isAuthLoading, navigate]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name || user.email}!
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-1" onClick={() => navigate("/dashboard/article-writer")}>
            <PlusCircle className="h-4 w-4" />
            New Article
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Usage Statistics */}
          <ErrorBoundary fallback={
            <ErrorDisplay
              type="server"
              title="Could not load usage statistics"
              showRetry={true}
              onRetry={() => window.location.reload()}
            />
          }>
            <UsageStats />
          </ErrorBoundary>

          {/* Usage Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ErrorBoundary>
              <Card>
                <CardHeader>
                  <CardTitle>Article Generation</CardTitle>
                  <CardDescription>Monthly article generation trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={demoData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#2563eb" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </ErrorBoundary>

            <ErrorBoundary>
              <Card>
                <CardHeader>
                  <CardTitle>Keyword Research</CardTitle>
                  <CardDescription>Monthly keyword research trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={demoData.slice().reverse()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#2563eb" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </ErrorBoundary>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {/* Recent Articles */}
          <ErrorBoundary fallback={
            <ErrorDisplay
              type="server"
              title="Could not load recent articles"
              showRetry={true}
              onRetry={() => window.location.reload()}
            />
          }>
            <RecentArticles />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Usage Statistics Component with Error Handling
 */
function UsageStats() {
  const queryClient = useQueryClient();

  // Mutation to sync usage data
  const syncUsage = useMutation({
    mutationFn: async () => {
      try {
        console.log('Syncing usage data...');
        const response = await fetch('/api/user/sync', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`Sync error: HTTP ${response.status}`);
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error ${response.status}`);
          } catch (jsonError) {
            // If the response is not valid JSON, throw a generic error
            console.error("Error parsing JSON response:", jsonError);
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
          }
        }

        try {
          const data = await response.json();
          console.log('Sync response:', data);
          return data;
        } catch (jsonError) {
          console.error("Error parsing JSON response:", jsonError);
          throw new Error('Invalid JSON response from server');
        }
      } catch (error) {
        console.error('Error syncing usage data:', error);
        // Return a default object to prevent further errors
        return { success: false, error: 'Failed to sync usage data' };
      }
    },
    onSuccess: (data) => {
      console.log('Sync success:', data);
      if (data.success) {
        // Invalidate the usage query to refetch with updated data
        queryClient.invalidateQueries({ queryKey: ['userUsage'] });
      }
    },
    onError: (error) => {
      console.error('Sync mutation error:', error);
    }
  });

  // Query for usage data
  const { data: usage, isLoading, error } = useQuery<UserUsage>({
    queryKey: ['userUsage'],
    queryFn: async () => {
      try {
        // First try to sync the usage data
        await syncUsage.mutateAsync();
        // Then fetch the updated usage data
        return await fetchJSON('/api/user/usage');
      } catch (error) {
        console.error('Error fetching usage data:', error);
        // Return default usage data to prevent UI errors
        return {
          totalArticlesGenerated: 0,
          totalKeywordsAnalyzed: 0,
          freeArticlesUsed: 0,
          creditsUsed: 0,
          totalWordCount: 0,
          lastArticleDate: null,
          lastKeywordDate: null
        };
      }
    },
    staleTime: 300000, // 5 minutes
    retry: 1, // Only retry once
  });

  return (
    <LoadingState
      isLoading={isLoading}
      loadingText="Fetching your latest usage data..."
      className="h-full"
    >
      {error ? (
        <ErrorDisplay
          type="server"
          title="Could not load usage statistics"
          error={error instanceof Error ? error : new Error('Failed to load usage data')}
          showRetry={true}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['userUsage'] })}
        />
      ) : !usage ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              No Usage Data Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">We couldn't find any usage data for your account.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => syncUsage.mutate()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Data
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Usage Statistics</CardTitle>
              <CardDescription>
                Your content generation activity
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => syncUsage.mutate()}
              disabled={syncUsage.isLoading}
            >
              {syncUsage.isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <UsageStat
                title="Total Articles"
                value={usage?.totalArticlesGenerated || 0}
                description="Articles generated"
              />
              <UsageStat
                title="Total Words"
                value={usage?.totalWordCount || 0}
                description="Words generated"
              />
              <UsageStat
                title="Keywords Analyzed"
                value={usage?.totalKeywordsAnalyzed || 0}
                description="Keywords researched"
              />
              <UsageStat
                title="Free Credits Used"
                value={usage?.freeArticlesUsed || 0}
                description="Out of 3 free credits"
                showProgress
                max={3}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </LoadingState>
  );
}

/**
 * Recent Articles Component with Error Handling
 */
function RecentArticles() {
  const { data: articles, isLoading, error } = useQuery<RecentArticle[]>({
    queryKey: ['recentArticles'],
    queryFn: () => fetchJSON('/api/user/recent-articles'),
    staleTime: 300000, // 5 minutes
  });
  const queryClient = useQueryClient();

  // Truncate long titles for display
  const truncateTitle = (title: string, maxLength = 50) => {
    return title.length > maxLength
      ? `${title.substring(0, maxLength)}...`
      : title;
  };

  return (
    <LoadingState
      isLoading={isLoading}
      loadingText="Fetching your latest articles..."
      className="h-full"
    >
      {error ? (
        <ErrorDisplay
          type="server"
          title="Could not load recent articles"
          error={error instanceof Error ? error : new Error('Failed to load recent articles')}
          showRetry={true}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['recentArticles'] })}
        />
      ) : !articles || articles.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Recent Articles</CardTitle>
            <CardDescription>You haven't created any articles yet</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-center text-muted-foreground mb-4">
              Get started by creating your first article
            </p>
            <Button onClick={() => window.location.href = '/dashboard/article-writer'}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Article
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Articles</CardTitle>
            <CardDescription>Your recently created articles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(articles) ? articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between border-b pb-2"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{truncateTitle(article.title)}</p>
                    <div className="flex gap-2 text-sm text-muted-foreground">
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{article.wordCount} words</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => window.location.href = `/dashboard/my-articles/${article.id}`}
                  >
                    View
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )) : <p className="text-muted-foreground">No recent articles found</p>}
            </div>
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/dashboard/my-articles'}
              >
                View All Articles
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </LoadingState>
  );
}
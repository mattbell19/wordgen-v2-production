import { useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, BarChart, Bar } from "recharts";
import { ArrowRight, PlusCircle, RefreshCw, AlertTriangle, TrendingUp, FileText, Target, Zap } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { ErrorDisplay } from "@/components/ui/error-display";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui/loading-state";
import { UsageStat } from "@/components/dashboard/usage-stat";
import React from "react";

// Interface for chart data
interface ChartDataPoint {
  name: string;
  articles?: number;
  words?: number;
  keywords?: number;
  searches?: number;
  date: string;
}

interface ArticleAnalytics {
  chartData: ChartDataPoint[];
  totalArticles: number;
  totalWords: number;
  hasData: boolean;
}

interface KeywordAnalytics {
  chartData: ChartDataPoint[];
  totalKeywordLists: number;
  totalSavedKeywords: number;
  hasData: boolean;
}

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

  // Simple redirect logic without useEffect to prevent infinite loops
  if (!isAuthLoading && !user) {
    navigate("/auth");
    return null;
  }

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

  return <DashboardContent user={user} navigate={navigate} />;
}

// Separate component for dashboard content to isolate queries
function DashboardContent({ user, navigate }: { user: any; navigate: (path: string) => void }) {
  // Query for article analytics
  const { data: articleAnalytics, isLoading: isLoadingArticles } = useQuery<ArticleAnalytics>({
    queryKey: ['dashboard-articles'],
    queryFn: async () => {
      const response = await fetchJSON('/api/dashboard/articles');
      return response;
    },
    staleTime: 300000, // 5 minutes
    retry: 1,
  });

  // Query for keyword analytics
  const { data: keywordAnalytics, isLoading: isLoadingKeywords } = useQuery<KeywordAnalytics>({
    queryKey: ['dashboard-keywords'],
    queryFn: async () => {
      const response = await fetchJSON('/api/dashboard/keywords');
      return response;
    },
    staleTime: 300000, // 5 minutes
    retry: 1,
  });

  return (
    <div className="container mx-auto p-4 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name || user.email}! 👋
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg"
            onClick={() => navigate("/dashboard/article-writer")}
          >
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

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ErrorBoundary>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Article Generation</CardTitle>
                      <CardDescription>Monthly content creation trends</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingArticles ? (
                    <div className="flex items-center justify-center h-[280px]">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                        <p className="text-sm text-muted-foreground">Loading article data...</p>
                      </div>
                    </div>
                  ) : !articleAnalytics?.hasData ? (
                    <div className="flex flex-col items-center justify-center h-[280px] text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Articles Yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Generate your first article to see analytics here
                      </p>
                      <Button
                        onClick={() => navigate("/dashboard/article-writer")}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Generate Your First Article
                      </Button>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={articleAnalytics.chartData}>
                        <defs>
                          <linearGradient id="articleGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          className="text-xs"
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          className="text-xs"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="articles"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          fill="url(#articleGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </ErrorBoundary>

            <ErrorBoundary>
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Keyword Research</CardTitle>
                      <CardDescription>Monthly research activity</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingKeywords ? (
                    <div className="flex items-center justify-center h-[280px]">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                        <p className="text-sm text-muted-foreground">Loading keyword data...</p>
                      </div>
                    </div>
                  ) : !keywordAnalytics?.hasData ? (
                    <div className="flex flex-col items-center justify-center h-[280px] text-center">
                      <Target className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Keyword Research Yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start researching keywords to see analytics here
                      </p>
                      <Button
                        onClick={() => navigate("/dashboard/keyword-research")}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Start Keyword Research
                      </Button>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={keywordAnalytics.chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          className="text-xs"
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          className="text-xs"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Bar
                          dataKey="keywords"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
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

  // Simple sync function without useCallback to avoid dependency issues
  const handleSync = async () => {
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
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('Sync response:', data);

      if (data.success) {
        // Invalidate the usage query to refetch with updated data
        queryClient.invalidateQueries({ queryKey: ['userUsage'] });
      }

      return data;
    } catch (error) {
      console.error('Error syncing usage data:', error);
      throw error;
    }
  };

  // Use a ref to track if we've already attempted sync to prevent infinite loops
  const syncAttemptedRef = React.useRef(false);

  // Mutation to sync usage data
  const syncUsage = useMutation({
    mutationFn: handleSync,
    onError: (error) => {
      console.error('Sync mutation error:', error);
      // Reset sync attempt flag on error to allow retry
      syncAttemptedRef.current = false;
    },
    onSuccess: () => {
      // Reset sync attempt flag on success
      syncAttemptedRef.current = false;
    },
    retry: false, // Don't auto-retry to prevent loops
  });

  // Query for usage data
  const { data: usage, isLoading, error } = useQuery<UserUsage>({
    queryKey: ['userUsage'],
    queryFn: async () => {
      try {
        // Just fetch the usage data directly to avoid infinite re-renders
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
    gcTime: 600000, // 10 minutes - keep in cache longer
    retry: 1, // Only retry once
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });

  // Auto-sync data if usage is available but shows all zeros (indicates new user or stale data)
  React.useEffect(() => {
    if (usage && !isLoading && !error && !syncAttemptedRef.current && !syncUsage.isLoading) {
      const hasNoData = usage.totalArticlesGenerated === 0 &&
                        usage.totalWordCount === 0 &&
                        usage.totalKeywordsAnalyzed === 0 &&
                        !usage.lastArticleDate;

      if (hasNoData) {
        console.log('No usage data found, triggering automatic sync...');
        syncAttemptedRef.current = true; // Mark that we've attempted sync
        syncUsage.mutate();
      }
    }
  }, [usage, isLoading, error, syncUsage.isLoading]);

  // Reset sync attempt flag when user manually syncs or when there's actual data
  React.useEffect(() => {
    if (usage && (usage.totalArticlesGenerated > 0 || usage.totalWordCount > 0)) {
      syncAttemptedRef.current = false;
    }
  }, [usage]);

  // Remove automatic sync on mount to prevent infinite re-renders
  // Users can manually sync if needed using the sync button

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
        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Usage Statistics
              </CardTitle>
              <CardDescription className="text-base">
                Your content generation activity
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Total Articles</p>
                    <p className="text-3xl font-bold">{usage?.totalArticlesGenerated || 0}</p>
                    <p className="text-purple-200 text-xs mt-1">Articles generated</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Words</p>
                    <p className="text-3xl font-bold">{(usage?.totalWordCount || 0).toLocaleString()}</p>
                    <p className="text-blue-200 text-xs mt-1">Words generated</p>
                  </div>
                  <Zap className="h-8 w-8 text-blue-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Keywords Analyzed</p>
                    <p className="text-3xl font-bold">{usage?.totalKeywordsAnalyzed || 0}</p>
                    <p className="text-emerald-200 text-xs mt-1">Keywords researched</p>
                  </div>
                  <Target className="h-8 w-8 text-emerald-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Free Credits</p>
                    <p className="text-3xl font-bold">{usage?.freeArticlesUsed || 0}/3</p>
                    <div className="mt-2">
                      <div className="bg-orange-400/30 rounded-full h-2">
                        <div
                          className="bg-white rounded-full h-2 transition-all duration-300"
                          style={{ width: `${((usage?.freeArticlesUsed || 0) / 3) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-200" />
                </div>
              </div>
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
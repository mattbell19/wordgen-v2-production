import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart as BarChartIcon, 
  Users, 
  Settings2, 
  FileText, 
  Network,
  TrendingUp,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

interface ContentAnalytics {
  articleGeneration: Array<{
    date: string;
    count: number;
  }>;
  topKeywords: Array<{
    keyword: string;
    count: number;
  }>;
  generationStats: {
    total: number;
    successful: number;
    failed: number;
    successRate: string;
  };
}

interface DashboardStats {
  totalUsers: number;
  totalArticles: number;
  activeAudits: number;
  totalTeams: number;
  systemStatus: string;
  contentAnalytics: ContentAnalytics;
}

interface ApiResponse {
  success: boolean;
  data: DashboardStats;
  error?: string;
}

export default function AdminDashboard() {
  const { data: response, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ["/api/admin/stats"],
    retry: 1,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          Error loading dashboard statistics. Please try again later.
        </div>
      </div>
    );
  }

  const stats = response?.data;
  const contentAnalytics = stats?.contentAnalytics;

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      description: "Active users in the system"
    },
    {
      title: "Articles Generated",
      value: stats?.totalArticles ?? 0,
      icon: FileText,
      description: "Total articles generated"
    },
    {
      title: "Active Audits",
      value: stats?.activeAudits ?? 0,
      icon: Network,
      description: "Currently running SEO audits"
    },
    {
      title: "System Status",
      value: stats?.systemStatus ?? "Loading",
      icon: Settings2,
      description: "Current system health status"
    }
  ];

  const chartData = contentAnalytics?.articleGeneration.map(item => ({
    date: format(new Date(item.date), 'MMM dd'),
    articles: item.count
  })) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {/* Main stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-7 w-[100px]" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {typeof stat.value === 'number' 
                        ? stat.value.toLocaleString()
                        : stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Content Analytics Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Article Generation Trend */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Article Generation Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="articles" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Keywords */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChartIcon className="h-4 w-4" />
              Top Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="space-y-4">
                {contentAnalytics?.topKeywords.map((keyword, index) => (
                  <div key={keyword.keyword} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{index + 1}.</span>
                      <span className="text-sm">{keyword.keyword}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {keyword.count} articles
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generation Success Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Generation Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="space-y-4">
                <div className="text-4xl font-bold">
                  {contentAnalytics?.generationStats.successRate}%
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Successful
                    </div>
                    <div className="text-2xl font-semibold">
                      {contentAnalytics?.generationStats.successful.toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Failed
                    </div>
                    <div className="text-2xl font-semibold">
                      {contentAnalytics?.generationStats.failed.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BrandMention {
  id: number;
  query: string;
  response: string;
  platform: string;
  brandMentioned: string;
  mentionType: 'direct' | 'indirect' | 'competitive';
  rankingPosition: number | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidenceScore: number;
  contextSnippet: string;
  createdAt: string;
}

interface BrandAnalyticsChartProps {
  mentions: BrandMention[];
}

export const BrandAnalyticsChart: React.FC<BrandAnalyticsChartProps> = ({ mentions }) => {
  const { timeSeriesData, sentimentData, platformData, queryPerformanceData, trends } = useMemo(() => {
    // Group mentions by date
    const dailyMentions = mentions.reduce((acc, mention) => {
      const date = new Date(mention.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          total: 0,
          positive: 0,
          neutral: 0,
          negative: 0,
          avgPosition: 0,
          positions: [] as number[]
        };
      }
      
      acc[date].total++;
      acc[date][mention.sentiment]++;
      
      if (mention.rankingPosition) {
        acc[date].positions.push(mention.rankingPosition);
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate average positions
    Object.values(dailyMentions).forEach((day: any) => {
      if (day.positions.length > 0) {
        day.avgPosition = day.positions.reduce((sum: number, pos: number) => sum + pos, 0) / day.positions.length;
      } else {
        day.avgPosition = null;
      }
      delete day.positions;
    });

    const timeSeriesData = Object.values(dailyMentions)
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    // Sentiment breakdown
    const sentimentCounts = mentions.reduce((acc, mention) => {
      acc[mention.sentiment]++;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0 });

    const sentimentData = [
      { name: 'Positive', value: sentimentCounts.positive, color: '#10B981' },
      { name: 'Neutral', value: sentimentCounts.neutral, color: '#6B7280' },
      { name: 'Negative', value: sentimentCounts.negative, color: '#EF4444' }
    ];

    // Platform breakdown
    const platformCounts = mentions.reduce((acc, mention) => {
      acc[mention.platform] = (acc[mention.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const platformData = Object.entries(platformCounts).map(([platform, count]) => ({
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      mentions: count
    }));

    // Query performance
    const queryStats = mentions.reduce((acc, mention) => {
      if (!acc[mention.query]) {
        acc[mention.query] = {
          query: mention.query,
          mentions: 0,
          positions: [],
          sentiments: { positive: 0, neutral: 0, negative: 0 }
        };
      }
      
      acc[mention.query].mentions++;
      acc[mention.query].sentiments[mention.sentiment]++;
      
      if (mention.rankingPosition) {
        acc[mention.query].positions.push(mention.rankingPosition);
      }
      
      return acc;
    }, {} as Record<string, any>);

    const queryPerformanceData = Object.values(queryStats)
      .map((query: any) => ({
        ...query,
        avgPosition: query.positions.length > 0 
          ? Math.round(query.positions.reduce((sum: number, pos: number) => sum + pos, 0) / query.positions.length)
          : null,
        positiveRate: Math.round((query.sentiments.positive / query.mentions) * 100)
      }))
      .sort((a: any, b: any) => b.mentions - a.mentions)
      .slice(0, 10);

    // Calculate trends
    const recentMentions = mentions.filter(m => 
      new Date(m.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const previousMentions = mentions.filter(m => {
      const date = new Date(m.createdAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      return date >= twoWeeksAgo && date < weekAgo;
    });

    const mentionTrend = recentMentions.length > previousMentions.length ? 'up' : 
                         recentMentions.length < previousMentions.length ? 'down' : 'stable';

    const recentPositive = recentMentions.filter(m => m.sentiment === 'positive').length;
    const previousPositive = previousMentions.filter(m => m.sentiment === 'positive').length;
    const sentimentTrend = recentPositive > previousPositive ? 'up' : 
                          recentPositive < previousPositive ? 'down' : 'stable';

    const trends = {
      mentions: mentionTrend,
      sentiment: sentimentTrend,
      mentionChange: recentMentions.length - previousMentions.length,
      sentimentChange: recentPositive - previousPositive
    };

    return {
      timeSeriesData,
      sentimentData,
      platformData,
      queryPerformanceData,
      trends
    };
  }, [mentions]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  if (mentions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-500">No mention data available yet</p>
          <p className="text-sm text-gray-400 mt-2">Start monitoring to see analytics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Mention Trend (7 days)</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg font-semibold">
                    {trends.mentionChange > 0 ? '+' : ''}{trends.mentionChange}
                  </p>
                  {getTrendIcon(trends.mentions)}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">vs previous week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Positive Sentiment Trend</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg font-semibold">
                    {trends.sentimentChange > 0 ? '+' : ''}{trends.sentimentChange}
                  </p>
                  {getTrendIcon(trends.sentiment)}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">positive mentions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Mentions Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value, name) => [value, name === 'total' ? 'Total Mentions' : name]}
              />
              <Area 
                type="monotone" 
                dataKey="positive" 
                stackId="1"
                stroke="#10B981" 
                fill="#10B981"
                fillOpacity={0.8}
              />
              <Area 
                type="monotone" 
                dataKey="neutral" 
                stackId="1"
                stroke="#6B7280" 
                fill="#6B7280"
                fillOpacity={0.8}
              />
              <Area 
                type="monotone" 
                dataKey="negative" 
                stackId="1"
                stroke="#EF4444" 
                fill="#EF4444"
                fillOpacity={0.8}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Platform Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="mentions" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Queries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {queryPerformanceData.map((query, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm truncate max-w-md">{query.query}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{query.mentions} mentions</Badge>
                    {query.avgPosition && (
                      <Badge variant="secondary">Avg. #{query.avgPosition}</Badge>
                    )}
                    <Badge 
                      variant={query.positiveRate >= 70 ? 'default' : query.positiveRate >= 50 ? 'secondary' : 'destructive'}
                    >
                      {query.positiveRate}% positive
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
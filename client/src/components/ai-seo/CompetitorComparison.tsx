import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Users } from 'lucide-react';

interface CompetitorAnalysis {
  competitorName: string;
  mentionCount: number;
  avgRankingPosition: number | null;
  sentimentScore: number;
  marketShare: number;
}

interface CompetitorComparisonProps {
  competitors: CompetitorAnalysis[];
  brandName: string;
}

export const CompetitorComparison: React.FC<CompetitorComparisonProps> = ({ 
  competitors, 
  brandName 
}) => {
  // Sort competitors by mention count
  const sortedCompetitors = [...competitors].sort((a, b) => b.mentionCount - a.mentionCount);
  
  // Colors for the pie chart
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Prepare data for charts
  const mentionData = sortedCompetitors.map(comp => ({
    name: comp.competitorName,
    mentions: comp.mentionCount,
    ranking: comp.avgRankingPosition || 0
  }));

  const marketShareData = sortedCompetitors.map((comp, index) => ({
    name: comp.competitorName,
    value: comp.marketShare,
    fill: colors[index % colors.length]
  }));

  const getSentimentColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentBadge = (score: number) => {
    if (score >= 70) return { variant: 'default', label: 'Positive' };
    if (score >= 40) return { variant: 'secondary', label: 'Neutral' };
    return { variant: 'destructive', label: 'Negative' };
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p style={{ color: payload[0].color }}>
            Mentions: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (competitors.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Competitor Data</h3>
          <p className="text-gray-600">
            Add competitors to your brand monitoring setup to see comparison data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Competitor</p>
                <p className="text-lg font-bold">{sortedCompetitors[0]?.competitorName || 'N/A'}</p>
              </div>
              <Target className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Competitors Tracked</p>
                <p className="text-2xl font-bold">{competitors.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Your Position</p>
                <p className="text-2xl font-bold">
                  #{sortedCompetitors.findIndex(c => c.competitorName === brandName) + 1 || 'N/A'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mention Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Mention Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mentionData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="mentions" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Market Share */}
        <Card>
          <CardHeader>
            <CardTitle>Market Share Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={marketShareData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {marketShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Market Share']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Competitor Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Competitor</th>
                  <th className="text-left p-3">Mentions</th>
                  <th className="text-left p-3">Market Share</th>
                  <th className="text-left p-3">Avg Position</th>
                  <th className="text-left p-3">Sentiment</th>
                </tr>
              </thead>
              <tbody>
                {sortedCompetitors.map((competitor, index) => {
                  const sentimentBadge = getSentimentBadge(competitor.sentimentScore);
                  return (
                    <tr key={competitor.competitorName} className="border-b">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: colors[index % colors.length] }}
                          />
                          <span className="font-medium">{competitor.competitorName}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span>{competitor.mentionCount}</span>
                          {index === 0 && (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <Progress value={competitor.marketShare} className="h-2" />
                          </div>
                          <span className="text-sm">{competitor.marketShare.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono">
                          {competitor.avgRankingPosition ? `#${competitor.avgRankingPosition}` : 'N/A'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={sentimentBadge.variant as any}>
                            {sentimentBadge.label}
                          </Badge>
                          <span className={`text-sm ${getSentimentColor(competitor.sentimentScore)}`}>
                            {competitor.sentimentScore}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Competitive Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedCompetitors.length > 0 && (
              <>
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Market Leader</p>
                    <p className="text-sm text-blue-700">
                      {sortedCompetitors[0].competitorName} leads with {sortedCompetitors[0].mentionCount} mentions 
                      ({sortedCompetitors[0].marketShare.toFixed(1)}% market share)
                    </p>
                  </div>
                </div>

                {sortedCompetitors.some(c => c.sentimentScore < 40) && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">Opportunity Identified</p>
                      <p className="text-sm text-green-700">
                        Some competitors have negative sentiment scores. 
                        Focus on positive messaging to gain competitive advantage.
                      </p>
                    </div>
                  </div>
                )}

                {competitors.length < 3 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <Users className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">Add More Competitors</p>
                      <p className="text-sm text-yellow-700">
                        Track more competitors for better market analysis and positioning insights.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
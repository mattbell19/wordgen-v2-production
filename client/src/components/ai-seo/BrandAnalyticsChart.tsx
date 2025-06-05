import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

interface TimeSeriesPoint {
  date: string;
  mentions: number;
  positiveMentions: number;
  neutralMentions: number;
  negativeMentions: number;
  avgRankingPosition: number | null;
}

interface BrandAnalyticsChartProps {
  data: TimeSeriesPoint[];
}

export const BrandAnalyticsChart: React.FC<BrandAnalyticsChartProps> = ({ data }) => {
  // Format data for charts
  const chartData = data.map(point => ({
    ...point,
    date: new Date(point.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    // Invert ranking position for better visualization (lower is better)
    rankingPosition: point.avgRankingPosition ? (10 - point.avgRankingPosition) : null
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'rankingPosition' 
                ? `Avg Position: #${entry.payload.avgRankingPosition || 'N/A'}`
                : `${entry.name}: ${entry.value}`
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Mentions Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Mentions Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="mentions" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Total Mentions"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sentiment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="positiveMentions" 
                stackId="sentiment" 
                fill="#10b981" 
                name="Positive"
              />
              <Bar 
                dataKey="neutralMentions" 
                stackId="sentiment" 
                fill="#6b7280" 
                name="Neutral"
              />
              <Bar 
                dataKey="negativeMentions" 
                stackId="sentiment" 
                fill="#ef4444" 
                name="Negative"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ranking Position Trend */}
      {chartData.some(d => d.avgRankingPosition) && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Average Ranking Position Trend</CardTitle>
            <p className="text-sm text-gray-600">Lower positions are better (closer to #1)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis 
                  domain={[1, 10]}
                  tickFormatter={(value) => `#${11 - value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="rankingPosition" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Ranking Position"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
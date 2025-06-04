import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, TrendingUp, Target, Zap, Users } from 'lucide-react';
import type { QualityMetrics } from '@/lib/types';

interface QualityMetricsDisplayProps {
  metrics: QualityMetrics;
  expertPersona?: string;
  industry?: string;
  className?: string;
}

export function QualityMetricsDisplay({ 
  metrics, 
  expertPersona, 
  industry, 
  className = '' 
}: QualityMetricsDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 85) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 85) return 'secondary';
    if (score >= 75) return 'outline';
    return 'destructive';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    if (score >= 85) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 75) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getQualityLabel = (score: number) => {
    if (score >= 90) return 'Premium Quality';
    if (score >= 85) return 'Excellent Quality';
    if (score >= 75) return 'Good Quality';
    return 'Needs Improvement';
  };

  const qualityItems = [
    {
      label: 'Expert Authority',
      score: metrics.expert_authority,
      icon: <Target className="h-4 w-4" />,
      description: 'Credibility and expertise demonstration'
    },
    {
      label: 'Actionability',
      score: metrics.actionability,
      icon: <Zap className="h-4 w-4" />,
      description: 'Practical, implementable advice'
    },
    {
      label: 'Specificity',
      score: metrics.specificity,
      icon: <Target className="h-4 w-4" />,
      description: 'Concrete examples and data'
    },
    {
      label: 'Current Relevance',
      score: metrics.current_relevance,
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Up-to-date trends and information'
    },
    {
      label: 'Engagement',
      score: metrics.engagement,
      icon: <Users className="h-4 w-4" />,
      description: 'Reader engagement potential'
    }
  ];

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Content Quality Analysis</CardTitle>
          <div className="flex items-center gap-2">
            {getScoreIcon(metrics.overall_score)}
            <Badge variant={getScoreBadgeVariant(metrics.overall_score)} className="text-sm">
              {Math.round(metrics.overall_score)}/100
            </Badge>
          </div>
        </div>
        
        {(expertPersona || industry) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {expertPersona && (
              <Badge variant="outline" className="text-xs">
                Expert: {expertPersona}
              </Badge>
            )}
            {industry && (
              <Badge variant="outline" className="text-xs">
                Industry: {industry}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Quality Score</span>
            <span className={`text-sm font-bold ${getScoreColor(metrics.overall_score)}`}>
              {Math.round(metrics.overall_score)}/100
            </span>
          </div>
          <Progress 
            value={metrics.overall_score} 
            className="h-2"
          />
          <div className="text-xs text-gray-500">
            {metrics.overall_score >= 90 && "🏆 Premium quality - exceptional content ready for publication"}
            {metrics.overall_score >= 85 && metrics.overall_score < 90 && "✅ Excellent quality - ready for publication"}
            {metrics.overall_score >= 75 && metrics.overall_score < 85 && "⚠️ Good quality - minor improvements possible"}
            {metrics.overall_score < 75 && "❌ Needs improvement - consider regenerating with enhanced prompts"}
          </div>
        </div>

        {/* Individual Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Quality Breakdown</h4>
          {qualityItems.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className={`text-sm font-medium ${getScoreColor(item.score)}`}>
                  {Math.round(item.score)}
                </span>
              </div>
              <Progress value={item.score} className="h-1" />
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Quality Insights */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quality Insights</h4>
          <div className="space-y-1 text-xs text-gray-600">
            {metrics.expert_authority >= 85 && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Strong expert credibility established</span>
              </div>
            )}
            {metrics.actionability >= 85 && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Highly actionable with clear implementation steps</span>
              </div>
            )}
            {metrics.specificity >= 85 && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Rich in specific examples and data</span>
              </div>
            )}
            {metrics.current_relevance >= 85 && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Current and relevant with latest trends</span>
              </div>
            )}
            {metrics.engagement >= 85 && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>High engagement potential</span>
              </div>
            )}
            
            {/* Improvement suggestions */}
            {metrics.expert_authority < 70 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-yellow-600" />
                <span>Consider adding more expert credentials and case studies</span>
              </div>
            )}
            {metrics.actionability < 70 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-yellow-600" />
                <span>Add more step-by-step guides and practical tools</span>
              </div>
            )}
            {metrics.specificity < 70 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-yellow-600" />
                <span>Include more specific data, metrics, and examples</span>
              </div>
            )}
            {metrics.current_relevance < 70 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-yellow-600" />
                <span>Update with current trends and 2024 data</span>
              </div>
            )}
          </div>
        </div>

        {/* Quality Score Legend */}
        <div className="mt-4 p-3 border rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quality Score Guide</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>85-100: Excellent - Industry-leading quality</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>70-84: Good - Above average quality</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>0-69: Needs improvement</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default QualityMetricsDisplay;

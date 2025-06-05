import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb,
  Target,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Download,
  RefreshCw,
  Play,
  Check,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OptimizationStrategy {
  id: string;
  title: string;
  description: string;
  category: 'content' | 'positioning' | 'sentiment' | 'visibility' | 'competitive';
  priority: 'high' | 'medium' | 'low';
  impactEstimate: 'high' | 'medium' | 'low';
  effortEstimate: 'high' | 'medium' | 'low';
  actionItems: string[];
  expectedOutcomes: string[];
  metrics: string[];
  timeframe: string;
}

interface ContentGap {
  topic: string;
  competitorAdvantage: number;
  recommendedAction: string;
  priority: 'high' | 'medium' | 'low';
  keywords: string[];
}

interface OptimizationReport {
  brandId: number;
  brandName: string;
  overallScore: number;
  recommendations: OptimizationStrategy[];
  contentGaps: ContentGap[];
  quickWins: string[];
  longTermGoals: string[];
  nextActions: string[];
  generatedAt: Date;
}

interface ROIProjections {
  currentBaseline: {
    totalMentions: number;
    avgRankingPosition: number | null;
    positiveSentiment: number;
  };
  projectedImpact: {
    mentionIncrease: number;
    rankingImprovement: number;
    sentimentImprovement: number;
  };
  implementationTimeline: {
    quickWins: string;
    mediumTerm: string;
    longTerm: string;
  };
}

interface OptimizationRecommendationsProps {
  brandId: number;
}

export const OptimizationRecommendations: React.FC<OptimizationRecommendationsProps> = ({ 
  brandId 
}) => {
  const { toast } = useToast();
  const [report, setReport] = useState<OptimizationReport | null>(null);
  const [roiProjections, setRoiProjections] = useState<ROIProjections | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');

  useEffect(() => {
    fetchOptimizationData();
  }, [brandId]);

  const fetchOptimizationData = async () => {
    try {
      setLoading(true);
      const [reportResponse, roiResponse] = await Promise.all([
        fetch(`/api/llm-seo/optimization/${brandId}/report`),
        fetch(`/api/llm-seo/optimization/${brandId}/roi-projections`)
      ]);

      if (reportResponse.ok) {
        const reportData = await reportResponse.json();
        setReport(reportData);
      }

      if (roiResponse.ok) {
        const roiData = await roiResponse.json();
        setRoiProjections(roiData);
      }
    } catch (error) {
      console.error('Error fetching optimization data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch optimization recommendations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNewReport = async () => {
    try {
      setGeneratingReport(true);
      const response = await fetch(`/api/llm-seo/optimization/${brandId}/report`);
      
      if (response.ok) {
        const data = await response.json();
        setReport(data);
        toast({
          title: "Report Generated",
          description: "New optimization report has been generated successfully",
        });
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate optimization report",
        variant: "destructive"
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const updateRecommendationStatus = async (recommendationId: string, status: string) => {
    try {
      const response = await fetch(`/api/llm-seo/optimization/recommendations/${recommendationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast({
          title: "Status Updated",
          description: "Recommendation status has been updated",
        });
        fetchOptimizationData();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update recommendation status",
        variant: "destructive"
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'content':
        return <Lightbulb className="h-5 w-5 text-yellow-600" />;
      case 'positioning':
        return <Target className="h-5 w-5 text-blue-600" />;
      case 'sentiment':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'visibility':
        return <AlertCircle className="h-5 w-5 text-purple-600" />;
      case 'competitive':
        return <CheckCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="outline">Low Priority</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high':
        return <Badge className="bg-green-100 text-green-800">High Impact</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Impact</Badge>;
      case 'low':
        return <Badge className="bg-gray-100 text-gray-800">Low Impact</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getEffortBadge = (effort: string) => {
    switch (effort) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Effort</Badge>;
      case 'medium':
        return <Badge className="bg-orange-100 text-orange-800">Medium Effort</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800">Low Effort</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Optimization Recommendations</h2>
          <p className="text-gray-600">
            AI-powered insights and actionable strategies to improve your brand's LLM ranking
          </p>
        </div>
        <Button 
          onClick={generateNewReport} 
          disabled={generatingReport}
          variant="outline"
        >
          {generatingReport ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {generatingReport ? 'Generating...' : 'Refresh Report'}
        </Button>
      </div>

      {!report ? (
        <Card>
          <CardContent className="text-center py-12">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Optimization Report Available</h3>
            <p className="text-gray-600 mb-4">
              Generate your first optimization report to see personalized recommendations
            </p>
            <Button onClick={generateNewReport} disabled={generatingReport}>
              {generatingReport ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Generate Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {report.overallScore}
                  </div>
                  <div className="text-sm text-gray-600">Overall Score</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {report.recommendations.length}
                  </div>
                  <div className="text-sm text-gray-600">Recommendations</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {report.quickWins.length}
                  </div>
                  <div className="text-sm text-gray-600">Quick Wins</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {report.contentGaps.length}
                  </div>
                  <div className="text-sm text-gray-600">Content Gaps</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="quick-wins">Quick Wins</TabsTrigger>
              <TabsTrigger value="content-gaps">Content Gaps</TabsTrigger>
              <TabsTrigger value="roi">ROI Projections</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recommendations" className="space-y-6">
              {report.recommendations.map((recommendation, index) => (
                <Card key={recommendation.id} className="border-l-4 border-blue-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getCategoryIcon(recommendation.category)}
                        <div className="flex-1">
                          <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            {getPriorityBadge(recommendation.priority)}
                            {getImpactBadge(recommendation.impactEstimate)}
                            {getEffortBadge(recommendation.effortEstimate)}
                            <Badge variant="outline" className="capitalize">
                              {recommendation.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateRecommendationStatus(recommendation.id, 'in_progress')}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateRecommendationStatus(recommendation.id, 'completed')}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-gray-700">{recommendation.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-sm mb-2">Action Items:</h5>
                        <ul className="space-y-1">
                          {recommendation.actionItems.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <ArrowRight className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-sm mb-2">Expected Outcomes:</h5>
                        <ul className="space-y-1">
                          {recommendation.expectedOutcomes.map((outcome, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      <span><strong>Timeline:</strong> {recommendation.timeframe}</span>
                      <span><strong>Key Metrics:</strong> {recommendation.metrics.join(', ')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="quick-wins" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Wins (Low Effort, High Impact)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.quickWins.map((win, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span>{win}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Next Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {report.nextActions.map((action, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="content-gaps" className="space-y-6">
              {report.contentGaps.map((gap, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{gap.topic}</CardTitle>
                        {getPriorityBadge(gap.priority)}
                      </div>
                      <Badge variant="outline">
                        {gap.competitorAdvantage} mention advantage
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">{gap.recommendedAction}</p>
                    {gap.keywords.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Related Keywords:</h5>
                        <div className="flex flex-wrap gap-2">
                          {gap.keywords.map((keyword, idx) => (
                            <Badge key={idx} variant="outline">{keyword}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="roi" className="space-y-6">
              {roiProjections && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Current Baseline</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Total Mentions:</span>
                          <span className="font-medium">{roiProjections.currentBaseline.totalMentions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Position:</span>
                          <span className="font-medium">
                            {roiProjections.currentBaseline.avgRankingPosition ? 
                              `#${roiProjections.currentBaseline.avgRankingPosition}` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Positive Sentiment:</span>
                          <span className="font-medium">{roiProjections.currentBaseline.positiveSentiment}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Projected Impact</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Mention Increase:</span>
                          <span className="font-medium text-green-600">
                            +{Math.round(roiProjections.projectedImpact.mentionIncrease * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ranking Improvement:</span>
                          <span className="font-medium text-blue-600">
                            +{Math.round(roiProjections.projectedImpact.rankingImprovement * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sentiment Boost:</span>
                          <span className="font-medium text-purple-600">
                            +{Math.round(roiProjections.projectedImpact.sentimentImprovement * 100)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Implementation Timeline</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Quick Wins:</span>
                          <span className="font-medium">{roiProjections.implementationTimeline.quickWins}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Medium Term:</span>
                          <span className="font-medium">{roiProjections.implementationTimeline.mediumTerm}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Long Term:</span>
                          <span className="font-medium">{roiProjections.implementationTimeline.longTerm}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};
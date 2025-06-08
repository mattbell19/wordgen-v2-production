import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Settings,
  Play,
  Pause,
  RefreshCw,
  BarChart3,
  Users,
  Target,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrandSetupDialog } from './BrandSetupDialog';
import { BrandAnalyticsChart } from './BrandAnalyticsChart';
import { CompetitorComparison } from './CompetitorComparison';
import { BrandInsights } from './BrandInsights';
import { OptimizationRecommendations } from './OptimizationRecommendations';

interface BrandMonitoring {
  id: number;
  brandName: string;
  description?: string;
  trackingQueries: string[];
  competitors: string[];
  monitoringFrequency: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BrandAnalytics {
  totalMentions: number;
  mentionTrend: 'up' | 'down' | 'stable';
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  platformBreakdown: Record<string, number>;
  avgRankingPosition: number | null;
  competitorComparison: CompetitorAnalysis[];
  topQueries: QueryPerformance[];
  timeSeriesData: TimeSeriesPoint[];
}

interface CompetitorAnalysis {
  competitorName: string;
  mentionCount: number;
  avgRankingPosition: number | null;
  sentimentScore: number;
  marketShare: number;
}

interface QueryPerformance {
  query: string;
  mentionCount: number;
  avgRankingPosition: number | null;
  lastMentioned: Date;
  sentimentScore: number;
}

interface TimeSeriesPoint {
  date: string;
  mentions: number;
  positiveMentions: number;
  neutralMentions: number;
  negativeMentions: number;
  avgRankingPosition: number | null;
}

interface BrandHealthScore {
  overallScore: number;
  visibility: number;
  sentiment: number;
  positioning: number;
  competitiveAdvantage: number;
  factors: HealthFactor[];
}

interface HealthFactor {
  name: string;
  score: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

interface MentionInsight {
  type: 'opportunity' | 'threat' | 'trend' | 'achievement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  data: Record<string, any>;
  createdAt: Date;
}

export const LLMBrandDashboard: React.FC = () => {
  const { toast } = useToast();
  const [brands, setBrands] = useState<BrandMonitoring[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<BrandMonitoring | null>(null);
  const [analytics, setAnalytics] = useState<BrandAnalytics | null>(null);
  const [healthScore, setHealthScore] = useState<BrandHealthScore | null>(null);
  const [insights, setInsights] = useState<MentionInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchBrandAnalytics(selectedBrand.id);
    }
  }, [selectedBrand]);

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/llm-seo/brands');
      const data = await response.json();
      
      if (response.ok) {
        setBrands(data);
        if (data.length > 0 && !selectedBrand) {
          setSelectedBrand(data[0]);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch brands');
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Error",
        description: "Failed to fetch brand monitoring configurations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBrandAnalytics = async (brandId: number) => {
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await fetch(
        `/api/llm-seo/analytics/${brandId}/dashboard?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      
      if (response.ok) {
        setAnalytics(data.analytics);
        setHealthScore(data.healthScore);
        setInsights(data.insights);
      } else {
        throw new Error(data.error || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch brand analytics",
        variant: "destructive"
      });
    }
  };

  const startMonitoring = async (brandId: number) => {
    try {
      const response = await fetch(`/api/llm-seo/monitoring/${brandId}/start`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast({
          title: "Monitoring Started",
          description: "Brand monitoring has been started successfully",
        });
        fetchBrands();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start monitoring');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start monitoring",
        variant: "destructive"
      });
    }
  };

  const pauseMonitoring = async (brandId: number) => {
    try {
      const response = await fetch(`/api/llm-seo/monitoring/${brandId}/pause`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast({
          title: "Monitoring Paused",
          description: "Brand monitoring has been paused",
        });
        fetchBrands();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to pause monitoring');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to pause monitoring",
        variant: "destructive"
      });
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-blue-600" />
            LLM Brand Ranking
          </h1>
          <p className="text-gray-600">
            Monitor and optimize your brand presence in AI language model responses
          </p>
        </div>
        <Button onClick={() => setShowSetupDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Brand
        </Button>
      </div>

      {brands.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Get Started with LLM Brand Monitoring</h3>
            <p className="text-gray-600 mb-4">
              Track how your brand appears in AI responses across ChatGPT, Claude, and other LLMs
            </p>
            <Button onClick={() => setShowSetupDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Brand Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Brand Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {brands.map((brand) => (
              <Button
                key={brand.id}
                variant={selectedBrand?.id === brand.id ? "default" : "outline"}
                onClick={() => setSelectedBrand(brand)}
                className="whitespace-nowrap"
              >
                {brand.brandName}
                {brand.isActive ? (
                  <Activity className="h-3 w-3 ml-2 text-green-500" />
                ) : (
                  <Pause className="h-3 w-3 ml-2 text-gray-400" />
                )}
              </Button>
            ))}
          </div>

          {selectedBrand && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Health Score</p>
                        <p className={`text-2xl font-bold ${getHealthScoreColor(healthScore?.overallScore || 0)}`}>
                          {healthScore?.overallScore || 0}
                        </p>
                      </div>
                      <Zap className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Mentions</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">{analytics?.totalMentions || 0}</p>
                          {analytics?.mentionTrend && getTrendIcon(analytics.mentionTrend)}
                        </div>
                      </div>
                      <BarChart3 className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Position</p>
                        <p className="text-2xl font-bold">
                          {analytics?.avgRankingPosition ? `#${analytics.avgRankingPosition}` : 'N/A'}
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Competitors</p>
                        <p className="text-2xl font-bold">{analytics?.competitorComparison.length || 0}</p>
                      </div>
                      <Users className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Brand Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Brand Controls</span>
                    <div className="flex gap-2">
                      {selectedBrand.isActive ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => pauseMonitoring(selectedBrand.id)}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => startMonitoring(selectedBrand.id)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Status</p>
                      <Badge variant={selectedBrand.isActive ? "default" : "secondary"}>
                        {selectedBrand.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Frequency</p>
                      <p className="text-sm">{selectedBrand.monitoringFrequency}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Tracking Queries</p>
                      <p className="text-sm">{selectedBrand.trackingQueries.length} queries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Main Analytics */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="competitors">Competitors</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="optimization">Optimization</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  {analytics && (
                    <>
                      <BrandAnalyticsChart data={analytics.timeSeriesData} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Sentiment Breakdown</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Positive</span>
                                <span className="text-sm font-medium text-green-600">
                                  {analytics.sentimentBreakdown.positive}
                                </span>
                              </div>
                              <Progress 
                                value={(analytics.sentimentBreakdown.positive / analytics.totalMentions) * 100} 
                                className="h-2"
                              />
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Neutral</span>
                                <span className="text-sm font-medium text-gray-600">
                                  {analytics.sentimentBreakdown.neutral}
                                </span>
                              </div>
                              <Progress 
                                value={(analytics.sentimentBreakdown.neutral / analytics.totalMentions) * 100} 
                                className="h-2"
                              />
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Negative</span>
                                <span className="text-sm font-medium text-red-600">
                                  {analytics.sentimentBreakdown.negative}
                                </span>
                              </div>
                              <Progress 
                                value={(analytics.sentimentBreakdown.negative / analytics.totalMentions) * 100} 
                                className="h-2"
                              />
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle>Platform Distribution</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {Object.entries(analytics.platformBreakdown).map(([platform, count]) => (
                                <div key={platform} className="flex justify-between items-center">
                                  <span className="text-sm capitalize">{platform}</span>
                                  <span className="text-sm font-medium">{count}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="analytics" className="space-y-6">
                  {analytics && <BrandAnalyticsChart data={analytics.timeSeriesData} />}
                </TabsContent>
                
                <TabsContent value="competitors" className="space-y-6">
                  {analytics && (
                    <CompetitorComparison 
                      competitors={analytics.competitorComparison}
                      brandName={selectedBrand.brandName}
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="insights" className="space-y-6">
                  <BrandInsights insights={insights} />
                </TabsContent>
                
                <TabsContent value="optimization" className="space-y-6">
                  <OptimizationRecommendations brandId={selectedBrand.id} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </>
      )}

      {/* Setup Dialog */}
      <BrandSetupDialog 
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        onBrandCreated={fetchBrands}
      />
    </div>
  );
};
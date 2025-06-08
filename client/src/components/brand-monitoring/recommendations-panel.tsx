import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Target, 
  TrendingUp, 
  MessageSquare, 
  Users,
  Zap,
  RefreshCw,
  Eye,
  Play,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Recommendation {
  id: number;
  brandId: number;
  category: 'content_strategy' | 'competitive_positioning' | 'sentiment_improvement' | 'visibility_boost' | 'query_optimization';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact: string;
  timeframe: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface RecommendationsPanelProps {
  brandId: number;
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({ brandId }) => {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchRecommendations();
  }, [brandId, categoryFilter, priorityFilter, statusFilter]);

  const fetchRecommendations = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/brand-monitoring/${brandId}/recommendations?${params}`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch recommendations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRecommendationStatus = async (recommendationId: number, status: string, progress?: number) => {
    try {
      const response = await fetch(`/api/brand-monitoring/recommendations/${recommendationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, progress: progress || 0 })
      });

      if (!response.ok) throw new Error('Failed to update recommendation');

      toast({
        title: "Updated",
        description: "Recommendation status updated successfully",
      });

      fetchRecommendations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update recommendation",
        variant: "destructive"
      });
    }
  };

  const generateAnalysisReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/brand-monitoring/${brandId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframe: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
          },
          analysisDepth: 'comprehensive'
        })
      });

      if (!response.ok) throw new Error('Failed to generate analysis report');

      toast({
        title: "Analysis Complete",
        description: "New recommendations have been generated",
      });

      fetchRecommendations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate analysis report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <TrendingUp className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <Target className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-200 bg-red-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'dismissed':
        return <X className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'content_strategy':
        return <MessageSquare className="h-4 w-4" />;
      case 'competitive_positioning':
        return <Users className="h-4 w-4" />;
      case 'sentiment_improvement':
        return <TrendingUp className="h-4 w-4" />;
      case 'visibility_boost':
        return <Eye className="h-4 w-4" />;
      case 'query_optimization':
        return <Zap className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const formatCategory = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const filteredRecommendations = recommendations;

  if (loading && recommendations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header and Filters */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Recommendations</h3>
          <Button onClick={generateAnalysisReport} disabled={loading}>
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Generate New Analysis
          </Button>
        </div>

        <div className="flex flex-wrap gap-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="content_strategy">Content Strategy</SelectItem>
              <SelectItem value="competitive_positioning">Competitive Positioning</SelectItem>
              <SelectItem value="sentiment_improvement">Sentiment Improvement</SelectItem>
              <SelectItem value="visibility_boost">Visibility Boost</SelectItem>
              <SelectItem value="query_optimization">Query Optimization</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Recommendations List */}
        {filteredRecommendations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
              <p className="text-gray-600 mb-4">
                Generate an analysis report to get personalized recommendations for your brand
              </p>
              <Button onClick={generateAnalysisReport}>
                <Zap className="h-4 w-4 mr-2" />
                Generate Recommendations
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRecommendations.map((recommendation) => (
              <Card 
                key={recommendation.id} 
                className={`border-l-4 ${getPriorityColor(recommendation.priority)} transition-all hover:shadow-md`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getCategoryIcon(recommendation.category)}
                        <h4 className="font-semibold">{recommendation.title}</h4>
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(recommendation.priority)}
                          <Badge variant="outline" className="text-xs">
                            {recommendation.priority}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(recommendation.status)}
                            <Badge 
                              variant={
                                recommendation.status === 'completed' ? 'default' :
                                recommendation.status === 'in_progress' ? 'secondary' :
                                recommendation.status === 'dismissed' ? 'outline' : 'outline'
                              }
                              className="text-xs"
                            >
                              {recommendation.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-3">{recommendation.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Category:</span>
                          <p className="text-gray-600">{formatCategory(recommendation.category)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Expected Impact:</span>
                          <p className="text-gray-600">{recommendation.expectedImpact}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Timeframe:</span>
                          <p className="text-gray-600">{recommendation.timeframe}</p>
                        </div>
                      </div>

                      {recommendation.status === 'in_progress' && recommendation.progress > 0 && (
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm text-gray-600">{recommendation.progress}%</span>
                          </div>
                          <Progress value={recommendation.progress} className="h-2" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRecommendation(recommendation)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {recommendation.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateRecommendationStatus(recommendation.id, 'in_progress', 0)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {recommendation.status === 'in_progress' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateRecommendationStatus(recommendation.id, 'completed', 100)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {recommendation.status !== 'dismissed' && recommendation.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateRecommendationStatus(recommendation.id, 'dismissed', 0)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recommendation Detail Dialog */}
      <Dialog open={!!selectedRecommendation} onOpenChange={() => setSelectedRecommendation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRecommendation && getCategoryIcon(selectedRecommendation.category)}
              {selectedRecommendation?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecommendation && (
            <div className="space-y-6">
              {/* Status and Priority */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getPriorityIcon(selectedRecommendation.priority)}
                  <Badge variant="outline">
                    {selectedRecommendation.priority} priority
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedRecommendation.status)}
                  <Badge variant="secondary">
                    {selectedRecommendation.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-gray-600">{selectedRecommendation.description}</p>
              </div>

              {/* Action Items */}
              <div>
                <h4 className="font-semibold mb-2">Action Items</h4>
                <ul className="space-y-2">
                  {selectedRecommendation.actionItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Impact and Timeframe */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Expected Impact</h4>
                  <p className="text-sm text-gray-600">{selectedRecommendation.expectedImpact}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Timeframe</h4>
                  <p className="text-sm text-gray-600">{selectedRecommendation.timeframe}</p>
                </div>
              </div>

              {/* Progress */}
              {selectedRecommendation.status === 'in_progress' && (
                <div>
                  <h4 className="font-semibold mb-2">Progress</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completion</span>
                      <span className="text-sm font-medium">{selectedRecommendation.progress}%</span>
                    </div>
                    <Progress value={selectedRecommendation.progress} className="h-2" />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedRecommendation.status === 'pending' && (
                  <Button
                    onClick={() => {
                      updateRecommendationStatus(selectedRecommendation.id, 'in_progress', 0);
                      setSelectedRecommendation(null);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Working
                  </Button>
                )}
                
                {selectedRecommendation.status === 'in_progress' && (
                  <Button
                    onClick={() => {
                      updateRecommendationStatus(selectedRecommendation.id, 'completed', 100);
                      setSelectedRecommendation(null);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                
                {selectedRecommendation.status !== 'dismissed' && selectedRecommendation.status !== 'completed' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateRecommendationStatus(selectedRecommendation.id, 'dismissed', 0);
                      setSelectedRecommendation(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb,
  Target,
  ArrowRight,
  Clock
} from 'lucide-react';

interface MentionInsight {
  type: 'opportunity' | 'threat' | 'trend' | 'achievement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  data: Record<string, any>;
  createdAt: Date;
}

interface BrandInsightsProps {
  insights: MentionInsight[];
}

export const BrandInsights: React.FC<BrandInsightsProps> = ({ insights }) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <Lightbulb className="h-5 w-5 text-green-600" />;
      case 'threat':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'trend':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'achievement':
        return <CheckCircle className="h-5 w-5 text-purple-600" />;
      default:
        return <Target className="h-5 w-5 text-gray-600" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'border-green-200 bg-green-50';
      case 'threat':
        return 'border-red-200 bg-red-50';
      case 'trend':
        return 'border-blue-200 bg-blue-50';
      case 'achievement':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateActionSuggestions = (insight: MentionInsight) => {
    const suggestions = [];
    
    switch (insight.type) {
      case 'opportunity':
        suggestions.push('Create content addressing this opportunity');
        suggestions.push('Optimize existing content for better positioning');
        break;
      case 'threat':
        suggestions.push('Monitor competitor activities closely');
        suggestions.push('Develop counter-messaging strategy');
        break;
      case 'achievement':
        suggestions.push('Amplify this success in marketing materials');
        suggestions.push('Document and replicate successful strategies');
        break;
      case 'trend':
        suggestions.push('Leverage this trend in content strategy');
        suggestions.push('Monitor trend development over time');
        break;
    }
    
    return suggestions;
  };

  // Group insights by priority
  const groupedInsights = insights.reduce((acc, insight) => {
    if (!acc[insight.priority]) {
      acc[insight.priority] = [];
    }
    acc[insight.priority].push(insight);
    return acc;
  }, {} as Record<string, MentionInsight[]>);

  const priorityOrder = ['high', 'medium', 'low'];

  if (insights.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Insights Available</h3>
          <p className="text-gray-600">
            Insights will appear here as we analyze your brand mentions and performance data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {insights.filter(i => i.type === 'threat').length}
              </div>
              <div className="text-sm text-gray-600">Threats</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {insights.filter(i => i.type === 'opportunity').length}
              </div>
              <div className="text-sm text-gray-600">Opportunities</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {insights.filter(i => i.type === 'achievement').length}
              </div>
              <div className="text-sm text-gray-600">Achievements</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {insights.filter(i => i.type === 'trend').length}
              </div>
              <div className="text-sm text-gray-600">Trends</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights by Priority */}
      {priorityOrder.map(priority => {
        const priorityInsights = groupedInsights[priority];
        if (!priorityInsights || priorityInsights.length === 0) return null;

        return (
          <div key={priority}>
            <h3 className="text-lg font-semibold mb-4 capitalize">
              {priority} Priority Insights ({priorityInsights.length})
            </h3>
            
            <div className="space-y-4">
              {priorityInsights.map((insight, index) => (
                <Card key={index} className={`border-l-4 ${getInsightColor(insight.type)}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <CardTitle className="text-base">{insight.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {getPriorityBadge(insight.priority)}
                            <Badge variant="outline" className="capitalize">
                              {insight.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(insight.createdAt)}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-gray-700 mb-4">{insight.description}</p>
                    
                    {/* Data Points */}
                    {Object.keys(insight.data).length > 0 && (
                      <div className="bg-white rounded-lg p-3 mb-4 border">
                        <h5 className="font-medium text-sm mb-2">Key Data:</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(insight.data).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                              </span>
                              <span className="font-medium">
                                {typeof value === 'number' && value % 1 !== 0 
                                  ? value.toFixed(2) 
                                  : value?.toString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Action Suggestions */}
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm">Suggested Actions:</h5>
                      <div className="space-y-1">
                        {generateActionSuggestions(insight).map((suggestion, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <ArrowRight className="h-3 w-3 text-gray-400" />
                            <span>{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start">
              <TrendingUp className="h-4 w-4 mr-2" />
              Export Insights Report
            </Button>
            <Button variant="outline" className="justify-start">
              <Target className="h-4 w-4 mr-2" />
              Create Action Plan
            </Button>
            <Button variant="outline" className="justify-start">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Insights as Reviewed
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
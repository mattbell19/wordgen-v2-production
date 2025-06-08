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
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Bot
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnhancedBrandSetupDialog } from './enhanced-brand-setup-dialog';
import { BrandMentionsTable } from './brand-mentions-table';
import { BrandAnalyticsChart } from './brand-analytics-chart';
import { QueryGenerationDialog } from './query-generation-dialog';
import { RecommendationsPanel } from './recommendations-panel';

interface BrandMonitoring {
  id: number;
  brandName: string;
  description?: string;
  trackingQueries: string[];
  competitors: string[];
  monitoringFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

interface JobStatus {
  id: number;
  jobType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

interface SystemStatus {
  scheduler: {
    isRunning: boolean;
    currentlyProcessing: number;
    maxConcurrentJobs: number;
    queueProcessInterval: number;
  };
  queue: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    successRate: number;
  };
  platforms: Array<{
    name: string;
    enabled: boolean;
    rateLimitPerMinute: number;
  }>;
}

export const BrandMonitoringDashboard: React.FC = () => {
  const { toast } = useToast();
  const [brands, setBrands] = useState<BrandMonitoring[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<BrandMonitoring | null>(null);
  const [mentions, setMentions] = useState<BrandMention[]>([]);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showQueryDialog, setShowQueryDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchBrands();
    fetchSystemStatus();
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      if (selectedBrand) {
        fetchJobs(selectedBrand.id);
      }
      fetchSystemStatus();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchMentions(selectedBrand.id);
      fetchJobs(selectedBrand.id);
    }
  }, [selectedBrand]);

  const fetchBrands = async () => {
    try {
      console.log('BrandMonitoringDashboard: Fetching brands from /api/brand-monitoring');
      const response = await fetch('/api/brand-monitoring');
      if (!response.ok) throw new Error('Failed to fetch brands');
      
      const data = await response.json();
      setBrands(data.brands || []);
      
      if (data.brands?.length > 0 && !selectedBrand) {
        setSelectedBrand(data.brands[0]);
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

  const fetchMentions = async (brandId: number) => {
    try {
      const response = await fetch(`/api/brand-monitoring/${brandId}/mentions?limit=50`);
      if (!response.ok) throw new Error('Failed to fetch mentions');
      
      const data = await response.json();
      setMentions(data.mentions || []);
    } catch (error) {
      console.error('Error fetching mentions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch brand mentions",
        variant: "destructive"
      });
    }
  };

  const fetchJobs = async (brandId: number) => {
    try {
      const response = await fetch(`/api/brand-monitoring/${brandId}/jobs?limit=20`);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/brand-monitoring/system/status');
      if (!response.ok) throw new Error('Failed to fetch system status');
      
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const startMonitoring = async (brandId: number) => {
    try {
      const response = await fetch(`/api/brand-monitoring/${brandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });
      
      if (!response.ok) throw new Error('Failed to start monitoring');
      
      toast({
        title: "Monitoring Started",
        description: "Brand monitoring has been activated",
      });
      
      fetchBrands();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start monitoring",
        variant: "destructive"
      });
    }
  };

  const pauseMonitoring = async (brandId: number) => {
    try {
      const response = await fetch(`/api/brand-monitoring/${brandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false })
      });
      
      if (!response.ok) throw new Error('Failed to pause monitoring');
      
      toast({
        title: "Monitoring Paused",
        description: "Brand monitoring has been paused",
      });
      
      fetchBrands();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pause monitoring",
        variant: "destructive"
      });
    }
  };

  const queueJob = async (brandId: number, jobType: string) => {
    try {
      const response = await fetch(`/api/brand-monitoring/${brandId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType,
          priority: 'normal',
          config: {}
        })
      });
      
      if (!response.ok) throw new Error('Failed to queue job');
      
      toast({
        title: "Job Queued",
        description: `${jobType} job has been added to the queue`,
      });
      
      fetchJobs(brandId);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to queue job",
        variant: "destructive"
      });
    }
  };

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getSentimentStats = () => {
    if (!mentions.length) return { positive: 0, neutral: 0, negative: 0 };
    
    const stats = mentions.reduce(
      (acc, mention) => {
        acc[mention.sentiment]++;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );
    
    return stats;
  };

  const getAverageRanking = () => {
    const rankedMentions = mentions.filter(m => m.rankingPosition !== null);
    if (!rankedMentions.length) return null;
    
    const total = rankedMentions.reduce((sum, mention) => sum + mention.rankingPosition!, 0);
    return Math.round(total / rankedMentions.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const sentimentStats = getSentimentStats();
  const avgRanking = getAverageRanking();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-600" />
            Brand Monitoring
          </h1>
          <p className="text-gray-600">
            Track and optimize your brand presence across AI language models
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowQueryDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Queries
          </Button>
          <Button onClick={() => setShowSetupDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Brand
          </Button>
        </div>
      </div>

      {/* System Status Banner */}
      {systemStatus && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${systemStatus.scheduler.isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">
                    Scheduler {systemStatus.scheduler.isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Queue: {systemStatus.queue.pending} pending, {systemStatus.queue.running} running
                </div>
                <div className="text-sm text-gray-600">
                  Success Rate: {systemStatus.queue.successRate}%
                </div>
              </div>
              <div className="flex items-center gap-2">
                {systemStatus.platforms.map(platform => (
                  <Badge
                    key={platform.name}
                    variant={platform.enabled ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {platform.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {brands.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <Target className="h-12 w-12 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to AI Brand Monitoring
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Track how your brand appears in AI language model responses. Get insights, 
              monitor sentiment, and optimize your brand presence across ChatGPT, Claude, and more.
            </p>
            
            <div className="space-y-4">
              <Button 
                onClick={() => setShowSetupDialog(true)}
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Brand Profile
              </Button>
              
              <div className="grid grid-cols-3 gap-4 mt-8 text-sm">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-lg p-3 mb-2">
                    <Bot className="h-6 w-6 text-blue-600 mx-auto" />
                  </div>
                  <div className="font-medium">AI-Powered</div>
                  <div className="text-gray-500">Smart query generation</div>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 rounded-lg p-3 mb-2">
                    <TrendingUp className="h-6 w-6 text-green-600 mx-auto" />
                  </div>
                  <div className="font-medium">Real-time</div>
                  <div className="text-gray-500">Live monitoring</div>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 rounded-lg p-3 mb-2">
                    <Target className="h-6 w-6 text-purple-600 mx-auto" />
                  </div>
                  <div className="font-medium">Actionable</div>
                  <div className="text-gray-500">Optimization tips</div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
                        <p className="text-sm font-medium text-gray-600">Total Mentions</p>
                        <p className="text-2xl font-bold">{mentions.length}</p>
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
                          {avgRanking ? `#${avgRanking}` : 'N/A'}
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
                        <p className="text-sm font-medium text-gray-600">Positive %</p>
                        <p className="text-2xl font-bold text-green-600">
                          {mentions.length ? Math.round((sentimentStats.positive / mentions.length) * 100) : 0}%
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                        <p className="text-2xl font-bold">
                          {jobs.filter(job => job.status === 'running' || job.status === 'pending').length}
                        </p>
                      </div>
                      <RefreshCw className="h-8 w-8 text-blue-600" />
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => queueJob(selectedBrand.id, 'brand_scan')}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Scan Now
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
                      <p className="text-sm capitalize">{selectedBrand.monitoringFrequency}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Tracking Queries</p>
                      <p className="text-sm">{selectedBrand.trackingQueries.length} queries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Main Content */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="mentions">Mentions</TabsTrigger>
                  <TabsTrigger value="jobs">Jobs</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  {mentions.length > 0 && (
                    <BrandAnalyticsChart mentions={mentions} />
                  )}
                  
                  {/* Recent Jobs */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Jobs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {jobs.slice(0, 5).map((job) => (
                          <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {getJobStatusIcon(job.status)}
                              <div>
                                <p className="font-medium capitalize">{job.jobType.replace('_', ' ')}</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(job.scheduledAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={
                                job.status === 'completed' ? 'default' :
                                job.status === 'failed' ? 'destructive' :
                                job.status === 'running' ? 'secondary' : 'outline'
                              }>
                                {job.status}
                              </Badge>
                              {job.status === 'running' && (
                                <Progress value={job.progress} className="w-20 mt-1" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="mentions" className="space-y-6">
                  <BrandMentionsTable mentions={mentions} />
                </TabsContent>
                
                <TabsContent value="jobs" className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Job Queue</h3>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => queueJob(selectedBrand.id, 'brand_scan')}
                      >
                        Queue Brand Scan
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => queueJob(selectedBrand.id, 'trend_analysis')}
                      >
                        Queue Trend Analysis
                      </Button>
                    </div>
                  </div>
                  
                  <Card>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {jobs.map((job) => (
                          <div key={job.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getJobStatusIcon(job.status)}
                              <div>
                                <p className="font-medium capitalize">{job.jobType.replace('_', ' ')}</p>
                                <p className="text-sm text-gray-600">
                                  Scheduled: {new Date(job.scheduledAt).toLocaleString()}
                                </p>
                                {job.errorMessage && (
                                  <p className="text-sm text-red-600">{job.errorMessage}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={
                                job.status === 'completed' ? 'default' :
                                job.status === 'failed' ? 'destructive' :
                                job.status === 'running' ? 'secondary' : 'outline'
                              }>
                                {job.status}
                              </Badge>
                              {job.status === 'running' && (
                                <div className="mt-2">
                                  <Progress value={job.progress} className="w-24" />
                                  <p className="text-xs text-gray-600 mt-1">{job.progress}%</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="recommendations" className="space-y-6">
                  <RecommendationsPanel brandId={selectedBrand.id} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </>
      )}

      {/* Dialogs */}
      <EnhancedBrandSetupDialog 
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        onBrandCreated={fetchBrands}
      />
      
      <QueryGenerationDialog
        open={showQueryDialog}
        onOpenChange={setShowQueryDialog}
        brandId={selectedBrand?.id}
      />
    </div>
  );
};
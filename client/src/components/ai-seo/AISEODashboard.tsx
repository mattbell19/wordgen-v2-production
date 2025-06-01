import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Eye, 
  Download, 
  Trash2,
  BarChart3,
  TrendingUp,
  FileText,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AISEOGenerator } from './AISEOGenerator';

interface SEOTask {
  task_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  current_agent?: string;
  created_at: string;
  updated_at: string;
  result?: any;
  error_message?: string;
}

interface TaskStats {
  total: number;
  completed: number;
  failed: number;
  in_progress: number;
}

export const AISEODashboard: React.FC = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<SEOTask[]>([]);
  const [stats, setStats] = useState<TaskStats>({ total: 0, completed: 0, failed: 0, in_progress: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<SEOTask | null>(null);
  const [activeTab, setActiveTab] = useState('generator');

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/ai-seo/tasks');
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.tasks || []);
        
        // Calculate stats
        const total = data.tasks?.length || 0;
        const completed = data.tasks?.filter((t: SEOTask) => t.status === 'completed').length || 0;
        const failed = data.tasks?.filter((t: SEOTask) => t.status === 'failed').length || 0;
        const in_progress = data.tasks?.filter((t: SEOTask) => t.status === 'in_progress').length || 0;
        
        setStats({ total, completed, failed, in_progress });
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/ai-seo/task/${taskId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Task Cancelled",
          description: "The task has been cancelled successfully",
        });
        fetchTasks();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel task",
        variant: "destructive"
      });
    }
  };

  const viewTaskResult = (task: SEOTask) => {
    setSelectedTask(task);
    setActiveTab('results');
  };

  const downloadArticle = (article: any) => {
    const content = `# ${article.title}\n\n${article.content}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      in_progress: 'secondary',
      pending: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-600" />
          AI SEO Dashboard
        </h1>
        <p className="text-gray-600">
          Manage your AI-generated SEO content and track generation progress
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Articles</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
              </div>
              <Loader2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generator">Generate New Article</TabsTrigger>
          <TabsTrigger value="tasks">Task History</TabsTrigger>
          <TabsTrigger value="results">View Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generator" className="space-y-6">
          <AISEOGenerator onArticleGenerated={fetchTasks} />
        </TabsContent>
        
        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks found. Generate your first AI SEO article!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.task_id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(task.status)}
                          <div>
                            <p className="font-medium">Task {task.task_id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-600">
                              Created: {formatDate(task.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(task.status)}
                          {task.status === 'completed' && task.result?.article && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewTaskResult(task)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          )}
                          {task.status === 'in_progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelTask(task.task_id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {task.status === 'in_progress' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{task.progress}%</span>
                          </div>
                          <Progress value={task.progress} />
                          {task.current_agent && (
                            <p className="text-sm text-gray-600">
                              Current: {task.current_agent.replace('_', ' ')}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {task.status === 'failed' && task.error_message && (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-sm text-red-800">{task.error_message}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-6">
          {selectedTask?.result?.article ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated Article</span>
                  <Button
                    variant="outline"
                    onClick={() => downloadArticle(selectedTask.result.article)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Article Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedTask.result.article.word_count}
                    </div>
                    <div className="text-sm text-gray-600">Words</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedTask.result.article.seo_score}
                    </div>
                    <div className="text-sm text-gray-600">SEO Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedTask.result.article.reading_time}
                    </div>
                    <div className="text-sm text-gray-600">Min Read</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedTask.result.article.internal_links.length + 
                       selectedTask.result.article.external_links.length}
                    </div>
                    <div className="text-sm text-gray-600">Links</div>
                  </div>
                </div>
                
                {/* Article Content */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Title</h3>
                    <p className="text-gray-800">{selectedTask.result.article.title}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Meta Description</h3>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded">
                      {selectedTask.result.article.meta_description}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Content Preview</h3>
                    <div className="prose max-w-none bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
                      <div dangerouslySetInnerHTML={{ 
                        __html: selectedTask.result.article.content.slice(0, 2000) + '...' 
                      }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-gray-500">Select a completed task to view results</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

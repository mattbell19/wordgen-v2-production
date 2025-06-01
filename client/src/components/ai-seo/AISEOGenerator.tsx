import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Sparkles, 
  Target, 
  Globe, 
  BarChart3, 
  CheckCircle, 
  AlertCircle,
  Copy,
  Download,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AISEOGeneratorProps {
  onArticleGenerated?: (article: any) => void;
}

interface GenerationTask {
  taskId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  currentAgent?: string;
  result?: any;
  error?: string;
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'conversational', label: 'Conversational' }
];

const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'fitness', label: 'Fitness & Health' },
  { value: 'other', label: 'Other' }
];

const AGENT_DESCRIPTIONS = {
  coordinator: 'Planning workflow and strategy',
  sitemap_analyzer: 'Analyzing website structure',
  research: 'Researching keywords and competition',
  link_discovery: 'Finding link opportunities',
  content_generator: 'Creating SEO-optimized content',
  humanizer: 'Making content more natural',
  seo_optimizer: 'Final SEO optimization',
  quality_assurance: 'Quality validation and review'
};

export const AISEOGenerator: React.FC<AISEOGeneratorProps> = ({ onArticleGenerated }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTask, setCurrentTask] = useState<GenerationTask | null>(null);
  const [generatedArticle, setGeneratedArticle] = useState<any>(null);
  
  // Form state
  const [keywords, setKeywords] = useState<string[]>(['']);
  const [siteUrl, setSiteUrl] = useState('');
  const [targetWordCount, setTargetWordCount] = useState(3000);
  const [tone, setTone] = useState('professional');
  const [industry, setIndustry] = useState('technology');
  const [includeInternalLinks, setIncludeInternalLinks] = useState(true);
  const [includeExternalLinks, setIncludeExternalLinks] = useState(true);
  const [customInstructions, setCustomInstructions] = useState('');

  // Polling for task status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentTask && currentTask.status === 'in_progress') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/ai-seo/task/${currentTask.taskId}`);
          const data = await response.json();
          
          if (data.success) {
            setCurrentTask(data.data || data);
            
            if (data.status === 'completed' && data.article) {
              setGeneratedArticle(data.article);
              setIsGenerating(false);
              onArticleGenerated?.(data.article);
              toast({
                title: "Article Generated Successfully!",
                description: `Created ${data.article.word_count} words with SEO score ${data.article.seo_score}`,
              });
            } else if (data.status === 'failed') {
              setIsGenerating(false);
              toast({
                title: "Generation Failed",
                description: data.error || "An error occurred during generation",
                variant: "destructive"
              });
            }
          }
        } catch (error) {
          console.error('Error polling task status:', error);
        }
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentTask, onArticleGenerated, toast]);

  const addKeyword = () => {
    setKeywords([...keywords, '']);
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };

  const removeKeyword = (index: number) => {
    if (keywords.length > 1) {
      setKeywords(keywords.filter((_, i) => i !== index));
    }
  };

  const handleGenerate = async () => {
    const validKeywords = keywords.filter(k => k.trim());
    
    if (validKeywords.length === 0) {
      toast({
        title: "Keywords Required",
        description: "Please enter at least one keyword",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setCurrentTask(null);
    setGeneratedArticle(null);

    try {
      const response = await fetch('/api/ai-seo/generate-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: validKeywords,
          siteUrl: siteUrl || undefined,
          targetWordCount,
          tone,
          industry,
          includeInternalLinks,
          includeExternalLinks,
          customInstructions: customInstructions || undefined
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentTask({
          taskId: data.data.task_id,
          status: 'pending',
          progress: 0
        });
        
        toast({
          title: "Generation Started",
          description: "Your AI SEO article is being created by 8 specialized agents",
        });
      } else {
        throw new Error(data.message || 'Failed to start generation');
      }
    } catch (error) {
      setIsGenerating(false);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Content has been copied to your clipboard",
    });
  };

  const downloadArticle = () => {
    if (!generatedArticle) return;
    
    const content = `# ${generatedArticle.title}\n\n${generatedArticle.content}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedArticle.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-600" />
          AI SEO Agent Generator
        </h1>
        <p className="text-gray-600">
          Create SEO-optimized content with 8 specialized AI agents working together
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Content Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Keywords */}
              <div className="space-y-2">
                <Label>Keywords *</Label>
                {keywords.map((keyword, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={index === 0 ? "Primary keyword" : "Secondary keyword"}
                      value={keyword}
                      onChange={(e) => updateKeyword(index, e.target.value)}
                    />
                    {keywords.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeKeyword(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addKeyword}>
                  Add Keyword
                </Button>
              </div>

              {/* Site URL */}
              <div className="space-y-2">
                <Label>Website URL (Optional)</Label>
                <Input
                  placeholder="https://your-website.com"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Used for sitemap analysis and internal linking opportunities
                </p>
              </div>

              {/* Configuration Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Word Count</Label>
                  <Input
                    type="number"
                    min="500"
                    max="10000"
                    value={targetWordCount}
                    onChange={(e) => setTargetWordCount(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Link Options */}
              <div className="space-y-2">
                <Label>Link Options</Label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={includeInternalLinks}
                      onChange={(e) => setIncludeInternalLinks(e.target.checked)}
                    />
                    <span>Include Internal Links</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={includeExternalLinks}
                      onChange={(e) => setIncludeExternalLinks(e.target.checked)}
                    />
                    <span>Include External Links</span>
                  </label>
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-2">
                <Label>Custom Instructions (Optional)</Label>
                <Textarea
                  placeholder="Any specific requirements or focus areas..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Article...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate AI SEO Article
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Progress Panel */}
        <div className="space-y-6">
          {/* Agent Progress */}
          {currentTask && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Generation Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{currentTask.progress}%</span>
                  </div>
                  <Progress value={currentTask.progress} />
                </div>

                {currentTask.currentAgent && (
                  <div className="space-y-2">
                    <Badge variant="secondary" className="w-full justify-center">
                      {currentTask.currentAgent.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <p className="text-sm text-gray-600 text-center">
                      {AGENT_DESCRIPTIONS[currentTask.currentAgent as keyof typeof AGENT_DESCRIPTIONS]}
                    </p>
                  </div>
                )}

                <div className="text-center">
                  {currentTask.status === 'completed' ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Completed</span>
                    </div>
                  ) : currentTask.status === 'failed' ? (
                    <div className="flex items-center justify-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Failed</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processing</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agent Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                AI Agent System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="font-medium">8 Specialized Agents:</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Coordinator - Workflow orchestration</li>
                  <li>• Sitemap Analyzer - Site structure analysis</li>
                  <li>• Research - Keyword & competitor research</li>
                  <li>• Link Discovery - Link opportunities</li>
                  <li>• Content Generator - SEO content creation</li>
                  <li>• Humanizer - Natural language enhancement</li>
                  <li>• SEO Optimizer - Technical optimization</li>
                  <li>• Quality Assurance - Final validation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results Panel */}
      {generatedArticle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Generated Article
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedArticle.content)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadArticle}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="raw">Raw HTML</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="space-y-4">
                <div className="prose max-w-none">
                  <h1>{generatedArticle.title}</h1>
                  <div dangerouslySetInnerHTML={{ __html: generatedArticle.content }} />
                </div>
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{generatedArticle.word_count}</div>
                    <div className="text-sm text-gray-600">Words</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{generatedArticle.seo_score}</div>
                    <div className="text-sm text-gray-600">SEO Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{generatedArticle.reading_time}</div>
                    <div className="text-sm text-gray-600">Min Read</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {generatedArticle.internal_links.length + generatedArticle.external_links.length}
                    </div>
                    <div className="text-sm text-gray-600">Links</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Meta Description</h3>
                  <p className="text-sm bg-gray-50 p-3 rounded">{generatedArticle.meta_description}</p>
                </div>
              </TabsContent>
              
              <TabsContent value="raw">
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
                  {generatedArticle.content}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

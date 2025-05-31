import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { useQueueStatus } from "@/hooks/use-queue-status";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";

interface ArticleSettings {
  tone: 'professional' | 'casual' | 'friendly';
  wordCount: number;
  enableInternalLinking: boolean;
  enableExternalLinking: boolean;
  callToAction?: string;
}

interface BulkArticleFormProps {
  onArticleGenerated: (articles: any[]) => void;
}

export function BulkArticleForm({ onArticleGenerated }: BulkArticleFormProps) {
  const [keywords, setKeywords] = useState("");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(0);
  const [totalArticles, setTotalArticles] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [creditInfo, setCreditInfo] = useState<{ available: number; required: number } | null>(null);
  const [isCheckingCredits, setIsCheckingCredits] = useState(false);
  const [queueId, setQueueId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ArticleSettings>({
    tone: 'professional',
    wordCount: 1000,
    enableInternalLinking: false,
    enableExternalLinking: false,
    callToAction: ''
  });
  const { toast } = useToast();

  // Use the queue status hook to poll for updates
  const {
    queue,
    items,
    articles,
    loading: queueLoading,
    error: queueError,
    isPolling
  } = useQueueStatus(queueId);

  // Update progress based on queue status
  useEffect(() => {
    if (queue) {
      // Update progress
      const queueProgress = (queue.completedItems / queue.totalItems) * 100;
      setProgress(queueProgress || 0);
      setCurrentArticle(queue.completedItems || 0);
      setTotalArticles(queue.totalItems || 0);

      // Check if queue is completed
      if (queue.status === 'completed' || queue.status === 'partial' || queue.status === 'failed') {
        // Notify user
        const isFullyCompleted = queue.status === 'completed';

        toast({
          title: isFullyCompleted ? "Generation Complete" : "Generation Partially Complete",
          description: `Generated ${queue.completedItems} of ${queue.totalItems} articles.`,
          variant: "default"
        });

        // Reset generating state
        setIsGenerating(false);

        // Pass articles to parent component
        if (articles.length > 0) {
          onArticleGenerated(articles);
        }

        // Reset queue ID to stop polling
        setQueueId(null);
      }
    }
  }, [queue, articles, toast, onArticleGenerated]);

  // Function to check available credits
  const checkCredits = async (keywordCount: number) => {
    setIsCheckingCredits(true);
    setError(null);

    try {
      // Add timestamp to URL to prevent caching
      const timestamp = Date.now();
      const url = `/api/bulk/check-credits?_t=${timestamp}`;

      console.log(`[Bulk Generator] Checking credits at ${new Date(timestamp).toISOString()}`);

      // Make a lightweight request to check credits without generating articles
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ keywordCount }),
        credentials: 'include'
      });

      console.log(`[Bulk Generator] Credit check response status: ${response.status}`);

      // Log the response headers for debugging
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('[Bulk Generator] Credit check response headers:', headers);

      const data = await response.json();

      if (!response.ok) {
        // Try to parse the error response
        let errorMessage = 'Failed to check available credits';
        try {
          errorMessage = data.message || errorMessage;
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }

        // Handle authentication errors
        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive"
          });
          // Delay redirect to allow toast to be seen
          setTimeout(() => {
            window.location.href = '/auth';
          }, 2000);
          return null;
        }

        setError(errorMessage);
        return null;
      }

      return {
        available: data.availableCredits,
        required: keywordCount
      };
    } catch (error: any) {
      setError(error.message || 'Failed to check available credits');
      return null;
    } finally {
      setIsCheckingCredits(false);
    }
  };

  // Function to validate and check credits before submission
  const validateAndCheckCredits = async () => {
    const keywordList = keywords.split('\n').filter(k => k.trim());

    if (keywordList.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter at least one keyword",
        variant: "destructive"
      });
      return null;
    }

    if (!projectName.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive"
      });
      return null;
    }

    // Check credits
    const credits = await checkCredits(keywordList.length);
    setCreditInfo(credits);

    if (!credits) {
      return null;
    }

    if (credits.available < credits.required) {
      setError(`You need ${credits.required} credits but only have ${credits.available} available.`);
      return null;
    }

    return keywordList;
  };

  // Function to check if session is valid
  const checkSession = async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/user?_t=${timestamp}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error('Session expired');
      }

      return true;
    } catch (error) {
      console.error('Session check failed:', error);
      return false;
    }
  };

  // Session refresh interval
  useEffect(() => {
    // Start session refresh interval
    const refreshInterval = setInterval(async () => {
      try {
        const isValid = await checkSession();
        if (!isValid) {
          clearInterval(refreshInterval);
          console.error('Session expired during idle time');
        }
      } catch (error) {
        console.error('Session refresh failed:', error);
      }
    }, 60000); // Check session every minute
    
    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const keywordList = await validateAndCheckCredits();
    if (!keywordList) return;

    setTotalArticles(keywordList.length);
    setIsGenerating(true);
    setError(null);

    // Add a timestamp to prevent caching issues
    const timestamp = Date.now();
    console.log(`[Bulk Generator] Starting generation at ${new Date(timestamp).toISOString()}`);

    try {
      // First verify the session is still valid
      const isSessionValid = await checkSession();
      if (!isSessionValid) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        });
        setTimeout(() => {
          window.location.href = '/auth?redirect=bulk-article-writer';
        }, 2000);
        return;
      }

      // Add timestamp to URL to prevent caching
      const url = `/api/bulk/generate?_t=${timestamp}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          projectName,
          projectDescription: description,
          keywords: keywordList,
          settings: settings
        }),
        credentials: 'include'
      });

      // Add session refresh during long-running operations
      const refreshSession = setInterval(async () => {
        try {
          const isValid = await checkSession();
          if (!isValid) {
            clearInterval(refreshSession);
            setIsGenerating(false);
            toast({
              title: "Session Expired",
              description: "Your session has expired. Please log in again.",
              variant: "destructive"
            });
            setTimeout(() => {
              window.location.href = '/auth?redirect=bulk-article-writer';
            }, 2000);
          }
        } catch (error) {
          console.error('Session refresh failed:', error);
        }
      }, 30000); // Refresh every 30 seconds

      console.log(`[Bulk Generator] Response status: ${response.status}`);

      // Handle response...
      if (!response.ok) {
        clearInterval(refreshSession); // Clear the refresh interval
        
        // Handle authentication errors
        if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive"
          });
          setTimeout(() => {
            window.location.href = '/auth?redirect=bulk-article-writer';
          }, 2000);
          return;
        }
        
        // Handle other errors
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        
        const errorMessage = errorData?.message || 'Failed to generate articles';
        throw new Error(errorMessage);
      }

      const result = await response.json();
      clearInterval(refreshSession); // Clear the refresh interval on success

      // Update credit information
      if (result.creditsAvailable !== undefined) {
        setCreditInfo({
          available: result.creditsAvailable,
          required: result.creditsRequired || keywordList.length
        });
      }

      // Set the queue ID to start polling
      if (result.queue?.id) {
        setQueueId(result.queue.id);

        toast({
          title: "Articles Queued",
          description: `Added ${keywordList.length} articles to the generation queue. Your articles will be generated in the background.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create article queue",
          variant: "destructive"
        });
      }

      // Reset form fields but keep generating state true until queue completes
      setKeywords("");
      setProjectName("");
      setDescription("");

      // Set initial progress based on queue status
      if (result.queue) {
        const initialProgress = (result.queue.completedItems / result.queue.totalItems) * 100;
        setProgress(initialProgress || 0);
        setTotalArticles(result.queue.totalItems || keywordList.length);
        setCurrentArticle(result.queue.completedItems || 0);
      }

    } catch (error: any) {
      setError(error.message || 'Failed to generate articles');
      toast({
        title: "Error",
        description: error.message || 'Failed to generate articles',
        variant: "destructive"
      });
    } finally {
      // Only reset generating state if we're not using the queue
      if (!queueId) {
        setIsGenerating(false);
        setProgress(0);
        setCurrentArticle(0);
        setTotalArticles(0);
      }
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                placeholder="Enter project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Project Description (optional)</Label>
              <Input
                id="description"
                placeholder="Enter project description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>
              <ScrollArea className="h-[300px] rounded-md border">
                <Textarea
                  id="keywords"
                  placeholder="Enter keywords (one per line)"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  required
                  className="min-h-[300px] resize-none border-0"
                />
              </ScrollArea>
            </div>

            <Separator className="my-4" />

            <Collapsible open={showSettings} onOpenChange={setShowSettings} className="w-full">
              <div className="flex items-center justify-between">
                <Label className="text-base">Article Settings</Label>
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(value) => {
                      if (value === 'seo') {
                        setSettings({
                          tone: 'professional',
                          wordCount: 1500,
                          enableInternalLinking: true,
                          enableExternalLinking: true,
                          callToAction: 'Learn more about our services.'
                        });
                      } else if (value === 'blog') {
                        setSettings({
                          tone: 'casual',
                          wordCount: 1000,
                          enableInternalLinking: true,
                          enableExternalLinking: false,
                          callToAction: 'Share this post with your friends!'
                        });
                      } else if (value === 'technical') {
                        setSettings({
                          tone: 'professional',
                          wordCount: 2000,
                          enableInternalLinking: false,
                          enableExternalLinking: true,
                          callToAction: 'Contact us for more information.'
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue placeholder="Presets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seo">SEO Article</SelectItem>
                      <SelectItem value="blog">Blog Post</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                      <ChevronDown className={`h-4 w-4 transition-transform ${showSettings ? 'transform rotate-180' : ''}`} />
                      <span className="sr-only">Toggle settings</span>
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="tone">Writing Tone</Label>
                  <Select
                    value={settings.tone}
                    onValueChange={(value) => setSettings({...settings, tone: value as 'professional' | 'casual' | 'friendly'})}
                  >
                    <SelectTrigger id="tone">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="wordCount">Word Count</Label>
                    <span className="text-sm text-muted-foreground">{settings.wordCount} words</span>
                  </div>
                  <Slider
                    id="wordCount"
                    min={500}
                    max={3000}
                    step={100}
                    value={[settings.wordCount]}
                    onValueChange={([value]) => setSettings({...settings, wordCount: value})}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>500</span>
                    <span>3000</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callToAction">Call to Action (optional)</Label>
                  <Input
                    id="callToAction"
                    placeholder="Enter call to action text"
                    value={settings.callToAction || ''}
                    onChange={(e) => setSettings({...settings, callToAction: e.target.value})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="internalLinking">Internal Linking</Label>
                    <p className="text-sm text-muted-foreground">Add links between articles</p>
                  </div>
                  <Switch
                    id="internalLinking"
                    checked={settings.enableInternalLinking}
                    onCheckedChange={(checked) => setSettings({...settings, enableInternalLinking: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="externalLinking">External Linking</Label>
                    <p className="text-sm text-muted-foreground">Add links to external sources</p>
                  </div>
                  <Switch
                    id="externalLinking"
                    checked={settings.enableExternalLinking}
                    onCheckedChange={(checked) => setSettings({...settings, enableExternalLinking: checked})}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Credit information display */}
          {creditInfo && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
              <div>
                <p className="text-sm font-medium">Credit Information</p>
                <p className="text-sm text-muted-foreground">
                  Available: {creditInfo.available} | Required: {creditInfo.required}
                </p>
              </div>
              <div className={`text-sm font-medium ${creditInfo.available >= creditInfo.required ? 'text-green-600' : 'text-red-600'}`}>
                {creditInfo.available >= creditInfo.required ? 'Sufficient credits' : 'Insufficient credits'}
              </div>
            </div>
          )}

          {/* Check credits button */}
          {!isGenerating && !isCheckingCredits && !creditInfo && keywords.split('\n').filter(k => k.trim()).length > 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => validateAndCheckCredits()}
            >
              Check Required Credits
            </Button>
          )}

          {isCheckingCredits && (
            <div className="flex items-center justify-center p-3">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Checking available credits...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isGenerating && (
            <Card>
              <CardContent className="py-4">
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-center text-muted-foreground">
                  {queueId ? (
                    <>
                      {queue?.status === 'pending' && 'Waiting in queue...'}
                      {queue?.status === 'processing' && `Generating articles: ${currentArticle} of ${totalArticles} completed`}
                      {(queue?.status === 'completed' || queue?.status === 'partial') &&
                        `Generated ${currentArticle} of ${totalArticles} articles`}
                      {queue?.status === 'failed' && 'Generation failed'}
                    </>
                  ) : (
                    `Generating article ${currentArticle} of ${totalArticles}`
                  )}
                </p>
                {queueId && (
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    Queue ID: {queueId} | Status: {queue?.status || 'initializing'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Button
            type="submit"
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Articles...
              </>
            ) : (
              "Generate Articles"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
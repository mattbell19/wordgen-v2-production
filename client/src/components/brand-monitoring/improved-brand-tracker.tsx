import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ErrorMessage } from './error-message';
import { 
  Brain, 
  Search, 
  Target, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface BrandTrackerStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

interface GeneratedQuery {
  text: string;
  category: string;
  explanation: string;
  priority: number;
  estimatedRelevance: number;
}

interface ChatGPTSearchResult {
  query: string;
  response: string;
  brandMentioned: boolean;
  position: number | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  contextSnippet: string;
  confidenceScore: number;
}

interface BrandAnalysisResult {
  brand: string;
  competitor: string;
  keyword: string;
  totalQueries: number;
  brandMentions: number;
  competitorMentions: number;
  averagePosition: number | null;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  searchResults: ChatGPTSearchResult[];
  recommendations: string[];
}

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);

export const ImprovedBrandTracker: React.FC = () => {
  const { toast } = useToast();
  
  // Form state
  const [brand, setBrand] = useState('');
  const [competitor, setCompetitor] = useState('');
  const [keyword, setKeyword] = useState('');
  
  // Process state
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [generatedQueries, setGeneratedQueries] = useState<GeneratedQuery[]>([]);
  const [searchResults, setSearchResults] = useState<ChatGPTSearchResult[]>([]);
  const [finalAnalysis, setFinalAnalysis] = useState<BrandAnalysisResult | null>(null);
  
  const steps: BrandTrackerStep[] = [
    {
      id: 1,
      title: "Brand & Competitor Info",
      description: "Enter your brand, competitor, and target keyword",
      completed: currentStep > 1
    },
    {
      id: 2,
      title: "AI Query Generation",
      description: "Generate targeted queries using ChatGPT",
      completed: currentStep > 2
    },
    {
      id: 3,
      title: "ChatGPT Search Analysis",
      description: "Search ChatGPT with generated queries",
      completed: currentStep > 3
    },
    {
      id: 4,
      title: "Brand Analysis Results",
      description: "View comprehensive brand vs competitor analysis",
      completed: currentStep > 4
    }
  ];

  // Step 1: Validate inputs and move to step 2
  const handleStep1Complete = () => {
    if (!brand.trim() || !competitor.trim() || !keyword.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields: brand, competitor, and keyword",
        variant: "destructive"
      });
      return;
    }
    setCurrentStep(2);
  };

  // Step 2: Generate queries using ChatGPT with retry logic
  const generateQueries = async (retryCount = 0) => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        setLoading(false);
        toast({
            title: "Request Timeout",
            description: "The AI service is taking longer than expected. Please try again.",
            variant: "destructive",
            action: retryCount < 2 ? (
              <Button
                onClick={() => generateQueries(retryCount + 1)}
                size="sm"
                variant="outline"
              >
                Retry
              </Button>
            ) : undefined
          });
      }, 25000); // 25 second timeout

      const response = await fetch('/api/brand-monitoring/queries/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName: brand,
          industry: keyword,
          description: `Brand competing with ${competitor} in the ${keyword} space`,
          competitors: [competitor],
          count: 10
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      const queries = result.queries || [];

      setGeneratedQueries(queries);

      toast({
        title: "Queries Generated Successfully!",
        description: `Generated ${queries.length} targeted queries for analysis`,
      });

      setCurrentStep(3);
    } catch (error) {
      console.error('Query generation error:', error);

      // Handle specific error types
      let errorMessage = "Failed to generate queries";
      let canRetry = false;

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Request timed out. The AI service may be busy.";
          canRetry = true;
        } else if (error.message.includes('503') || error.message.includes('timeout')) {
          errorMessage = "Service temporarily unavailable. Please try again.";
          canRetry = true;
        } else if (error.message.includes('401')) {
          errorMessage = "Please log in again to continue.";
        } else {
          errorMessage = error.message;
          canRetry = retryCount < 2; // Allow up to 2 retries
        }
      }

      setError({
        title: "Query Generation Failed",
        message: errorMessage
      });
      
      if (canRetry && retryCount < 2) {
        // Auto-retry after a delay
        setTimeout(() => generateQueries(retryCount + 1), 2000);
      } else {
        toast({
          title: "Query Generation Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Search ChatGPT with generated queries
  const searchChatGPT = async () => {
    setLoading(true);
    const results: ChatGPTSearchResult[] = [];
    
    try {
      for (const query of generatedQueries) {
        // Simulate API call to ChatGPT (implement your actual ChatGPT search logic here)
        const searchResponse = await fetch('/api/brand-monitoring/search-chatgpt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query.text,
            brandName: brand,
            competitorName: competitor
          }),
        });

        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          results.push(searchResult);
        }
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setSearchResults(results);
      
      toast({
        title: "ChatGPT Search Complete!",
        description: `Analyzed ${results.length} queries for brand mentions`,
      });
      
      setCurrentStep(4);
    } catch (error) {
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search ChatGPT",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate final analysis
  const generateFinalAnalysis = () => {
    const brandMentions = searchResults.filter(r => r.brandMentioned && r.response.toLowerCase().includes(brand.toLowerCase())).length;
    const competitorMentions = searchResults.filter(r => r.response.toLowerCase().includes(competitor.toLowerCase())).length;
    
    const positions = searchResults
      .filter(r => r.position !== null)
      .map(r => r.position as number);
    const averagePosition = positions.length > 0 ? positions.reduce((sum, pos) => sum + pos, 0) / positions.length : null;
    
    const sentimentBreakdown = searchResults.reduce(
      (acc, result) => {
        acc[result.sentiment]++;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );

    const analysis: BrandAnalysisResult = {
      brand,
      competitor,
      keyword,
      totalQueries: generatedQueries.length,
      brandMentions,
      competitorMentions,
      averagePosition,
      sentimentBreakdown,
      searchResults,
      recommendations: [
        brandMentions < competitorMentions ? `Increase content marketing efforts - ${competitor} is mentioned more frequently` : `Great! ${brand} has strong mention presence`,
        averagePosition && averagePosition > 3 ? "Improve SEO and thought leadership to achieve earlier mentions" : "Good positioning in AI responses",
        sentimentBreakdown.negative > 0 ? "Address negative sentiment through improved customer experience" : "Positive sentiment maintained"
      ]
    };

    setFinalAnalysis(analysis);
  };

  React.useEffect(() => {
    if (currentStep === 4 && searchResults.length > 0 && !finalAnalysis) {
      generateFinalAnalysis();
    }
  }, [currentStep, searchResults, finalAnalysis]);

  const resetFlow = () => {
    setCurrentStep(1);
    setBrand('');
    setCompetitor('');
    setKeyword('');
    setGeneratedQueries([]);
    setSearchResults([]);
    setFinalAnalysis(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header - Responsive */}
      <div className="text-center">
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center justify-center gap-2">
          <Target className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
          AI Brand Tracker
        </h1>
        <p className="text-sm lg:text-base text-gray-600 mt-2 px-4">
          Track your brand visibility across AI language models
        </p>
      </div>

      {/* Progress Steps - Responsive */}
      <div className="flex items-center justify-between mb-8 overflow-x-auto">
        <div className="flex items-center min-w-max px-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step.completed 
                ? 'bg-green-500 border-green-500 text-white' 
                : currentStep === step.id
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-gray-100 border-gray-300 text-gray-500'
            }`}>
              {step.completed ? <CheckCircle className="h-5 w-5" /> : step.id}
            </div>
            <div className="ml-3 text-left">
              <p className={`text-xs lg:text-sm font-medium ${step.completed ? 'text-green-600' : currentStep === step.id ? 'text-blue-600' : 'text-gray-500'}`}>
                {step.title}
              </p>
              <p className="text-xs text-gray-500 hidden lg:block">{step.description}</p>
            </div>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-400 mx-2 lg:mx-4 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Step 1: Brand & Competitor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="brand">Your Brand</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g., Salesforce"
                />
              </div>
              <div>
                <Label htmlFor="competitor">Competitor</Label>
                <Input
                  id="competitor"
                  value={competitor}
                  onChange={(e) => setCompetitor(e.target.value)}
                  placeholder="e.g., HubSpot"
                />
              </div>
              <div>
                <Label htmlFor="keyword">Target Keyword</Label>
                <Input
                  id="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., CRM software"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleStep1Complete}>
                Generate AI Queries
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Step 2: AI Query Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <ErrorMessage
                title={error.title}
                message={error.message}
                onRetry={() => generateQueries()}
              />
            )}
            <div className="text-center py-8">
              {loading ? (
                <div className="space-y-4">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                  <p className="text-gray-600">
                    Generating AI-powered queries...
                  </p>
                  <p className="text-sm text-gray-500">
                    This may take up to 20 seconds
                  </p>
                  <Progress value={33} className="max-w-xs mx-auto" />
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">
                    Using AI to generate targeted queries for: <strong>{brand}</strong> vs <strong>{competitor}</strong> in <strong>{keyword}</strong>
                  </p>
                  <Button 
                onClick={generateQueries} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating Queries...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate AI Queries
                  </>
                )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Step 3: ChatGPT Search Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Generated {generatedQueries.length} queries. Now searching ChatGPT for brand mentions...
                </p>
              </div>
              
              <div className="max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {generatedQueries.map((query, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Badge variant="outline">{query.category}</Badge>
                      <span className="text-sm">{query.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="text-center pt-4">
                <Button 
                  onClick={searchChatGPT} 
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Searching ChatGPT...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Search ChatGPT
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && finalAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Step 4: Brand Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{finalAnalysis.totalQueries}</div>
                <div className="text-sm text-gray-600">Total Queries</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{finalAnalysis.brandMentions}</div>
                <div className="text-sm text-gray-600">{brand} Mentions</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{finalAnalysis.competitorMentions}</div>
                <div className="text-sm text-gray-600">{competitor} Mentions</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {finalAnalysis.averagePosition ? `#${Math.round(finalAnalysis.averagePosition)}` : 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Avg Position</div>
              </div>
            </div>

            {/* Sentiment Analysis */}
            <div>
              <h3 className="font-semibold mb-3">Sentiment Analysis</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{finalAnalysis.sentimentBreakdown.positive}</div>
                  <div className="text-sm text-gray-600">Positive</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-600">{finalAnalysis.sentimentBreakdown.neutral}</div>
                  <div className="text-sm text-gray-600">Neutral</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{finalAnalysis.sentimentBreakdown.negative}</div>
                  <div className="text-sm text-gray-600">Negative</div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="font-semibold mb-3">Recommendations</h3>
              <div className="space-y-2">
                {finalAnalysis.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <span className="text-sm">{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={resetFlow}>
                Start New Analysis
              </Button>
              <Button>
                Create Monitoring Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
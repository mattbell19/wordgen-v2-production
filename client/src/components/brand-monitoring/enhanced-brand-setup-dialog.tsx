import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  X, 
  Plus, 
  Wand2, 
  RefreshCw, 
  Check, 
  Sparkles, 
  Target, 
  Users, 
  Building2,
  Brain,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Lightbulb
} from 'lucide-react';

interface EnhancedBrandSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBrandCreated: () => void;
}

interface GeneratedQuery {
  text: string;
  category: string;
  explanation: string;
  priority: number;
  estimatedRelevance: number;
}

interface QueryGenerationResult {
  queries: GeneratedQuery[];
  estimatedTotalCost: number;
  generationMetadata: {
    generatedAt: string;
    model: string;
    totalQueries: number;
  };
}

export const EnhancedBrandSetupDialog: React.FC<EnhancedBrandSetupDialogProps> = ({
  open,
  onOpenChange,
  onBrandCreated
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatingQueries, setGeneratingQueries] = useState(false);
  
  const [formData, setFormData] = useState({
    brandName: '',
    description: '',
    industry: '',
    targetAudience: '',
    keyProducts: [] as string[],
    trackingQueries: [] as string[],
    competitors: [] as string[],
    monitoringFrequency: 'daily' as 'hourly' | 'daily' | 'weekly' | 'monthly'
  });
  
  const [generatedQueries, setGeneratedQueries] = useState<GeneratedQuery[]>([]);
  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set());
  const [newQuery, setNewQuery] = useState('');
  const [newCompetitor, setNewCompetitor] = useState('');
  const [newProduct, setNewProduct] = useState('');
  
  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  // Generate AI-powered queries
  const generateAIQueries = async () => {
    if (!formData.brandName.trim()) {
      toast({
        title: "Brand Name Required",
        description: "Please enter a brand name before generating queries",
        variant: "destructive"
      });
      return;
    }

    setGeneratingQueries(true);
    try {
      const response = await fetch('/api/brand-monitoring/queries/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName: formData.brandName,
          industry: formData.industry,
          description: formData.description,
          targetAudience: formData.targetAudience,
          keyProducts: formData.keyProducts,
          competitors: formData.competitors,
          count: 15
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate queries');
      }

      const result: QueryGenerationResult = await response.json();
      setGeneratedQueries(result.queries || []);
      
      // Auto-select all generated queries with safe access
      const allQueries = new Set(result.queries?.map(q => q.text) || []);
      setSelectedQueries(allQueries);

      toast({
        title: "Queries Generated Successfully!",
        description: `Generated ${result.queries?.length || 0} AI-powered tracking queries`,
      });

      // Move to step 2
      setCurrentStep(2);
    } catch (error) {
      toast({
        title: "Query Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate queries with AI",
        variant: "destructive"
      });
    } finally {
      setGeneratingQueries(false);
    }
  };

  // Add selected queries to form
  const addSelectedQueries = () => {
    const queriesToAdd = Array.from(selectedQueries).filter(
      query => !formData.trackingQueries.includes(query)
    );
    
    setFormData(prev => ({
      ...prev,
      trackingQueries: [...prev.trackingQueries, ...queriesToAdd]
    }));

    toast({
      title: "Queries Added",
      description: `Added ${queriesToAdd.length} queries to your monitoring list`,
    });

    setCurrentStep(3);
  };

  // Handle final submission
  const handleSubmit = async () => {
    if (!formData.brandName.trim()) {
      toast({
        title: "Validation Error",
        description: "Brand name is required",
        variant: "destructive"
      });
      return;
    }

    if (formData.trackingQueries.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one tracking query is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/brand-monitoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName: formData.brandName,
          description: formData.description,
          trackingQueries: formData.trackingQueries,
          competitors: formData.competitors,
          monitoringFrequency: formData.monitoringFrequency
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create brand monitoring');
      }

      toast({
        title: "Brand Monitoring Created!",
        description: "Your brand monitoring is now active and tracking mentions",
      });

      // Reset form
      setFormData({
        brandName: '',
        description: '',
        industry: '',
        targetAudience: '',
        keyProducts: [],
        trackingQueries: [],
        competitors: [],
        monitoringFrequency: 'daily'
      });
      setCurrentStep(1);
      setGeneratedQueries([]);
      setSelectedQueries(new Set());
      
      onBrandCreated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create brand monitoring",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const addProduct = () => {
    if (newProduct.trim() && !formData.keyProducts.includes(newProduct.trim())) {
      setFormData(prev => ({
        ...prev,
        keyProducts: [...prev.keyProducts, newProduct.trim()]
      }));
      setNewProduct('');
    }
  };

  const removeProduct = (product: string) => {
    setFormData(prev => ({
      ...prev,
      keyProducts: prev.keyProducts.filter(p => p !== product)
    }));
  };

  const addQuery = () => {
    if (newQuery.trim() && !formData.trackingQueries.includes(newQuery.trim())) {
      setFormData(prev => ({
        ...prev,
        trackingQueries: [...prev.trackingQueries, newQuery.trim()]
      }));
      setNewQuery('');
    }
  };

  const removeQuery = (query: string) => {
    setFormData(prev => ({
      ...prev,
      trackingQueries: prev.trackingQueries.filter(q => q !== query)
    }));
  };

  const addCompetitor = () => {
    if (newCompetitor.trim() && !formData.competitors.includes(newCompetitor.trim())) {
      setFormData(prev => ({
        ...prev,
        competitors: [...prev.competitors, newCompetitor.trim()]
      }));
      setNewCompetitor('');
    }
  };

  const removeCompetitor = (competitor: string) => {
    setFormData(prev => ({
      ...prev,
      competitors: prev.competitors.filter(c => c !== competitor)
    }));
  };

  const toggleQuerySelection = (query: string) => {
    const newSelected = new Set(selectedQueries);
    if (newSelected.has(query)) {
      newSelected.delete(query);
    } else {
      newSelected.add(query);
    }
    setSelectedQueries(newSelected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Target className="h-6 w-6 text-blue-600" />
            Create Brand Monitoring
          </DialogTitle>
          <DialogDescription>
            Set up AI-powered monitoring for your brand across language models
          </DialogDescription>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Brand Information */}
          {currentStep === 1 && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Brand Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brandName" className="text-sm font-medium">Brand Name *</Label>
                    <Input
                      id="brandName"
                      value={formData.brandName}
                      onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                      placeholder="e.g., Tesla, OpenAI, Shopify"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="industry" className="text-sm font-medium">Industry</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      placeholder="e.g., Technology, E-commerce, SaaS"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium">Brand Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what your brand does and its value proposition..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="targetAudience" className="text-sm font-medium">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                    placeholder="e.g., Small businesses, Developers, Consumers"
                    className="mt-1"
                  />
                </div>

                {/* Key Products */}
                <div>
                  <Label className="text-sm font-medium">Key Products/Services</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={newProduct}
                      onChange={(e) => setNewProduct(e.target.value)}
                      placeholder="Add a key product or service"
                      onKeyPress={(e) => e.key === 'Enter' && addProduct()}
                    />
                    <Button type="button" onClick={addProduct} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.keyProducts.map((product) => (
                      <Badge key={product} variant="secondary" className="flex items-center gap-1">
                        {product}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeProduct(product)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Competitors */}
                <div>
                  <Label className="text-sm font-medium">Main Competitors</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={newCompetitor}
                      onChange={(e) => setNewCompetitor(e.target.value)}
                      placeholder="Add a competitor"
                      onKeyPress={(e) => e.key === 'Enter' && addCompetitor()}
                    />
                    <Button type="button" onClick={addCompetitor} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.competitors.map((competitor) => (
                      <Badge key={competitor} variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {competitor}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeCompetitor(competitor)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={generateAIQueries} 
                    disabled={!formData.brandName.trim() || generatingQueries}
                    className="flex items-center gap-2"
                  >
                    {generatingQueries ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating AI Queries...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        Generate AI Queries
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: AI Generated Queries */}
          {currentStep === 2 && (
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-green-600" />
                  AI Generated Queries
                  <Badge variant="secondary" className="ml-2">
                    {generatedQueries.length} queries generated
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Select the queries you want to monitor. These will track how your brand appears in AI responses.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {generatedQueries.map((query, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        selectedQueries.has(query.text)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleQuerySelection(query.text)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              selectedQueries.has(query.text)
                                ? 'border-blue-500 bg-blue-500 text-white'
                                : 'border-gray-300'
                            }`}>
                              {selectedQueries.has(query.text) && (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                            <span className="font-medium">{query.text}</span>
                            <Badge variant="outline" size="sm">
                              {query.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 ml-6">
                            {query.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(1)}
                  >
                    Back to Brand Info
                  </Button>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {selectedQueries.size} of {generatedQueries.length} selected
                    </span>
                    <Button 
                      onClick={addSelectedQueries}
                      disabled={selectedQueries.size === 0}
                      className="flex items-center gap-2"
                    >
                      Continue with Selected Queries
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review and Configuration */}
          {currentStep === 3 && (
            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  Review & Configure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Monitoring Frequency */}
                <div>
                  <Label htmlFor="frequency" className="text-sm font-medium">Monitoring Frequency</Label>
                  <Select
                    value={formData.monitoringFrequency}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, monitoringFrequency: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Every Hour (Premium)</SelectItem>
                      <SelectItem value="daily">Daily (Recommended)</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Queries Review */}
                <div>
                  <Label className="text-sm font-medium">
                    Tracking Queries ({formData.trackingQueries.length})
                  </Label>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {formData.trackingQueries.map((query) => (
                        <Badge key={query} variant="default" className="flex items-center gap-1">
                          {query}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeQuery(query)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Add custom query */}
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newQuery}
                      onChange={(e) => setNewQuery(e.target.value)}
                      placeholder="Add a custom query"
                      onKeyPress={(e) => e.key === 'Enter' && addQuery()}
                    />
                    <Button type="button" onClick={addQuery} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Summary Card */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">What happens next?</h4>
                        <ul className="text-sm text-blue-700 mt-1 space-y-1">
                          <li>• Your brand will be monitored across AI language models</li>
                          <li>• We'll track mentions, sentiment, and ranking positions</li>
                          <li>• You'll receive insights and optimization recommendations</li>
                          <li>• Monitoring runs {formData.monitoringFrequency}</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(2)}
                  >
                    Back to Queries
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={loading || formData.trackingQueries.length === 0}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Create Brand Monitoring
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
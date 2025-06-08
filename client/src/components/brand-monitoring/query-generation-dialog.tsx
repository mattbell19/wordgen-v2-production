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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Copy, Check, Wand2 } from 'lucide-react';

interface QueryGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId?: number;
}

interface GeneratedQuery {
  query: string;
  category: string;
  rationale: string;
  estimatedCost: number;
}

export const QueryGenerationDialog: React.FC<QueryGenerationDialogProps> = ({
  open,
  onOpenChange,
  brandId
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copiedQueries, setCopiedQueries] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    brandName: '',
    industry: '',
    description: '',
    targetAudience: '',
    keyProducts: [] as string[],
    competitors: [] as string[],
    count: 10
  });
  const [generatedQueries, setGeneratedQueries] = useState<GeneratedQuery[]>([]);
  const [newProduct, setNewProduct] = useState('');
  const [newCompetitor, setNewCompetitor] = useState('');

  const generateQueries = async () => {
    if (!formData.brandName.trim()) {
      toast({
        title: "Validation Error",
        description: "Brand name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const endpoint = brandId 
        ? `/api/brand-monitoring/${brandId}/queries/generate`
        : '/api/brand-monitoring/queries/generate';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(brandId ? { count: formData.count } : formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate queries');
      }

      const data = await response.json();
      setGeneratedQueries(data.queries || []);

      toast({
        title: "Success",
        description: `Generated ${data.queries?.length || 0} queries`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate queries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyQuery = async (query: string) => {
    try {
      await navigator.clipboard.writeText(query);
      setCopiedQueries(prev => new Set([...prev, query]));
      
      setTimeout(() => {
        setCopiedQueries(prev => {
          const newSet = new Set(prev);
          newSet.delete(query);
          return newSet;
        });
      }, 2000);

      toast({
        title: "Copied",
        description: "Query copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy query",
        variant: "destructive"
      });
    }
  };

  const copyAllQueries = async () => {
    const allQueries = generatedQueries.map(q => q.query).join('\n');
    try {
      await navigator.clipboard.writeText(allQueries);
      toast({
        title: "Copied",
        description: "All queries copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy queries",
        variant: "destructive"
      });
    }
  };

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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      direct: 'bg-blue-100 text-blue-800',
      comparative: 'bg-purple-100 text-purple-800',
      use_case: 'bg-green-100 text-green-800',
      problem_solving: 'bg-orange-100 text-orange-800',
      industry_specific: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Generate Tracking Queries
          </DialogTitle>
          <DialogDescription>
            Generate AI-powered tracking queries for your brand monitoring
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="brandName">Brand Name *</Label>
              <Input
                id="brandName"
                value={formData.brandName}
                onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                placeholder="Enter your brand name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                placeholder="e.g., Software, Healthcare, Finance"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Brand Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Briefly describe what your brand does"
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="targetAudience">Target Audience</Label>
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
              <Label>Key Products/Services</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  placeholder="Add a key product"
                  onKeyPress={(e) => e.key === 'Enter' && addProduct()}
                />
                <Button type="button" onClick={addProduct} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.keyProducts.map((product) => (
                  <Badge key={product} variant="secondary" className="gap-1">
                    {product}
                    <button
                      type="button"
                      onClick={() => removeProduct(product)}
                      className="ml-1 hover:bg-red-500 hover:text-white rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Competitors */}
            <div>
              <Label>Competitors</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newCompetitor}
                  onChange={(e) => setNewCompetitor(e.target.value)}
                  placeholder="Add a competitor"
                  onKeyPress={(e) => e.key === 'Enter' && addCompetitor()}
                />
                <Button type="button" onClick={addCompetitor} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.competitors.map((competitor) => (
                  <Badge key={competitor} variant="outline" className="gap-1">
                    {competitor}
                    <button
                      type="button"
                      onClick={() => removeCompetitor(competitor)}
                      className="ml-1 hover:bg-red-500 hover:text-white rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="count">Number of Queries</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="50"
                value={formData.count}
                onChange={(e) => setFormData(prev => ({ ...prev, count: parseInt(e.target.value) || 10 }))}
                className="mt-1"
              />
            </div>

            <Button 
              onClick={generateQueries} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Queries
                </>
              )}
            </Button>
          </div>

          {/* Generated Queries */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Generated Queries</h3>
              {generatedQueries.length > 0 && (
                <Button variant="outline" size="sm" onClick={copyAllQueries}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
              )}
            </div>

            {generatedQueries.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Wand2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-gray-500">No queries generated yet</p>
                  <p className="text-sm text-gray-400">Fill out the form and click generate</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {generatedQueries.map((item, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getCategoryColor(item.category)}>
                            {item.category.replace('_', ' ')}
                          </Badge>
                          {item.estimatedCost && (
                            <Badge variant="outline" className="text-xs">
                              ${item.estimatedCost.toFixed(3)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-1">{item.query}</p>
                        {item.rationale && (
                          <p className="text-xs text-gray-600">{item.rationale}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyQuery(item.query)}
                        className="flex-shrink-0"
                      >
                        {copiedQueries.has(item.query) ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {generatedQueries.length > 0 && (
              <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
                <p className="font-medium">Generated {generatedQueries.length} queries</p>
                <p>Total estimated cost: ${generatedQueries.reduce((sum, q) => sum + (q.estimatedCost || 0), 0).toFixed(3)}</p>
                <p className="text-xs mt-1">Copy the queries you want to use in your brand monitoring setup</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
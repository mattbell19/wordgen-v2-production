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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BrandSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBrandCreated: () => void;
}

export const BrandSetupDialog: React.FC<BrandSetupDialogProps> = ({
  open,
  onOpenChange,
  onBrandCreated,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    brandName: '',
    description: '',
    trackingQueries: [''],
    competitors: [''],
    monitoringFrequency: 'daily' as 'daily' | 'weekly' | 'monthly'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter out empty queries and competitors
      const cleanedData = {
        ...formData,
        trackingQueries: formData.trackingQueries.filter(q => q.trim() !== ''),
        competitors: formData.competitors.filter(c => c.trim() !== '')
      };

      if (cleanedData.trackingQueries.length === 0) {
        throw new Error('At least one tracking query is required');
      }

      const response = await fetch('/api/llm-seo/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Brand Created",
          description: `${cleanedData.brandName} monitoring setup completed successfully`,
        });
        onBrandCreated();
        onOpenChange(false);
        resetForm();
      } else {
        throw new Error(data.error || 'Failed to create brand monitoring');
      }
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

  const resetForm = () => {
    setFormData({
      brandName: '',
      description: '',
      trackingQueries: [''],
      competitors: [''],
      monitoringFrequency: 'daily'
    });
  };

  const addTrackingQuery = () => {
    setFormData(prev => ({
      ...prev,
      trackingQueries: [...prev.trackingQueries, '']
    }));
  };

  const removeTrackingQuery = (index: number) => {
    setFormData(prev => ({
      ...prev,
      trackingQueries: prev.trackingQueries.filter((_, i) => i !== index)
    }));
  };

  const updateTrackingQuery = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      trackingQueries: prev.trackingQueries.map((q, i) => i === index ? value : q)
    }));
  };

  const addCompetitor = () => {
    setFormData(prev => ({
      ...prev,
      competitors: [...prev.competitors, '']
    }));
  };

  const removeCompetitor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index)
    }));
  };

  const updateCompetitor = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      competitors: prev.competitors.map((c, i) => i === index ? value : c)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Setup Brand Monitoring</DialogTitle>
          <DialogDescription>
            Configure monitoring for your brand across LLM platforms like ChatGPT, Claude, and Gemini.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="brandName">Brand Name *</Label>
              <Input
                id="brandName"
                value={formData.brandName}
                onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                placeholder="Enter your brand name"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your brand or what it does"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="frequency">Monitoring Frequency</Label>
              <Select
                value={formData.monitoringFrequency}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  monitoringFrequency: value as 'daily' | 'weekly' | 'monthly' 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tracking Queries */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Tracking Queries *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTrackingQuery}>
                <Plus className="h-4 w-4 mr-2" />
                Add Query
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Questions or prompts to test how LLMs respond about your brand
            </p>
            <div className="space-y-3">
              {formData.trackingQueries.map((query, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => updateTrackingQuery(index, e.target.value)}
                    placeholder={`e.g., "What are the best ${formData.brandName ? formData.brandName.toLowerCase() : 'productivity'} tools?"`}
                  />
                  {formData.trackingQueries.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTrackingQuery(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>💡 <strong>Tip:</strong> Use questions your target audience might ask</p>
              <p>📝 <strong>Examples:</strong></p>
              <ul className="ml-4 list-disc">
                <li>"What's the best project management software?"</li>
                <li>"Compare CRM tools for small businesses"</li>
                <li>"Alternatives to [competitor name]"</li>
              </ul>
            </div>
          </div>

          {/* Competitors */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Competitors (Optional)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCompetitor}>
                <Plus className="h-4 w-4 mr-2" />
                Add Competitor
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Track how your competitors are mentioned alongside your brand
            </p>
            <div className="space-y-3">
              {formData.competitors.map((competitor, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={competitor}
                    onChange={(e) => updateCompetitor(index, e.target.value)}
                    placeholder="e.g., Competitor Brand Name"
                  />
                  {formData.competitors.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCompetitor(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {formData.brandName && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium">Preview</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Brand:</span>
                  <Badge variant="outline" className="ml-2">{formData.brandName}</Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Frequency:</span>
                  <Badge variant="outline" className="ml-2">{formData.monitoringFrequency}</Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Queries:</span>
                  <span className="ml-2 text-sm">{formData.trackingQueries.filter(q => q.trim()).length}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Competitors:</span>
                  <span className="ml-2 text-sm">{formData.competitors.filter(c => c.trim()).length}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.brandName.trim()}>
              {loading ? "Creating..." : "Create Brand Monitor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
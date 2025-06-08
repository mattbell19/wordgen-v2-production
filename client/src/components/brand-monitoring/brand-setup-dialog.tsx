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
import { useToast } from '@/hooks/use-toast';
import { X, Plus } from 'lucide-react';

interface BrandSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBrandCreated: () => void;
}

export const BrandSetupDialog: React.FC<BrandSetupDialogProps> = ({
  open,
  onOpenChange,
  onBrandCreated
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    description: '',
    trackingQueries: [] as string[],
    competitors: [] as string[],
    monitoringFrequency: 'daily' as 'hourly' | 'daily' | 'weekly' | 'monthly'
  });
  const [newQuery, setNewQuery] = useState('');
  const [newCompetitor, setNewCompetitor] = useState('');

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
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create brand monitoring');
      }

      toast({
        title: "Success",
        description: "Brand monitoring configuration created successfully",
      });

      // Reset form
      setFormData({
        brandName: '',
        description: '',
        trackingQueries: [],
        competitors: [],
        monitoringFrequency: 'daily'
      });
      
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

  const generateSampleQueries = () => {
    const brandName = formData.brandName.trim();
    if (!brandName) return;

    const sampleQueries = [
      `What is ${brandName}?`,
      `How does ${brandName} work?`,
      `${brandName} vs competitors`,
      `Best alternatives to ${brandName}`,
      `${brandName} reviews and ratings`,
      `Is ${brandName} worth it?`
    ];

    const newQueries = sampleQueries.filter(query => 
      !formData.trackingQueries.includes(query)
    );

    setFormData(prev => ({
      ...prev,
      trackingQueries: [...prev.trackingQueries, ...newQueries.slice(0, 3)]
    }));

    toast({
      title: "Sample Queries Added",
      description: `Added ${Math.min(newQueries.length, 3)} sample queries`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Brand Monitoring</DialogTitle>
          <DialogDescription>
            Set up monitoring for your brand across AI language models
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your brand and what it does"
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="frequency">Monitoring Frequency</Label>
              <Select
                value={formData.monitoringFrequency}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, monitoringFrequency: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Every Hour</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tracking Queries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Tracking Queries *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateSampleQueries}
                disabled={!formData.brandName.trim()}
              >
                Generate Sample Queries
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
                placeholder="Enter a query to track"
                onKeyPress={(e) => e.key === 'Enter' && addQuery()}
              />
              <Button type="button" onClick={addQuery} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.trackingQueries.map((query) => (
                <Badge key={query} variant="secondary" className="gap-1">
                  {query}
                  <button
                    type="button"
                    onClick={() => removeQuery(query)}
                    className="ml-1 hover:bg-red-500 hover:text-white rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            
            {formData.trackingQueries.length === 0 && (
              <p className="text-sm text-gray-500">
                Add queries that you want to monitor for your brand mentions
              </p>
            )}
          </div>

          {/* Competitors */}
          <div className="space-y-4">
            <Label>Competitors (Optional)</Label>
            
            <div className="flex gap-2">
              <Input
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                placeholder="Enter competitor name"
                onKeyPress={(e) => e.key === 'Enter' && addCompetitor()}
              />
              <Button type="button" onClick={addCompetitor} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.competitors.map((competitor) => (
                <Badge key={competitor} variant="outline" className="gap-1">
                  {competitor}
                  <button
                    type="button"
                    onClick={() => removeCompetitor(competitor)}
                    className="ml-1 hover:bg-red-500 hover:text-white rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            
            {formData.competitors.length === 0 && (
              <p className="text-sm text-gray-500">
                Add competitor brands to track for comparison
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Brand Monitoring'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
import React, { useState } from 'react';
import { BrandMonitoringDashboard } from '@/components/brand-monitoring/brand-monitoring-dashboard';
import { ImprovedBrandTracker } from '@/components/brand-monitoring/improved-brand-tracker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Target, BarChart3 } from 'lucide-react';

export const LLMBrandRankingPage: React.FC = () => {
  const [activeView, setActiveView] = useState<'tracker' | 'dashboard'>('tracker');
  
  console.log('LLMBrandRankingPage: Loading enhanced brand tracking system');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Brand Tracker</h1>
              <p className="text-gray-600">Advanced competitor analysis using AI-powered insights</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={activeView === 'tracker' ? 'default' : 'outline'}
                onClick={() => setActiveView('tracker')}
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                Brand Tracker
              </Button>
              <Button 
                variant={activeView === 'dashboard' ? 'default' : 'outline'}
                onClick={() => setActiveView('dashboard')}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-6">
        {activeView === 'tracker' ? (
          <ImprovedBrandTracker />
        ) : (
          <div className="max-w-7xl mx-auto px-6">
            <BrandMonitoringDashboard />
          </div>
        )}
      </div>
    </div>
  );
};
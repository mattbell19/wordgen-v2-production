import React from 'react';
import { ImprovedBrandTracker } from './improved-brand-tracker';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

/**
 * Brand Tracker Wrapper Component
 * Provides enhanced UI wrapper with proper styling and layout for the brand tracker
 */
export const BrandTrackerWrapper: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced container with better spacing */}
      <div className="container mx-auto py-8">
        {/* Info banner */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>AI Brand Tracker</strong> helps you understand how your brand appears in AI-generated responses. 
            Track visibility, sentiment, and competitive positioning across ChatGPT, Claude, and other AI platforms.
          </AlertDescription>
        </Alert>

        {/* Main content with enhanced card styling */}
        <Card className="shadow-xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1">
            <div className="bg-white">
              <ImprovedBrandTracker />
            </div>
          </div>
        </Card>

        {/* Help section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 hover:shadow-lg transition-shadow">
            <h3 className="font-semibold text-gray-900 mb-2">🎯 Track Brand Mentions</h3>
            <p className="text-sm text-gray-600">
              Monitor how often and in what context your brand appears in AI responses
            </p>
          </Card>
          <Card className="p-4 hover:shadow-lg transition-shadow">
            <h3 className="font-semibold text-gray-900 mb-2">📊 Analyze Sentiment</h3>
            <p className="text-sm text-gray-600">
              Understand the sentiment and tone when AI models discuss your brand
            </p>
          </Card>
          <Card className="p-4 hover:shadow-lg transition-shadow">
            <h3 className="font-semibold text-gray-900 mb-2">🏆 Beat Competitors</h3>
            <p className="text-sm text-gray-600">
              Compare your brand visibility against competitors and optimize your presence
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
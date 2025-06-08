import React from 'react';
import { BrandMonitoringDashboard } from '@/components/brand-monitoring/brand-monitoring-dashboard';

export const LLMBrandRankingPage: React.FC = () => {
  // Add console log to verify this component is being used
  console.log('LLMBrandRankingPage: Loading new brand monitoring dashboard');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 bg-blue-100 text-blue-800 text-sm">
        🚀 New Brand Monitoring Dashboard (v2.0)
      </div>
      <BrandMonitoringDashboard />
    </div>
  );
};
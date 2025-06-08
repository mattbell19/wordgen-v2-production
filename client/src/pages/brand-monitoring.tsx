import React from 'react';
import { BrandMonitoringDashboard } from '@/components/brand-monitoring/brand-monitoring-dashboard';
import { Layout } from '@/components/layout';

export const BrandMonitoringPage: React.FC = () => {
  return (
    <Layout>
      <BrandMonitoringDashboard />
    </Layout>
  );
};
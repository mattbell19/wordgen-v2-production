import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface UsageStatProps {
  title: string;
  value: number;
  description: string;
  showProgress?: boolean;
  max?: number;
}

/**
 * Component for displaying a usage statistic in the dashboard
 */
export function UsageStat({
  title,
  value,
  description,
  showProgress = false,
  max = 100
}: UsageStatProps) {
  const formattedValue = typeof value === 'number' && value > 999 
    ? value.toLocaleString() 
    : value;
  
  const progressValue = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Badge variant="outline">{formattedValue}</Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
        {showProgress && (
          <div className="mt-3">
            <Progress value={progressValue} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {value} of {max} used
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

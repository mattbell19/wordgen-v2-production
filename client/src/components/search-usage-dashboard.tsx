import { useSearchUsage } from "@/hooks/use-search-usage";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

export function SearchUsageDashboard() {
  const { usage, isLoading, error, hasQuotaRemaining } = useSearchUsage();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Usage</CardTitle>
          <CardDescription>Loading your search usage data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !usage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Usage</CardTitle>
          <CardDescription>Unable to load search usage data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error || "An unknown error occurred"}</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate percentage used
  const percentUsed = Math.min(100, Math.round((usage.searchesUsed / usage.searchLimit) * 100));
  
  // Format the last reset date
  const lastReset = new Date(usage.lastResetDate);
  const formattedDate = lastReset.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>External Link Search Usage</CardTitle>
        <CardDescription>
          Your monthly search quota for finding external links
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Used: {usage.searchesUsed} searches</span>
            <span>Limit: {usage.searchLimit} searches</span>
          </div>
          <Progress value={percentUsed} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {usage.remaining} searches remaining
          </p>
        </div>

        <div className="rounded-md bg-muted p-4">
          <h4 className="text-sm font-medium mb-2">About External Link Searches</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
            <li>Each article with external linking enabled uses one search</li>
            <li>Search results are cached for 7 days to reduce usage</li>
            <li>Your quota resets monthly (last reset: {formattedDate})</li>
            <li>When you reach your limit, external linking will be disabled</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        {hasQuotaRemaining 
          ? "You can continue using external linking for your articles." 
          : "You've reached your search limit for this month."}
      </CardFooter>
    </Card>
  );
}

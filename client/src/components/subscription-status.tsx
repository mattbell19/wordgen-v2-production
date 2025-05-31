import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Crown, CreditCard } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SubscriptionStatus {
  tier: string;
  credits: {
    used: number;
    total: number;
    payg: number;
  };
  expiryDate?: string;
  isActive: boolean;
}

export function SubscriptionStatus() {
  const { data: status, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/payments/status"],
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="animate-pulse bg-gray-200 h-6 w-32 rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse bg-gray-200 h-4 w-full rounded" />
            <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Free Plan</CardTitle>
          <CardDescription>Upgrade to access premium features</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="default">
            <Crown className="mr-2 h-4 w-4" />
            Upgrade Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  const creditPercentage = (status.credits.used / status.credits.total) * 100;
  const remainingCredits = status.credits.total - status.credits.used;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{status.tier}</CardTitle>
            {status.expiryDate && (
              <CardDescription>
                Renews in {formatDistanceToNow(new Date(status.expiryDate))}
              </CardDescription>
            )}
          </div>
          {status.credits.payg > 0 && (
            <div className="text-right">
              <div className="font-semibold">{status.credits.payg}</div>
              <div className="text-sm text-muted-foreground">PAYG Credits</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {status.isActive && status.credits.total > 0 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Monthly Credits</span>
                  <span>
                    {remainingCredits} / {status.credits.total} remaining
                  </span>
                </div>
                <Progress value={creditPercentage} />
              </div>
            </>
          )}
          {!status.isActive && (
            <Button className="w-full" variant="default">
              <CreditCard className="mr-2 h-4 w-4" />
              Reactivate Subscription
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 
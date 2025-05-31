import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useStripe } from "@/hooks/use-stripe";
import { PricingTable } from "./pricing-table";
import { api } from "@/lib/api";
import type { PricingTier } from "./pricing-table";
import type { Stripe } from '@stripe/stripe-js';

interface SubscriptionStatus {
  tier: string;
  credits: {
    used: number;
    total: number;
    payg: number;
  };
  expiryDate: string | null;
  isActive: boolean;
}

declare global {
  interface Window {
    Stripe?: (key: string) => Stripe;
  }
}

export function SubscriptionManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const { stripe, isStripeLoaded } = useStripe();

  // Get subscription status
  const { data: subscriptionStatus, isLoading: isLoadingStatus } = useQuery<SubscriptionStatus>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const result = await api.stripe.getStatus.query();
      return result;
    },
  });

  // Change plan mutation
  const changePlanMutation = useMutation({
    mutationFn: async (planName: string) => {
      const result = await api.stripe.changePlan.mutate({ planName });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast({
        title: "Success",
        description: "Your subscription has been updated",
      });
      setIsChangingPlan(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!subscriptionStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            Error loading subscription status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p>Failed to load subscription information</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your current subscription plan and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium">Plan</h4>
              <p className="text-2xl font-bold">{subscriptionStatus.tier}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium">Article Credits</h4>
              <div className="mt-2">
                <Progress
                  value={(subscriptionStatus.credits.used / subscriptionStatus.credits.total) * 100}
                  className="h-2"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  {subscriptionStatus.credits.used} of {subscriptionStatus.credits.total} used
                </p>
              </div>
            </div>
            {subscriptionStatus.expiryDate && (
              <div>
                <h4 className="text-sm font-medium">Renewal Date</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(subscriptionStatus.expiryDate).toLocaleDateString()}
                </p>
              </div>
            )}
            <Button
              onClick={() => setIsChangingPlan(true)}
              disabled={!isStripeLoaded}
            >
              Change Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isChangingPlan} onOpenChange={setIsChangingPlan}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Choose a new plan that better suits your needs
            </DialogDescription>
          </DialogHeader>
          <PricingTable
            onSelectPlan={(plan) => {
              if (plan.name === subscriptionStatus.tier) {
                toast({
                  title: "Info",
                  description: "You are already on this plan",
                });
                return;
              }
              changePlanMutation.mutate(plan.name);
            }}
            currentPlan={subscriptionStatus.tier}
            isLoading={changePlanMutation.isPending}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangingPlan(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
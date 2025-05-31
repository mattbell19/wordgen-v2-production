import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Loader2, CreditCard, CheckCircle, AlertCircle, Users, BarChart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TeamBillingProps {
  teamId: number;
  teamName: string;
  isOwner: boolean;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  priceInCents: number;
  interval: string;
  maxMembers: number;
  articleLimit: number | null;
  keywordReportLimit: number | null;
  features: string[];
}

interface TeamSubscription {
  subscription: {
    id: number;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    plan: SubscriptionPlan;
  } | null;
  billingContacts: Array<{
    id: number;
    userId: number;
    isPrimary: boolean;
    user: {
      id: number;
      email: string;
      name: string | null;
    };
  }>;
  usageLimits: Array<{
    id: number;
    resourceType: string;
    limitValue: number;
    period: string;
  }>;
}

interface UsageStats {
  period: string;
  startDate: string;
  endDate: string;
  byResourceType: Record<string, number>;
  byUser: Array<{
    userId: number;
    total: number;
  }>;
  limits: Record<string, {
    limit: number;
    period: string;
    used: number;
    remaining: number;
  }>;
}

export function TeamBilling({ teamId, teamName, isOwner }: TeamBillingProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('pm_card_visa'); // Mock payment method for testing
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subscription plans
  const { data: plans = [], isLoading: isLoadingPlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/teams/billing/plans'],
    queryFn: async () => {
      const response = await fetch('/api/teams/billing/plans', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch subscription plans');
      }
      
      return response.json().then(res => res.data);
    },
  });

  // Fetch team subscription details
  const { data: subscriptionDetails, isLoading: isLoadingSubscription } = useQuery<TeamSubscription>({
    queryKey: [`/api/teams/${teamId}/billing`],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}/billing`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch subscription details');
      }
      
      return response.json().then(res => res.data);
    },
  });

  // Fetch team usage statistics
  const { data: usageStats, isLoading: isLoadingUsage } = useQuery<UsageStats>({
    queryKey: [`/api/teams/${teamId}/billing/usage`],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}/billing/usage`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch usage statistics');
      }
      
      return response.json().then(res => res.data);
    },
    enabled: !!subscriptionDetails?.subscription,
  });

  // Subscribe to a plan
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlanId) {
        throw new Error('Please select a plan');
      }

      const response = await fetch(`/api/teams/${teamId}/billing/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId: selectedPlanId,
          paymentMethodId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to subscribe to plan');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/billing`] });
      toast({
        title: 'Subscription created',
        description: 'Your team has been successfully subscribed to the selected plan',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel subscription
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/teams/${teamId}/billing/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel subscription');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/billing`] });
      toast({
        title: 'Subscription canceled',
        description: 'Your subscription will be canceled at the end of the current billing period',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const isLoading = isLoadingPlans || isLoadingSubscription || isLoadingUsage;
  const hasSubscription = !!subscriptionDetails?.subscription;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If the team has a subscription, show subscription details and usage
  if (hasSubscription) {
    const subscription = subscriptionDetails!.subscription!;
    const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
    const formattedEndDate = currentPeriodEnd.toLocaleDateString();
    
    return (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Overview</CardTitle>
              <CardDescription>
                Your team is currently on the {subscription.plan.name} plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div className="flex items-center mt-1">
                    {subscription.status === 'active' ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm">Active</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-sm">{subscription.status}</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Price</p>
                  <p className="text-sm">
                    {formatCurrency(subscription.plan.priceInCents / 100)}/{subscription.plan.interval}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Renewal Date</p>
                  <p className="text-sm">{formattedEndDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Team Size</p>
                  <div className="flex items-center mt-1">
                    <Users className="h-4 w-4 mr-1" />
                    <span className="text-sm">Up to {subscription.plan.maxMembers} members</span>
                  </div>
                </div>
              </div>
              
              {subscription.cancelAtPeriodEnd && (
                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    Your subscription will be canceled on {formattedEndDate}. You can continue to use all features until then.
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Features</p>
                <ul className="grid grid-cols-2 gap-2">
                  {subscription.plan.features?.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              {isOwner && !subscription.cancelAtPeriodEnd && (
                <Button
                  variant="outline"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Cancel Subscription
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="usage" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
              <CardDescription>
                Monitor your team's resource usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {usageStats ? (
                <>
                  {Object.entries(usageStats.limits).map(([resourceType, limit]) => (
                    <div key={resourceType} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium capitalize">
                          {resourceType.replace('_', ' ')}
                        </p>
                        <p className="text-sm">
                          {limit.used} / {limit.limit} ({Math.round((limit.used / limit.limit) * 100)}%)
                        </p>
                      </div>
                      <Progress value={(limit.used / limit.limit) * 100} className="h-2" />
                    </div>
                  ))}
                  
                  <div className="mt-6">
                    <p className="text-sm font-medium mb-2">Usage by Team Member</p>
                    <div className="space-y-2">
                      {usageStats.byUser.map((userUsage) => (
                        <div key={userUsage.userId} className="flex justify-between items-center">
                          <p className="text-sm">User ID: {userUsage.userId}</p>
                          <p className="text-sm font-medium">{userUsage.total} resources</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <BarChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No usage data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="billing" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>
                Manage your payment methods and billing contacts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Payment Method</p>
                <div className="flex items-center p-3 border rounded-md">
                  <CreditCard className="h-5 w-5 mr-2" />
                  <div>
                    <p className="text-sm font-medium">Visa ending in 4242</p>
                    <p className="text-xs text-muted-foreground">Expires 12/2025</p>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Billing Contacts</p>
                <div className="space-y-2">
                  {subscriptionDetails?.billingContacts.map((contact) => (
                    <div key={contact.id} className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <p className="text-sm font-medium">
                          {contact.user.name || contact.user.email}
                          {contact.isPrimary && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{contact.user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  }

  // If the team doesn't have a subscription, show subscription plans
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose a Team Plan</h2>
        <p className="text-muted-foreground mt-2">
          Select a subscription plan for your team
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative ${selectedPlanId === plan.id ? 'border-primary' : ''}`}
          >
            {selectedPlanId === plan.id && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-1 text-xs rounded-bl-md">
                Selected
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-2">
                <span className="text-2xl font-bold">{formatCurrency(plan.priceInCents / 100)}</span>
                <span className="text-muted-foreground">/{plan.interval}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="text-sm">Up to {plan.maxMembers} team members</span>
                </div>
                {plan.articleLimit && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm">{plan.articleLimit} articles per month</span>
                  </div>
                )}
                {plan.keywordReportLimit && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm">{plan.keywordReportLimit} keyword reports per month</span>
                  </div>
                )}
              </div>
              
              {plan.features && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Features</p>
                  <ul className="space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button
                variant={selectedPlanId === plan.id ? "default" : "outline"}
                className="w-full"
                onClick={() => setSelectedPlanId(plan.id)}
              >
                {selectedPlanId === plan.id ? "Selected" : "Select Plan"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {isOwner && selectedPlanId && (
        <div className="flex justify-center mt-6">
          <Button
            size="lg"
            onClick={() => subscribeMutation.mutate()}
            disabled={subscribeMutation.isPending}
          >
            {subscribeMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Subscribe to Plan
          </Button>
        </div>
      )}
    </div>
  );
}

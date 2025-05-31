import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDistanceToNow, format } from "date-fns";
import { Loader2 } from "lucide-react";

interface UsageStats {
  totalArticles: number;
  totalWordCount: number;
  averageWordCount: number;
  articlesThisMonth: number;
  articlesLastMonth: number;
  monthlyTrend: {
    date: string;
    count: number;
  }[];
}

interface PaymentHistory {
  id: number;
  amount: number;
  status: string;
  type: "subscription" | "payg";
  createdAt: string;
}

export function UsageDashboard() {
  // Fetch subscription status
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/stripe/status"],
  });

  // Fetch usage statistics
  const { data: usageStats, isLoading: statsLoading } = useQuery<UsageStats>({
    queryKey: ["/api/user/usage"],
  });

  // Fetch payment history
  const { data: paymentHistory, isLoading: paymentsLoading } = useQuery<PaymentHistory[]>({
    queryKey: ["/api/payments/history"],
  });

  if (subscriptionLoading || statsLoading || paymentsLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>
            Your current plan and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {subscriptionStatus?.tier || "Free Plan"}
                </div>
                {subscriptionStatus?.expiryDate && (
                  <div className="text-sm text-muted-foreground">
                    Renews in {formatDistanceToNow(new Date(subscriptionStatus.expiryDate))}
                  </div>
                )}
              </div>
              {subscriptionStatus?.credits?.payg > 0 && (
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {subscriptionStatus.credits.payg}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    PAYG Credits
                  </div>
                </div>
              )}
            </div>

            {subscriptionStatus?.credits && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Monthly Credits</span>
                  <span>
                    {subscriptionStatus.credits.used} /{" "}
                    {subscriptionStatus.credits.total} used
                  </span>
                </div>
                <Progress
                  value={
                    (subscriptionStatus.credits.used /
                      subscriptionStatus.credits.total) *
                    100
                  }
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Usage Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Total Articles
                  </div>
                  <div className="text-2xl font-bold">
                    {usageStats?.totalArticles}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Total Words
                  </div>
                  <div className="text-2xl font-bold">
                    {usageStats?.totalWordCount?.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Avg. Words/Article
                  </div>
                  <div className="text-2xl font-bold">
                    {usageStats?.averageWordCount?.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Articles This Month
                  </div>
                  <div className="text-2xl font-bold">
                    {usageStats?.articlesThisMonth}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {usageStats?.articlesThisMonth &&
                      usageStats?.articlesLastMonth && (
                        <>
                          {usageStats.articlesThisMonth >
                          usageStats.articlesLastMonth
                            ? "↑"
                            : "↓"}{" "}
                          {Math.abs(
                            ((usageStats.articlesThisMonth -
                              usageStats.articlesLastMonth) /
                              usageStats.articlesLastMonth) *
                              100
                          ).toFixed(1)}
                          % vs last month
                        </>
                      )}
                  </div>
                </div>
              </div>

              {/* Usage Trend Chart */}
              {usageStats?.monthlyTrend && (
                <div className="mt-6 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={usageStats.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => format(new Date(date), "MMM d")}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(date) =>
                          format(new Date(date), "MMMM d, yyyy")
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8884d8"
                        name="Articles"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usageStats?.monthlyTrend?.map((month) => (
                  <div
                    key={month.date}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div>
                      <div className="font-medium">
                        {format(new Date(month.date), "MMMM yyyy")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {month.count} articles generated
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {((month.count / usageStats.totalArticles) * 100).toFixed(
                          1
                        )}
                        %
                      </div>
                      <div className="text-sm text-muted-foreground">
                        of total usage
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentHistory?.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0"
                  >
                    <div>
                      <div className="font-medium">
                        {payment.type === "subscription"
                          ? "Subscription Payment"
                          : "Pay-As-You-Go"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(payment.createdAt), "PPP")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        £{(payment.amount / 100).toFixed(2)}
                      </div>
                      <div
                        className={`text-sm ${
                          payment.status === "succeeded"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {payment.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
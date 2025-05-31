import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistance } from "date-fns";

interface SitemapReport {
  id: number;
  domain: string;
  status: string;
  sitemapXml: string | null;
  createdAt: string;
  lastRunAt: string | null;
}

export default function SitemapAnalyzer() {
  const [domain, setDomain] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<SitemapReport | null>(null);

  // Fetch all reports
  const reportsQuery = useQuery({
    queryKey: ["/api/scraping/reports"],
    queryFn: async () => {
      const res = await fetch("/api/scraping/reports", { credentials: "include" });
      if (!res.ok) {
        const errorText = await res.text();
        try {
          // Try to parse as JSON
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorJson.message || 'Failed to load reports');
        } catch (e) {
          // If not JSON, use as plain text
          throw new Error(errorText || 'Failed to load reports');
        }
      }
      const data = await res.json();
      return data;
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch("/api/scraping/analyze-site", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        try {
          // Try to parse as JSON
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorJson.message || 'Failed to analyze site');
        } catch (e) {
          // If not JSON, use as plain text
          throw new Error(errorText || 'Failed to analyze site');
        }
      }

      const data = await res.json();
      return data;
    },
    onSuccess: () => {
      reportsQuery.refetch();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDomainError(null);

    // Basic validation
    if (!domain) {
      setDomainError("Please enter a domain");
      return;
    }

    // Simple URL validation
    let url = domain;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      new URL(url);
      analyzeMutation.mutate(url);
    } catch (error) {
      setDomainError("Please enter a valid domain");
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Sitemap Analyzer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter website URL (e.g., www.example.com)"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className={`flex-1 ${domainError ? 'border-red-500' : ''}`}
                  />
                  <Button
                    type="submit"
                    disabled={analyzeMutation.isLoading}
                  >
                    {analyzeMutation.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Sitemap"
                    )}
                  </Button>
                </div>
                {domainError && (
                  <p className="text-sm text-red-500">{domainError}</p>
                )}
              </div>
            </form>

            {analyzeMutation.isError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>
                  {analyzeMutation.error instanceof Error
                    ? analyzeMutation.error.message
                    : "Failed to analyze sitemap"}
                </AlertDescription>
              </Alert>
            )}

            {analyzeMutation.isSuccess && !analyzeMutation.data?.data?.sitemapXml && (
              <Alert className="mt-4">
                <AlertDescription>
                  No sitemap data was found. The site may not have a sitemap, or there might have been an error processing it.
                </AlertDescription>
              </Alert>
            )}

            {((analyzeMutation.isSuccess && analyzeMutation.data?.data?.sitemapXml) || selectedReport?.sitemapXml) && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Sitemap XML</h3>
                <ScrollArea className="h-[500px] w-full rounded-md border">
                  <pre className="p-4 text-sm">
                    {selectedReport?.sitemapXml || (analyzeMutation.data?.data?.sitemapXml ?? 'No sitemap data available')}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Previous Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {reportsQuery.isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : reportsQuery.isError ? (
              <Alert variant="destructive">
                <AlertDescription>Failed to load reports</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {reportsQuery.data?.data?.length > 0 ? (
                  reportsQuery.data.data.map((report: SitemapReport) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => setSelectedReport(report)}
                  >
                    <div>
                      <p className="font-medium">{report.domain}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistance(new Date(report.createdAt), new Date(), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReport(report);
                      }}
                    >
                      View
                    </Button>
                  </div>
                )))
                : (
                  <div className="text-center p-4 text-muted-foreground">
                    No previous reports found. Analyze a sitemap to get started.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
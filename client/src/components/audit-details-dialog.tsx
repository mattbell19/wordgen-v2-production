import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface AuditResult {
  id: number;
  taskId: number;
  totalPages: number;
  healthScore: number;
  criticalIssues: number;
  warnings: number;
  passed: number;
  createdAt: string;
  onPageData: {
    domain_info: {
      name: string;
      crawl_start: string;
      crawl_end: string;
      total_pages: number;
      cms: string;
      ssl_info: {
        valid_certificate: boolean;
        certificate_expiration_date: string;
      };
    };
    page_metrics: {
      onpage_score: number;
      links_external: number;
      links_internal: number;
      checks: Record<string, number>;
    };
    crawl_progress: string;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result?: AuditResult | null;
}

export function AuditDetailsDialog({ open, onOpenChange, result }: Props) {
  const [selectedTab, setSelectedTab] = useState<string>("all");

  if (!result?.onPageData?.domain_info || !result?.onPageData?.page_metrics) {
    return null;
  }

  const { domain_info, page_metrics } = result.onPageData;

  // Transform checks into categorized issues
  const issues = Object.entries(page_metrics.checks || {}).map(([key, value]) => {
    let type = 'passed';
    if (key.includes('broken') || key.includes('error') || key.includes('invalid') || key.includes('4xx') || key.includes('5xx')) {
      type = 'critical';
    } else if (value > 0 && (key.includes('missing') || key.includes('no_') || key.includes('duplicate'))) {
      type = 'warning';
    }

    return {
      type,
      category: key.replace(/_/g, ' '),
      description: `Found ${value} instance${value !== 1 ? 's' : ''} of ${key.replace(/_/g, ' ')}`,
      url: domain_info.name,
      priority: type === 'critical' ? 3 : type === 'warning' ? 2 : 1,
    };
  });

  const filteredIssues = selectedTab === "all" 
    ? issues 
    : issues.filter(issue => issue.type === selectedTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>SEO Audit Results for {domain_info.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-2">Health Score</div>
                <div className="flex items-center justify-center gap-2">
                  <Progress value={result.healthScore} className="w-20" />
                  <span className="text-xl font-semibold">{Math.round(result.healthScore)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-2">Issues Found</div>
                <div className="flex justify-center gap-4 text-sm">
                  <span className="text-destructive flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    {result.criticalIssues}
                  </span>
                  <span className="text-yellow-500 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {result.warnings}
                  </span>
                  <span className="text-green-500 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    {result.passed}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mb-2">Total Pages</div>
                <div className="text-xl font-semibold">
                  {result.totalPages}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Links: {page_metrics.links_internal} internal, {page_metrics.links_external} external
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All Issues ({issues.length})
            </TabsTrigger>
            <TabsTrigger value="critical">
              Critical ({issues.filter(i => i.type === 'critical').length})
            </TabsTrigger>
            <TabsTrigger value="warning">
              Warnings ({issues.filter(i => i.type === 'warning').length})
            </TabsTrigger>
            <TabsTrigger value="passed">
              Passed ({issues.filter(i => i.type === 'passed').length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value={selectedTab} className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <div className="space-y-4">
                {filteredIssues.map((issue, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            {issue.type === 'critical' ? (
                              <Badge variant="destructive">Critical</Badge>
                            ) : issue.type === 'warning' ? (
                              <Badge variant="secondary" className="bg-yellow-500/15 text-yellow-500">Warning</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-500/15 text-green-500">Passed</Badge>
                            )}
                            <Badge variant="outline">{issue.category}</Badge>
                          </div>
                          <p className="text-sm mb-2">{issue.description}</p>
                          <p className="text-sm text-muted-foreground">
                            URL: {issue.url}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuditDetailsDialog } from "@/components/audit-details-dialog";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const auditFormSchema = z.object({
  domain: z.string().url("Please enter a valid URL"),
  path: z.string().optional(),
  schedule: z.enum(["none", "weekly", "monthly"]),
});

type AuditFormValues = z.infer<typeof auditFormSchema>;

interface AuditTask {
  id: number;
  domain: string;
  path?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'ready';
  schedule?: 'none' | 'weekly' | 'monthly';
  createdAt: string;
  results: Array<{
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
  }>;
}

export default function SEOAudit() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<AuditFormValues>({
    resolver: zodResolver(auditFormSchema),
    defaultValues: {
      domain: "",
      path: "",
      schedule: "none",
    },
  });

  // Fetch tasks query with proper error handling
  const { data: tasks = [], isLoading: isTasksLoading, error: tasksError } = useQuery<AuditTask[]>({
    queryKey: ["/api/seo/tasks"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/seo/tasks", {
          credentials: 'include'
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Failed to fetch tasks');
        }

        return response.json();
      } catch (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }
    },
    refetchInterval: (data) => {
      if (!Array.isArray(data)) return false;
      const hasPendingTasks = data.some(task => ['pending', 'processing'].includes(task.status));
      return hasPendingTasks ? 10000 : false;
    }
  });

  // Selected task query with proper error handling
  const { data: selectedTask } = useQuery<AuditTask['results'][0] | null>({
    queryKey: ["/api/seo/tasks", selectedTaskId, "process"],
    queryFn: async () => {
      try {
        if (!selectedTaskId) return null;

        const response = await fetch(`/api/seo/tasks/${selectedTaskId}/process`, {
          method: 'POST',
          credentials: 'include'
        });

        if (!response.ok && response.status !== 202) {
          const error = await response.text();
          throw new Error(error || 'Failed to fetch task results');
        }

        if (response.status === 202) {
          setIsProcessing(true);
          return null;
        }

        const result = await response.json();
        setIsProcessing(false);
        return result;
      } catch (error) {
        console.error('Error processing task:', error);
        setIsProcessing(false);
        throw error;
      }
    },
    enabled: !!selectedTaskId,
    refetchInterval: (data) => {
      if (!data || !selectedTaskId) {
        setIsProcessing(false);
        return false;
      }
      return isProcessing ? 10000 : false;
    }
  });

  // Create audit mutation
  const createAuditMutation = useMutation({
    mutationFn: async (values: AuditFormValues) => {
      try {
        const response = await fetch("/api/seo/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
          credentials: 'include',
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Failed to create audit task');
        }

        return response.json();
      } catch (error) {
        console.error('Error creating audit task:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "SEO audit task created successfully.",
      });
      form.reset();
      setSelectedTaskId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/seo/tasks"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: AuditFormValues) => {
    try {
      if (!values.domain.startsWith('http')) {
        values.domain = `https://${values.domain}`;
      }
      await createAuditMutation.mutateAsync(values);
    } catch (error) {
      console.error('Audit task creation error:', error);
    }
  };

  // Handle view results click
  const handleViewResults = (taskId: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    setSelectedTaskId(taskId);

    if (task.status === 'completed' && task.results?.[0]) {
      setIsDetailsOpen(true);
    } else if (task.status === 'ready') {
      setIsProcessing(true);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>SEO Audit Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific Path (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="/blog" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="schedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audit Schedule</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select schedule" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">One-time audit</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={createAuditMutation.isPending}>
                {createAuditMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating audit...
                  </div>
                ) : "Start SEO Audit"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Audits</CardTitle>
        </CardHeader>
        <CardContent>
          {isTasksLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : tasksError ? (
            <div className="text-center py-4 text-destructive">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
              <p>Failed to load audit tasks. Please try again.</p>
            </div>
          ) : tasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Health Score</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id} className="hover:bg-muted/50">
                    <TableCell>{task.domain}{task.path}</TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell>{task.schedule || 'One-time'}</TableCell>
                    <TableCell>
                      {task.results?.[0]?.healthScore ? (
                        <div className="flex items-center gap-2">
                          <Progress value={task.results[0].healthScore} className="w-20" />
                          <span>{Math.round(task.results[0].healthScore)}%</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {task.results?.[0] ? (
                        <div className="flex gap-4 text-sm">
                          <span className="text-destructive flex items-center gap-1">
                            <XCircle className="h-4 w-4" />
                            {task.results[0].criticalIssues}
                          </span>
                          <span className="text-yellow-500 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            {task.results[0].warnings}
                          </span>
                          <span className="text-green-500 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            {task.results[0].passed}
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewResults(task.id)}
                        disabled={isProcessing || task.status === 'failed'}
                        className="flex items-center gap-2"
                      >
                        {isProcessing && selectedTaskId === task.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            View Results
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No audits found. Start your first SEO audit above.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTaskId !== null && (
        <AuditDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          result={selectedTask}
        />
      )}
    </div>
  );
}

function getStatusBadge(status: AuditTask['status']) {
  switch (status) {
    case 'completed':
      return <Badge variant="secondary" className="bg-green-500/15 text-green-500">Completed</Badge>;
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>;
    case 'processing':
      return <Badge variant="secondary" className="bg-blue-500/15 text-blue-500">Processing</Badge>;
    case 'ready':
      return <Badge variant="secondary" className="bg-yellow-500/15 text-yellow-500">Ready</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}
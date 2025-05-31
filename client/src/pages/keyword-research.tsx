import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeywordResearchResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, TrendingUp, Save, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { KeywordResultsSection } from "@/components/keyword-results-section";


// Define interface for keyword list data
interface KeywordList {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  savedKeywords: Array<{
    id: number;
    keyword: string;
    searchVolume: number;
    difficulty?: number;
    competition?: number;
    relatedKeywords?: string[];
  }>;
}

const formSchema = z.object({
  search_question: z.string().min(2, "Keyword must be at least 2 characters").max(100),
  search_country: z.string().default("en-US"),
});

const saveListSchema = z.object({
  listId: z.string().optional(),
  newListName: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.listId && !data.newListName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either select an existing list or enter a new list name",
      path: ["listId"]
    });
  }
});

export default function KeywordResearch() {
  const { toast } = useToast();
  const [results, setResults] = useState<KeywordResearchResult[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch existing keyword lists with proper typing
  const { data: keywordLists = [] } = useQuery<KeywordList[]>({
    queryKey: ["/api/keywords/lists"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      search_question: "",
      search_country: "en-US",
    },
  });

  const saveForm = useForm<z.infer<typeof saveListSchema>>({
    resolver: zodResolver(saveListSchema),
    defaultValues: {
      listId: undefined,
      newListName: "",
    },
  });

  const researchKeywords = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log("[Client] Starting keyword research with data:", data);

      const response = await fetch(`/api/keywords/rapid-research?keyword=${encodeURIComponent(data.search_question)}&location=${encodeURIComponent(data.search_country)}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("[Client] Received response data:", responseData);

      // Transform the data to match our expected format
      const transformedData = responseData.data.map((item: any) => ({
        keyword: item.text,
        searchVolume: item.volume || 0,
        difficulty: Math.round((item.competition_index || 0) * 100 / 100),
        competition: item.competition_level === 'HIGH' ? 100 : 
                    item.competition_level === 'MEDIUM' ? 50 : 
                    item.competition_level === 'LOW' ? 25 : 0,
        relatedKeywords: []
      }));

      return {
        success: true,
        data: transformedData
      };
    },
    onSuccess: (data) => {
      console.log("[Client] Successfully received keyword data:", data);
      setResults(data.data);
      setSelectedKeywords(new Set());
      toast({
        title: "Keywords Found",
        description: `Found ${data.data.length} related keywords for your search.`,
      });
    },
    onError: (error: Error) => {
      console.error("[Client] Mutation Error:", error);
      toast({
        title: "Error Researching Keywords",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveKeywords = useMutation({
    mutationFn: async (data: z.infer<typeof saveListSchema> & { keywords: KeywordResearchResult[] }) => {
      const response = await fetch("/api/keywords/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save keywords");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsSaveDialogOpen(false);
      setSelectedKeywords(new Set());
      saveForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/keywords/lists'] });
      toast({
        title: "Success",
        description: "Keywords saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveSubmit = async (data: z.infer<typeof saveListSchema>) => {
    try {
      await saveKeywords.mutateAsync({
        listId: data.listId,
        newListName: data.newListName,
        keywords: Array.from(selectedKeywords).map(keyword => results.find(result => result.keyword === keyword)!)
      });

      // Prefetch the lists data immediately after saving
      await queryClient.prefetchQuery({
        queryKey: ['/api/keywords/lists'],
        staleTime: 0
      });
    } catch (error) {
      console.error('Failed to save keywords:', error);
    }
  };

  useEffect(() => {
    // Clear any automatically triggered save dialogs when component mounts
    setIsSaveDialogOpen(false);
  }, []);

  const toggleKeywordSelection = (keyword: string) => {
    const newSelection = new Set(selectedKeywords);
    if (newSelection.has(keyword)) {
      newSelection.delete(keyword);
    } else {
      newSelection.add(keyword);
    }
    setSelectedKeywords(newSelection);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Keyword Research
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Find high-performing keywords for your content strategy
          </p>
        </div>

        {researchKeywords.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {researchKeywords.error.message}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-2">
          <CardHeader>
            <CardTitle>Research Keywords</CardTitle>
            <CardDescription>
              Enter your topic and target market to discover relevant keywords
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => researchKeywords.mutate(data))}
                className="space-y-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="search_question"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Search Query</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Enter a keyword or topic"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="search_country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Market</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select market" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en-US">United States</SelectItem>
                            <SelectItem value="en-GB">United Kingdom</SelectItem>
                            <SelectItem value="en-CA">Canada</SelectItem>
                            <SelectItem value="en-AU">Australia</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={researchKeywords.isLoading}
                >
                  {researchKeywords.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Researching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Research Keywords
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <KeywordResultsSection
          results={results}
          selectedKeywords={selectedKeywords}
          onToggleKeyword={toggleKeywordSelection}
          onOpenSaveDialog={() => setIsSaveDialogOpen(true)}
        />

        <Dialog 
          open={isSaveDialogOpen} 
          onOpenChange={(open) => {
            setIsSaveDialogOpen(open);
            if (!open) {
              // Reset form when dialog closes
              saveForm.reset();
              // Remove focus from any elements inside the dialog
              document.activeElement instanceof HTMLElement && document.activeElement.blur();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setIsSaveDialogOpen(true)}>
              <Save className="mr-2 h-4 w-4" />
              Save Selected ({selectedKeywords.size})
            </Button>
          </DialogTrigger>
          <DialogContent onEscapeKeyDown={() => setIsSaveDialogOpen(false)} onInteractOutside={() => setIsSaveDialogOpen(false)}>
            <DialogHeader>
              <DialogTitle>Save Keywords</DialogTitle>
              <DialogDescription>
                Save selected keywords to a new or existing list
              </DialogDescription>
            </DialogHeader>
            <Form {...saveForm}>
              <form onSubmit={saveForm.handleSubmit(handleSaveSubmit)} className="space-y-4">
                <FormField
                  control={saveForm.control}
                  name="listId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Existing List</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Clear new list name when selecting existing list
                          if (value) {
                            saveForm.setValue("newListName", "");
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a list" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {keywordLists.map((list) => (
                            <SelectItem key={list.id} value={String(list.id)}>
                              {list.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={saveForm.control}
                  name="newListName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Or Create New List</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter new list name"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            // Clear list selection when typing new list name
                            if (e.target.value) {
                              saveForm.setValue("listId", undefined);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={saveKeywords.isLoading}
                    className="w-full"
                  >
                    {saveKeywords.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Keywords
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
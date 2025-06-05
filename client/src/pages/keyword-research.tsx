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
  search_question: z.string().min(1, "Please enter a search query"),
  market: z.string().min(1, "Please select a target market")
});

type FormValues = z.infer<typeof formSchema>;

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

interface ApiError {
  message: string;
}

interface KeywordResearchResponse {
  success: boolean;
  data: KeywordResearchResult[];
}

interface SaveKeywordsResponse {
  success: boolean;
  listId: number;
}

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      search_question: "",
      market: "us"
    }
  });

  const saveForm = useForm<z.infer<typeof saveListSchema>>({
    resolver: zodResolver(saveListSchema),
    defaultValues: {
      listId: undefined,
      newListName: "",
    },
  });

  const researchKeywords = useMutation<KeywordResearchResponse, ApiError, FormValues>({
    mutationFn: async (data) => {
      const response = await fetch("/api/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to research keywords");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data.data);
      setSelectedKeywords(new Set());
      toast({
        title: "Keywords Found",
        description: `Found ${data.data.length} related keywords for your search.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error Researching Keywords",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const saveKeywords = useMutation<SaveKeywordsResponse, ApiError, z.infer<typeof saveListSchema> & { keywords: KeywordResearchResult[] }>({
    mutationFn: async (data) => {
      const response = await fetch("/api/keywords/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save keywords");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsSaveDialogOpen(false);
      toast({
        title: "Keywords Saved",
        description: "Your keywords have been saved successfully.",
      });
      saveForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error Saving Keywords",
        description: error.message,
        variant: "destructive",
      });
    }
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
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Keyword Research
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Discover high-performing keywords and optimize your content strategy
          </p>
        </div>

        {researchKeywords.error && (
          <Alert variant="destructive" className="animate-in fade-in-50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {researchKeywords.error.message}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Research Keywords
            </CardTitle>
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
                <div className="grid gap-6 md:grid-cols-2">
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
                    name="market"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Market</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a market" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="us">United States</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                            <SelectItem value="ca">Canada</SelectItem>
                            <SelectItem value="au">Australia</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={researchKeywords.status === "loading"}
                    className="min-w-[120px]"
                  >
                    {researchKeywords.status === "loading" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Researching...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Research
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {researchKeywords.status === "loading" && (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in-50">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Researching keywords...</p>
          </div>
        )}

        {/* Results Section */}
        {results && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <KeywordResultsSection
              results={results}
              selectedKeywords={selectedKeywords}
              onToggleKeyword={toggleKeywordSelection}
              onOpenSaveDialog={() => setIsSaveDialogOpen(true)}
            />
          </motion.div>
        )}

        {/* Save Dialog */}
        <Dialog 
          open={isSaveDialogOpen} 
          onOpenChange={(open) => {
            setIsSaveDialogOpen(open);
            if (!open) {
              saveForm.reset();
              document.activeElement instanceof HTMLElement && document.activeElement.blur();
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                Save Keywords
              </DialogTitle>
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

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>

                <FormField
                  control={saveForm.control}
                  name="newListName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Create New List</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter list name"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            saveForm.setValue("listId", "");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="submit"
                    disabled={saveKeywords.status === "loading"}
                    className="w-full sm:w-auto"
                  >
                    {saveKeywords.status === "loading" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save {selectedKeywords.size} Keywords
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
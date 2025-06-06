import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArticleResponse } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, Search, Settings2, Target } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArticleSettingsDialog } from "./article-settings-dialog";
import { useArticleSettings } from "@/hooks/use-article-settings";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/hooks/use-user";
import { useState, useEffect } from "react";

interface ArticleFormProps {
  onArticleGenerated: (article: ArticleResponse) => void;
}

interface User {
  id: number;
  email: string;
}

const formSchema = z.object({
  keyword: z.string().min(2).max(100),
  industry: z.string().optional(),
  contentType: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Function to get correct API URL
function getApiUrl(endpoint: string): string {
  // In development, use the proxy configured in vite.config.ts
  return endpoint;
}

export function ArticleForm({ onArticleGenerated }: ArticleFormProps) {
  const { toast } = useToast();
  const { settings } = useArticleSettings();
  const { user, isLoading: isUserLoading } = useUser();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Add a delay to ensure auth session is fully loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Debug to check if user is loaded correctly
  useEffect(() => {
    if (user) {
      console.log('User authenticated:', { id: user.id, email: user.email });
    }
  }, [user]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keyword: "",
      industry: "marketing",
      contentType: "guide",
    },
  });

  const generateArticle = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!user?.id) {
        console.error("No user ID available for article generation");
        throw new Error("You must be logged in to generate articles");
      }

      if (isSubmitting) {
        throw new Error("Article generation already in progress");
      }

      setIsSubmitting(true);

      const requestBody = {
        keyword: formData.keyword,
        tone: settings.writingStyle,
        wordCount: settings.wordCount,
        enableInternalLinking: settings.enableInternalLinking,
        enableExternalLinking: settings.enableExternalLinking,
        userId: user.id,
        language: settings.language,
        callToAction: settings.callToAction,
        industry: formData.industry || "marketing",
        targetAudience: settings.writingStyle,
        contentType: formData.contentType || "guide",
      };

      console.log('Sending article generation request:', requestBody);

      try {
        // Add a delay to ensure auth session is loaded
        await new Promise(resolve => setTimeout(resolve, 500));

        const genResponse = await fetch('/api/ai/article/generate', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(requestBody),
          credentials: 'include',
        });

        if (!genResponse.ok) {
          // Check for authentication error and prompt user to login again
          if (genResponse.status === 401) {
            console.error("Authentication error during article generation");

            // Force a refresh of the user data and return to login page
            queryClient.invalidateQueries({ queryKey: ['user'] });
            window.location.href = '/auth';

            throw new Error("Authentication failed. Please try logging in again.");
          }

          let errorMessage = `Failed to generate article (${genResponse.status})`;
          try {
            const errorData = await genResponse.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            try {
              const errorText = await genResponse.text();
              if (errorText) {
                errorMessage = `Server error: ${errorText.substring(0, 100)}...`;
              }
            } catch (textError) {
              console.error('Failed to parse error response:', textError);
            }
          }
          throw new Error(errorMessage);
        }

        const genData = await genResponse.json();
        console.log('Article generation response:', genData);

        if (!genData.success) {
          throw new Error(genData.message || genData.error || "Failed to generate article");
        }

        const queueId = genData.data.queueId;
        console.log("Article queued with ID:", queueId);

        // Poll for completion
        const pollForCompletion = async (): Promise<any> => {
          const maxAttempts = 30; // 5 minutes max (10 second intervals)
          let attempts = 0;

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            attempts++;

            try {
              const statusResponse = await fetch(`/api/ai/article/status/${queueId}`, {
                credentials: "include",
              });

              if (!statusResponse.ok) {
                // If we get 401, the session expired, just continue polling
                if (statusResponse.status === 401) {
                  console.log(`Poll attempt ${attempts}: Session expired, continuing...`);
                  continue;
                }
                throw new Error(`Status check failed: ${statusResponse.status}`);
              }

              const statusData = await statusResponse.json();
              console.log(`Poll attempt ${attempts}:`, statusData);

              if (statusData.success && statusData.data.queue) {
                const queue = statusData.data.queue;

                if (queue.status === 'completed') {
                  // Article generation completed
                  if (statusData.data.articles && statusData.data.articles.length > 0) {
                    return statusData.data.articles[0]; // Return the first (and only) article
                  } else {
                    throw new Error("Article generation completed but no article found");
                  }
                } else if (queue.status === 'failed') {
                  throw new Error(queue.error || "Article generation failed");
                }
                // Continue polling if status is 'pending' or 'processing'
              }
            } catch (error) {
              console.error(`Poll attempt ${attempts} failed:`, error);
              // For 401 errors, continue polling
              if (error.message?.includes('401')) {
                continue;
              }
              if (attempts >= maxAttempts) {
                throw error;
              }
            }
          }

          throw new Error("Article generation timed out after 5 minutes");
        };

        const article = await pollForCompletion();
        console.log("Article generation completed:", article);

        return article as ArticleResponse;
      } catch (error: any) {
        console.error("Article generation/save error:", error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (data) => {
      onArticleGenerated(data);
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/articles/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
      toast({
        title: "Success",
        description: "Your SEO-optimized article has been generated and saved successfully.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      console.error("Article generation error:", {
        error,
        message: error.message,
        stack: error.stack
      });
      toast({
        title: "Error",
        description: error.message || "Failed to generate article. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    generateArticle.mutate(data);
  };

  // If the user data is still loading or not ready, show a loading state
  if (isUserLoading || !isReady) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading article writer...</span>
      </div>
    );
  }

  // If no user is found after loading, show an authentication error
  if (!user?.id && !isUserLoading && isReady) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You must be logged in to generate articles. Please <a href="/auth" className="underline font-semibold">sign in</a> to continue.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Target Keyword</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {generateArticle.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {generateArticle.error instanceof Error ? generateArticle.error.message : 'An error occurred'}
              </AlertDescription>
            </Alert>
          )}

          {/* Keyword Input */}
          <FormField
            control={form.control}
            name="keyword"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="best coffee machines"
                    className="text-lg py-6 px-4 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-purple-500"
                    {...field}
                    disabled={isSubmitting || generateArticle.isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Industry and Content Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Industry</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-2 border-gray-200 focus:border-purple-500">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ai_saas">AI & SaaS</SelectItem>
                      <SelectItem value="finance">Finance & Fintech</SelectItem>
                      <SelectItem value="marketing">Marketing & Growth</SelectItem>
                      <SelectItem value="ecommerce">E-commerce & Retail</SelectItem>
                      <SelectItem value="healthcare">Healthcare & Medical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs text-gray-500">
                    Choose your industry for expert-level content
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Content Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-2 border-gray-200 focus:border-purple-500">
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="guide">How-to Guide</SelectItem>
                      <SelectItem value="comparison">Comparison Article</SelectItem>
                      <SelectItem value="analysis">Industry Analysis</SelectItem>
                      <SelectItem value="review">Product Review</SelectItem>
                      <SelectItem value="listicle">List Article</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs text-gray-500">
                    Choose the type of content to generate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Generate Button */}
          <Button
            type="submit"
            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg shadow-lg"
            disabled={isSubmitting || generateArticle.isLoading || !user?.id}
          >
            {(isSubmitting || generateArticle.isLoading) ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Article (30-60s)...
              </>
            ) : (
              <>
                <span className="mr-2">✨</span>
                Generate Article
              </>
            )}
          </Button>

          {/* Article Settings Panel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Article Settings</h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Words</label>
                <div className="text-2xl font-bold text-purple-600">{settings.wordCount}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
                <div className="text-lg font-semibold text-gray-900 capitalize">{settings.writingStyle}</div>
              </div>
            </div>

            {/* Enhanced Dual Format Quality Features */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center mb-3">
                <span className="mr-2">🎯</span>
                <span className="text-sm font-semibold text-purple-700">Dual Format AI System</span>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Intelligent format selection with 90+ quality targeting and competitor-level standards
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Format Selection</span>
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">Auto</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Universal Guide</span>
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">8 Sections</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Technical/Tutorial</span>
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">7 Sections</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Quality Target</span>
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">90+</span>
                  </div>
                </div>
              </div>

              {/* Format Examples */}
              <div className="mt-3 p-2 bg-white rounded border border-purple-100">
                <div className="text-xs text-gray-600">
                  <div className="mb-1">
                    <span className="font-medium text-purple-700">Universal Guide:</span> Tax, legal, financial topics
                  </div>
                  <div>
                    <span className="font-medium text-purple-700">Technical/Tutorial:</span> Specs, how-to, optimization
                  </div>
                </div>
              </div>
            </div>



            {/* Settings Button */}
            <div className="pt-4 border-t border-gray-200">
              <ArticleSettingsDialog />
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
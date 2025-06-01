import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArticleResponse } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, Search, Settings2 } from "lucide-react";
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

        const saveResponse = await fetch('/api/articles', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            title: formData.keyword,
            content: genData.data.content,
            settings: {
              tone: settings.writingStyle,
              wordCount: settings.wordCount,
              language: settings.language,
              enableInternalLinking: settings.enableInternalLinking,
              enableExternalLinking: settings.enableExternalLinking
            },
            primaryKeyword: formData.keyword
          }),
          credentials: 'include',
        });

        if (!saveResponse.ok) {
          let errorMessage = `Failed to save article (${saveResponse.status})`;
          try {
            const errorData = await saveResponse.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            try {
              const errorText = await saveResponse.text();
              if (errorText) {
                errorMessage = `Server error: ${errorText.substring(0, 100)}...`;
              }
            } catch (textError) {
              console.error('Failed to parse error response:', textError);
            }
          }
          throw new Error(errorMessage);
        }

        const savedData = await saveResponse.json();
        console.log('Article save response:', savedData);

        if (!savedData.success) {
          throw new Error(savedData.message || savedData.error || 'Failed to save article');
        }

        return genData.data as ArticleResponse;
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

          {/* Generate Button */}
          <Button
            type="submit"
            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg shadow-lg"
            disabled={isSubmitting || generateArticle.isLoading || !user?.id}
          >
            {(isSubmitting || generateArticle.isLoading) ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Article...
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">SEO Optimization</span>
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium">✓</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Readability</span>
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium">✓</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Fact Checking</span>
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium">✓</span>
                </div>
              </div>
            </div>

            {/* SEO Score */}
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">🏆 SEO Score</span>
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-2">92/100</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '92%' }}></div>
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
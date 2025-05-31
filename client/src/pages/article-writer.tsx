import { ArticleForm } from "@/components/article-form";
import { ArticlePreview } from "@/components/article-preview";
import { useState, useEffect } from "react";
import { useLocation } from "wouter"; 
import { useAuth } from "@/hooks/use-auth";
import { ArticleResponse } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ArticleWriter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation(); 
  const [article, setArticle] = useState<ArticleResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/auth'); 
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleArticleGeneration = async (articleData: ArticleResponse) => {
    setIsGenerating(false);
    setArticle(articleData);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            AI Article Writer
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Generate high-quality, SEO-optimized articles using advanced AI. Simply enter your target keyword and let our AI do the rest.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Generate Article</CardTitle>
              <CardDescription>
                Enter your target keyword and customize generation settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ArticleForm onArticleGenerated={handleArticleGeneration} />
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                View and edit your generated article
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ArticlePreview article={article} isLoading={isGenerating} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
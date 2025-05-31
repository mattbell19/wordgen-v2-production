import { ArticleForm } from "@/components/article-form";
import { ArticlePreview } from "@/components/article-preview";
import { useState } from "react";
import { ArticleResponse } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const [article, setArticle] = useState<ArticleResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleArticleGeneration = async (articleData: ArticleResponse) => {
    setIsGenerating(false);
    setArticle(articleData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              AI SEO Article Generator
            </h1>
            <p className="text-muted-foreground">
              Generate high-quality, SEO-optimized articles using advanced AI
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <ArticleForm 
                  onArticleGenerated={handleArticleGeneration} 
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <ArticlePreview 
                  article={article} 
                  isLoading={isGenerating} 
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
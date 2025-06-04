import { BulkArticleForm } from "@/components/bulk-article-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArticleDialog } from "@/components/article-dialog";
import { useState } from "react";
import { ArticleResponse } from "@/lib/types";
import type { SelectArticle } from "@db/schema";

// Helper function to strip HTML tags and get clean text for preview
const getCleanTextPreview = (htmlContent: string, maxLength: number = 200): string => {
  // Remove HTML tags
  const textContent = htmlContent.replace(/<[^>]*>/g, '');
  
  // Remove extra whitespace and line breaks
  const cleanText = textContent.replace(/\s+/g, ' ').trim();
  
  // Truncate to desired length
  if (cleanText.length <= maxLength) {
    return cleanText;
  }
  
  return cleanText.slice(0, maxLength);
};

export default function BulkArticleWriter() {
  const [articles, setArticles] = useState<ArticleResponse[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<SelectArticle | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleArticleClick = (article: ArticleResponse, index: number) => {
    // Convert ArticleResponse to SelectArticle format for the dialog
    const selectArticle: SelectArticle = {
      id: index, // Use index as temporary id
      userId: 0, // These fields are required by the type but not used in dialog
      projectId: null,
      title: `Article ${index + 1}`,
      content: article.content,
      wordCount: article.wordCount,
      readingTime: Math.ceil(article.wordCount / 200),
      settings: article.settings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setSelectedArticle(selectArticle);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Bulk Article Generator
          </h1>
          <p className="text-muted-foreground">
            Generate multiple SEO-optimized articles at once
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <BulkArticleForm onArticleGenerated={setArticles} />
          </CardContent>
        </Card>

        {articles.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Generated Articles</h2>
              <div className="space-y-4">
                {articles.map((article, index) => (
                  <div 
                    key={index} 
                    className="border-b pb-4 cursor-pointer hover:bg-slate-50 p-4 rounded-lg transition-colors"
                    onClick={() => handleArticleClick(article, index)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">Article {index + 1}</h3>
                      <Button variant="ghost" size="sm">
                        View Full Article
                      </Button>
                    </div>
                    <p className="text-muted-foreground">{getCleanTextPreview(article.content, 200)}...</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <ArticleDialog
          article={selectedArticle}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    </div>
  );
}
import { ArticleForm } from "@/components/article-form";
import { ArticlePreview } from "@/components/article-preview";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ArticleResponse } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenTool, Eye, Zap } from "lucide-react";

export default function ArticleWriter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [article, setArticle] = useState<ArticleResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("write");

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
    // Auto-switch to preview tab when article is generated
    setActiveTab("preview");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="write" className="flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                Write
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="optimize" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Optimize
              </TabsTrigger>
            </TabsList>

            <TabsContent value="write" className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <ArticleForm onArticleGenerated={handleArticleGeneration} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-6">
              <Card className="border-0 shadow-lg overflow-visible">
                <CardContent className="p-0">
                  <ArticlePreview article={article} isLoading={isGenerating} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="optimize" className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="text-center py-12">
                    <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">SEO Optimization</h3>
                    <p className="text-muted-foreground">
                      Generate an article first to access optimization tools
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
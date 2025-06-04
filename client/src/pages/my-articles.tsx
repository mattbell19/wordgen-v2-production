import { Card, CardContent } from "@/components/ui/card";
import { ArticleCard } from "@/components/article-card";
import { ArticleDialog } from "@/components/article-dialog";
import { useQuery } from "@tanstack/react-query";
import type { SelectArticle, SelectProject } from "@db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { useLocation, useRoute } from "wouter";

function ArticlesSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="h-[300px]">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[90%]" />
                <Skeleton className="h-3 w-[80%]" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  details?: string;
}

export default function MyArticles() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/dashboard/my-articles/:id");
  const articleId = params?.id ? parseInt(params.id) : null;

  const { data: articlesResponse, isLoading: isLoadingArticles, error: articlesError } = useQuery<ApiResponse<SelectArticle[]>>({
    queryKey: ['articles'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/articles', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || `Failed to fetch articles: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch articles');
        }
        
        return data;
      } catch (err) {
        console.error('Article fetch error:', err);
        throw err;
      }
    },
    retry: 1,
    retryDelay: 1000
  });

  const { data: projectsResponse, isLoading: isLoadingProjects, error: projectsError } = useQuery<ApiResponse<SelectProject[]>>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/projects', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || `Failed to fetch projects: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch projects');
        }

        return data;
      } catch (err) {
        console.error('Projects fetch error:', err);
        throw err;
      }
    },
    retry: false,
    staleTime: Infinity
  });

  const [selectedArticle, setSelectedArticle] = useState<SelectArticle | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Effect to handle direct navigation to article
  useEffect(() => {
    if (articleId && articlesResponse?.data) {
      const article = articlesResponse.data.find(a => a.id === articleId);
      if (article) {
        setSelectedArticle(article);
        setDialogOpen(true);
      }
    }
  }, [articleId, articlesResponse?.data]);

  const handleArticleSelect = (article: SelectArticle) => {
    setSelectedArticle(article);
    setDialogOpen(true);
    // Update URL without reloading the page
    setLocation(`/dashboard/my-articles/${article.id}`, { replace: true });
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Remove article ID from URL when dialog is closed
      setLocation('/dashboard/my-articles', { replace: true });
    }
  };

  const isLoading = isLoadingArticles || isLoadingProjects;
  const error = articlesError || projectsError;

  // Guard against undefined data
  const articles = articlesResponse?.data ?? [];
  const projects = projectsResponse?.data ?? [];

  const individualArticles = articles.filter((article: SelectArticle) => !article.projectId);
  const projectArticles = new Map<number, SelectArticle[]>();

  // Group articles by project
  articles.forEach((article: SelectArticle) => {
    if (article.projectId) {
      const projectArticleList = projectArticles.get(article.projectId) || [];
      projectArticleList.push(article);
      projectArticles.set(article.projectId, projectArticleList);
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My Articles</h1>
          <p className="text-muted-foreground">
            {articles.length} articles generated
          </p>
        </div>

        {isLoading ? (
          <ArticlesSkeleton />
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <p className="text-destructive font-medium">
                    Error loading articles
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : 'An unknown error occurred. Please try again later.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : articles.length === 0 && projects.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                No articles generated yet. Head over to the Article Writer to create your first article!
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="individual" className="space-y-6">
            <TabsList>
              <TabsTrigger value="individual">Individual Articles</TabsTrigger>
              <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="individual">
              {individualArticles.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {individualArticles.map((article: SelectArticle) => (
                    <ArticleCard 
                      key={article.id} 
                      article={article} 
                      onSelect={handleArticleSelect}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">
                      No individual articles yet. Try generating some from the Article Writer!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="projects">
              <div className="space-y-8">
                {projects.map((project: SelectProject) => {
                  const projectArticleList = projectArticles.get(project.id) || [];

                  return (
                    <Card key={project.id}>
                      <CardContent className="p-6">
                        <div className="mb-4">
                          <h2 className="text-xl font-semibold">{project.name}</h2>
                          {project.description && (
                            <p className="text-muted-foreground mt-1">{project.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-sm text-muted-foreground">
                              {projectArticleList.length} articles
                            </p>
                            <p className="text-sm text-muted-foreground">
                              •
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {project.completedKeywords} of {project.totalKeywords} keywords completed
                            </p>
                          </div>
                        </div>
                        {projectArticleList.length > 0 ? (
                          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {projectArticleList.map((article: SelectArticle) => (
                              <ArticleCard 
                                key={article.id} 
                                article={article} 
                                onSelect={handleArticleSelect}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            Articles for this project are still being generated...
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <ArticleDialog
          article={selectedArticle}
          open={dialogOpen}
          onOpenChange={handleDialogClose}
        />
      </div>
    </div>
  );
}
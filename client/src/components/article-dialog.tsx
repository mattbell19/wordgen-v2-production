import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SelectArticle } from "@db/schema";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Download, FileText, Clock, Eye, Edit3 } from "lucide-react";
import { WebflowDialog } from "./webflow-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import articleStyles from './article-dialog.module.css';

interface ArticleDialogProps {
  article: SelectArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArticleDialog({ article, open, onOpenChange }: ArticleDialogProps) {
  const [isViewMode, setIsViewMode] = useState(true);
  const [editContent, setEditContent] = useState("");
  const [showWebflowDialog, setShowWebflowDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize edit content when article changes
  useEffect(() => {
    if (article) {
      setEditContent(article.content);
      setIsViewMode(true); // Always start in view mode
    }
  }, [article]);

  const updateArticleMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!article) throw new Error("No article selected");
      
      const response = await fetch(`/api/articles/${article.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update article");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Article updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      setIsViewMode(true); // Switch back to view mode after saving
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update article",
        variant: "destructive",
      });
      console.error("Error updating article:", error);
    },
  });

  const handleSave = () => {
    if (!article || !editContent.trim()) return;
    updateArticleMutation.mutate(editContent);
  };

  const toggleMode = () => {
    if (!isViewMode) {
      // Switching from edit to view - update the content
      setEditContent(editContent);
    }
    setIsViewMode(!isViewMode);
  };

  const downloadArticle = () => {
    if (!article) return;
    
    const blob = new Blob([article.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Function to render HTML content with comprehensive styling
  const renderHTMLContent = (content: string) => {
    return (
      <div 
        className="prose prose-gray dark:prose-invert max-w-none"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          lineHeight: '1.6',
          color: 'var(--foreground)',
        }}
        dangerouslySetInnerHTML={{ 
          __html: `
            <style>
              .article-content {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                line-height: 1.6;
                color: var(--foreground);
              }
              .article-content h1, .article-content h2, .article-content h3, .article-content h4, .article-content h5, .article-content h6 {
                color: var(--foreground);
                font-weight: 600;
                margin-top: 2rem;
                margin-bottom: 1rem;
              }
              .article-content h1 { font-size: 2.5rem; }
              .article-content h2 { font-size: 2rem; }
              .article-content h3 { font-size: 1.5rem; }
              .article-content p { margin-bottom: 1rem; }
              .article-content ul, .article-content ol { margin-bottom: 1rem; padding-left: 2rem; }
              .article-content li { margin-bottom: 0.5rem; }
              .article-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
              .article-content th, .article-content td { border: 1px solid var(--border); padding: 0.75rem; text-align: left; }
              .article-content th { background-color: var(--muted); font-weight: 600; }
              .article-content .callout-box, .article-content .pro-tip, .article-content .quick-takeaway,
              .article-content .highlight-box, .article-content .info-box {
                background-color: var(--muted);
                border-left: 4px solid var(--primary);
                padding: 1rem;
                margin: 1.5rem 0;
                border-radius: 0.5rem;
              }
              .article-content .article-toc {
                background-color: var(--muted);
                border-radius: 0.5rem;
                padding: 1.5rem;
                margin: 2rem 0;
              }
              .article-content .toc-list { list-style: none; padding-left: 0; }
              .article-content .toc-item { margin-bottom: 0.5rem; }
              .article-content .toc-item a { 
                color: var(--primary); 
                text-decoration: none; 
                transition: color 0.2s;
              }
              .article-content .toc-item a:hover { 
                color: var(--primary-foreground); 
                text-decoration: underline; 
              }
              .article-content .toc-sublist { 
                margin-left: 1rem; 
                margin-top: 0.5rem; 
              }
              .article-content blockquote {
                border-left: 4px solid var(--primary);
                padding-left: 1rem;
                margin: 1.5rem 0;
                font-style: italic;
                color: var(--muted-foreground);
              }
              .article-content code {
                background-color: var(--muted);
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              }
              .article-content pre {
                background-color: var(--muted);
                padding: 1rem;
                border-radius: 0.5rem;
                overflow-x: auto;
                margin: 1rem 0;
              }
              .article-content img {
                max-width: 100%;
                height: auto;
                border-radius: 0.5rem;
                margin: 1rem 0;
              }
              .article-content a {
                color: var(--primary);
                text-decoration: underline;
                transition: color 0.2s;
              }
              .article-content a:hover {
                color: var(--primary-foreground);
              }
            </style>
            <div class="article-content">${content}</div>
          ` 
        }} 
      />
    );
  };

  if (!article) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <DialogTitle className="text-xl font-semibold text-left line-clamp-2">
                  {article.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1 text-left">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.createdAt ? new Date(article.createdAt).toLocaleDateString() : 'Unknown date'}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {Math.ceil((article.content?.length || 0) / 5)} words
                    </span>
                  </div>
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={isViewMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsViewMode(true)}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
                <Button
                  variant={!isViewMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsViewMode(false)}
                  className="flex items-center gap-1"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadArticle}
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-4">
              {isViewMode ? (
                // View Mode - Beautiful rendered HTML
                <div className="py-4">
                  {renderHTMLContent(article.content)}
                </div>
              ) : (
                // Edit Mode - Raw HTML editor
                <div className="py-4 space-y-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    Edit the HTML content directly. You can modify text, styling, and structure.
                  </div>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[400px] font-mono text-sm"
                    placeholder="Enter HTML content here..."
                    style={{
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      fontSize: '13px',
                      lineHeight: '1.5',
                    }}
                  />
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      Character count: {editContent.length}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditContent(article.content);
                          toast({
                            title: "Content Reset",
                            description: "Changes have been discarded",
                          });
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={updateArticleMutation.isPending || editContent === article.content}
                        size="sm"
                      >
                        {updateArticleMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <WebflowDialog
        open={showWebflowDialog}
        onOpenChange={setShowWebflowDialog}
        articleContent={article.content}
        articleTitle={article.title}
      />
    </>
  );
}
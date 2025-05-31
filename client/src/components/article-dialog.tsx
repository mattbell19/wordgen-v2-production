import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SelectArticle } from "@db/schema";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "./rich-text-editor";
import { Download, FileText, Clock } from "lucide-react";
import { WebflowDialog } from "./webflow-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import articleStyles from './article-dialog.module.css';

interface ArticleDialogProps {
  article: SelectArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArticleDialog({ article, open, onOpenChange }: ArticleDialogProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [webflowDialogOpen, setWebflowDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize content when dialog opens with new article
  useEffect(() => {
    if (open && article) {
      setIsLoading(true);
      setContent(article.content);
      
      // Use requestAnimationFrame for smoother loading state transitions
      const frame = requestAnimationFrame(() => {
        if (contentRef.current) {
          // Add loaded class to make content visible
          contentRef.current.classList.add('content-loaded');
          setIsLoading(false);
        }
      });
      return () => {
        cancelAnimationFrame(frame);
        if (contentRef.current) {
          contentRef.current.classList.remove('content-loaded');
        }
      };
    }
  }, [article, open]);

  // Memoize content paragraphs to prevent unnecessary re-renders
  const paragraphs = useMemo(() => {
    if (!article?.content) return [];
    // Split on double newlines to preserve paragraph structure
    return article.content.split('\n\n').filter(Boolean);
  }, [article?.content]);

  const updateArticle = useMutation({
    mutationFn: async (updatedContent: string) => {
      if (!article) throw new Error("No article selected");

      console.log('Updating article with ID:', article.id);
      
      // Make absolutely sure the article ID is a number
      const articleId = Number(article.id);
      if (isNaN(articleId)) {
        throw new Error("Invalid article ID");
      }

      // Create a direct URL to the API instead of relying on proxy
      // Make sure to use the string version of the ID
      const url = `/api/articles/${articleId}`;
      console.log('Request URL:', url);
      
      const payload = {
        content: updatedContent,
        id: articleId
      };
      
      console.log('Request payload:', payload);

      const response = await fetch(url, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      
      // Log headers in a way that works with any TypeScript target
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('Response headers:', responseHeaders);

      if (!response.ok) {
        let errorMessage = `Failed to update article (${response.status})`;
        try {
          // Check if response is JSON
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.log('Error data:', errorData);
            if (errorData?.error || errorData?.message) {
              errorMessage = errorData.error || errorData.message;
            }
          } else {
            // If response is not JSON (like HTML), use status text
            errorMessage = `Server error: ${response.statusText || response.status}`;
            console.error('Non-JSON error response received');
            
            // Try to get response text for debugging
            const text = await response.text();
            console.error('Error response text:', text.substring(0, 500));
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Success response:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast({
        title: "Success",
        description: "Article updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Article update error:', error);
      
      // Check if it's a 404 error
      if (error.message && error.message.includes('404')) {
        toast({
          title: "Error",
          description: "The article you're trying to update cannot be found. It may have been deleted or you don't have permission to edit it.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to save article",
          variant: "destructive",
        });
      }
    },
  });

  // Memoize event handlers
  const handleDownload = useCallback((format: 'txt' | 'docx') => {
    if (!article) return;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [article, content]);

  const handleSave = useCallback(() => {
    console.log('Saving article:', article?.id);
    // Make sure we have an article ID and it's a valid number
    if (!article || typeof article.id !== 'number') {
      toast({
        title: "Error",
        description: "Cannot save: Invalid article ID",
        variant: "destructive",
      });
      return;
    }
    
    // Log the article and content being saved
    console.log('Article content length:', content.length);
    console.log('Article ID:', article.id);
    
    updateArticle.mutate(content);
  }, [content, updateArticle, article, toast]);

  const handleWebflowOpen = useCallback(() => {
    setWebflowDialogOpen(true);
  }, []);

  const handleWebflowClose = useCallback((open: boolean) => {
    setWebflowDialogOpen(open);
  }, []);

  if (!article) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-background">
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <DialogTitle className="text-2xl font-sora">{article.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-3 text-sm mt-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {article.wordCount} words
            </div>
            <div className="text-muted-foreground">•</div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {article.readingTime} min read
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden">
          <ScrollArea className="h-full relative">
            <div 
              ref={contentRef}
              data-testid="article-content"
              className="py-8 px-10 min-h-[500px] article-content"
            >
              <style>{`
                /* General heading styles */
                .article-content h1, 
                .article-content [data-lexical-editor] h1,
                .article-content [data-type="heading"][data-tag="h1"] { 
                  font-size: 2.25rem !important; 
                  font-weight: 700 !important; 
                  margin-bottom: 1.5rem !important; 
                  color: #1a1a1a !important; 
                  line-height: 1.2 !important; 
                }
                
                .article-content h2, 
                .article-content [data-lexical-editor] h2,
                .article-content [data-type="heading"][data-tag="h2"] { 
                  font-size: 1.75rem !important; 
                  font-weight: 600 !important; 
                  margin-top: 2rem !important; 
                  margin-bottom: 1rem !important; 
                  color: #2a2a2a !important; 
                  line-height: 1.3 !important; 
                }
                
                .article-content h3, 
                .article-content [data-lexical-editor] h3,
                .article-content [data-type="heading"][data-tag="h3"] { 
                  font-size: 1.25rem !important; 
                  font-weight: 600 !important; 
                  margin-top: 1.5rem !important; 
                  margin-bottom: 0.75rem !important; 
                  color: #3a3a3a !important; 
                  line-height: 1.4 !important; 
                }
                
                /* Paragraph and list styles */
                .article-content p { margin-bottom: 1rem; line-height: 1.6; }
                .article-content ul, .article-content ol { margin-bottom: 1rem; padding-left: 1.5rem; }
                .article-content li { margin-bottom: 0.5rem; }
              `}</style>
              <RichTextEditor
                content={article.content}
                onChange={setContent}
              />
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-between gap-2 p-4 border-t bg-card">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload('txt')}
              disabled={isLoading}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download TXT
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload('docx')}
              disabled={isLoading}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download DOCX
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWebflowOpen}
              disabled={isLoading}
            >
              <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
                <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="currentColor"/>
              </svg>
              Publish to Webflow
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-testid="close-button"
            >
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={updateArticle.status === 'loading'}
              data-testid="save-button"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>

      <WebflowDialog
        open={webflowDialogOpen}
        onOpenChange={handleWebflowClose}
        articleData={article}
      />
    </Dialog>
  );
}
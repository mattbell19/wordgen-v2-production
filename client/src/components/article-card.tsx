import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Clock, FileText } from "lucide-react";
import type { SelectArticle } from "@db/schema";
import { formatDistanceToNow } from "date-fns";

interface ArticleCardProps {
  article: SelectArticle;
  onSelect?: (article: SelectArticle) => void;
}

export function ArticleCard({ article, onSelect }: ArticleCardProps) {
  const downloadArticle = (format: 'txt' | 'docx') => {
    const blob = new Blob([article.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(article);
    }
  };

  return (
    <Card 
      className="h-full flex flex-col hover:border-primary/50 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="flex-grow p-6">
        <div className="space-y-4">
          <h3 className="font-semibold truncate">{article.title}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDistanceToNow(new Date(article.createdAt))} ago</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{article.wordCount} words · {article.readingTime} min read</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {article.content.slice(0, 150)}...
          </p>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0 gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={(e) => {
            e.stopPropagation(); 
            downloadArticle('txt');
          }} 
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          TXT
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={(e) => {
            e.stopPropagation(); 
            downloadArticle('docx');
          }} 
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          DOCX
        </Button>
      </CardFooter>
    </Card>
  );
}
import { Button } from "@/components/ui/button";
import { ArticleResponse } from "@/lib/types";
import { Download, Loader2, Eye, Clock, FileText, Copy, Share, BarChart3, Hash, Award } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { QualityMetricsDisplay } from "./quality-metrics-display";

// Import the dedicated article CSS
import "@/styles/article.css";

// Define enhanced styles for article preview with premium typography
const articleStyles = `
  /* Base article container */
  .article-content {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  /* Main heading styles */
  .article-content h1 {
    font-size: 2.75rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: #000000;
    line-height: 1.1;
    letter-spacing: -0.025em;
    font-family: 'Sora', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* Section heading styles */
  .article-content h2 {
    font-size: 2rem;
    font-weight: 600;
    margin-top: 3rem;
    margin-bottom: 1.5rem;
    color: #000000;
    line-height: 1.25;
    letter-spacing: -0.015em;
    font-family: 'Sora', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* Subsection heading styles */
  .article-content h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 2.5rem;
    margin-bottom: 1rem;
    color: #000000;
    line-height: 1.35;
    letter-spacing: -0.01em;
    font-family: 'Sora', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* Paragraph styles - Enhanced for readability */
  .article-content p {
    margin-bottom: 1.5rem;
    line-height: 1.7;
    color: #374151;
    font-size: 1.125rem;
    font-weight: 400;
    letter-spacing: 0.01em;
  }

  /* Table of Contents styles */
  .article-content .article-toc {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin: 2rem 0;
  }

  .article-content .article-toc h2 {
    font-size: 1.5rem;
    margin-top: 0;
    margin-bottom: 1rem;
    color: #1e293b;
  }

  .article-content .article-toc ul {
    margin-bottom: 0.5rem;
  }

  .article-content .article-toc li {
    margin-bottom: 0.5rem;
  }

  .article-content .article-toc a {
    color: #3b82f6;
    text-decoration: none;
    transition: color 0.2s;
  }

  .article-content .article-toc a:hover {
    color: #2563eb;
    text-decoration: underline;
  }

  /* FAQ section styles */
  .article-content .article-faq {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin: 2rem 0;
  }

  .article-content .article-faq h2 {
    font-size: 1.5rem;
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: #1e293b;
  }

  .article-content .article-faq h3 {
    font-size: 1.25rem;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: #334155;
  }

  /* Related keywords section styles */
  .article-content .related-keywords {
    background-color: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin: 2rem 0;
  }

  .article-content .related-keywords h3 {
    font-size: 1.25rem;
    margin-top: 0;
    margin-bottom: 1rem;
    color: #0369a1;
  }

  .article-content .related-keywords ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .article-content .related-keywords li {
    background-color: #e0f2fe;
    color: #0284c7;
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  /* Image suggestion styles */
  .article-content .image-suggestion {
    background-color: #faf5ff;
    border: 1px dashed #a855f7;
    padding: 1rem;
    margin: 1.5rem 0;
    border-radius: 0.5rem;
    color: #7e22ce;
    font-style: italic;
  }

  /* References section styles */
  .article-content .references {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 2px solid #e5e7eb;
  }

  /* List styles */
  .article-content ul,
  .article-content ol {
    margin: 1.25rem 0;
    padding-left: 1.75rem;
  }

  /* Enhanced list styles */
  .article-content ul,
  .article-content ol {
    margin: 1.5rem 0;
    padding-left: 1.5rem;
  }

  .article-content ul {
    list-style-type: disc;
  }

  .article-content ol {
    list-style-type: decimal;
  }

  .article-content li {
    margin-bottom: 0.75rem;
    line-height: 1.6;
    font-size: 1.125rem;
    color: #374151;
  }

  .article-content li::marker {
    color: #6b7280;
  }

  /* Enhanced link styles */
  .article-content a {
    color: #2563eb;
    text-decoration: none;
    border-bottom: 1px solid #93c5fd;
    transition: all 0.2s ease;
    font-weight: 500;
  }

  .article-content a:hover {
    color: #1d4ed8;
    border-bottom-color: #2563eb;
    background-color: rgba(37, 99, 235, 0.05);
  }

  /* Enhanced emphasis styles */
  .article-content strong {
    font-weight: 600;
    color: #111827;
  }

  .article-content em {
    font-style: italic;
    color: #4b5563;
  }

  /* Enhanced blockquote styles */
  .article-content blockquote {
    border-left: 4px solid #3b82f6;
    padding-left: 1.5rem;
    margin: 2rem 0;
    color: #4b5563;
    font-style: italic;
    font-size: 1.125rem;
    line-height: 1.6;
    background-color: rgba(59, 130, 246, 0.05);
    padding: 1.5rem;
    border-radius: 0.5rem;
  }

  /* Responsive typography */
  @media (max-width: 768px) {
    .article-content h1 {
      font-size: 2.25rem;
      line-height: 1.2;
    }

    .article-content h2 {
      font-size: 1.75rem;
      margin-top: 2rem;
    }

    .article-content h3 {
      font-size: 1.375rem;
      margin-top: 1.5rem;
    }

    .article-content p,
    .article-content li {
      font-size: 1rem;
      line-height: 1.65;
    }
  }

  @media (max-width: 480px) {
    .article-content h1 {
      font-size: 2rem;
    }

    .article-content h2 {
      font-size: 1.5rem;
    }

    .article-content h3 {
      font-size: 1.25rem;
    }
  }
`;

interface ArticlePreviewProps {
  article: ArticleResponse | null;
  isLoading?: boolean;
}

export function ArticlePreview({ article, isLoading = false }: ArticlePreviewProps) {
  const downloadArticle = (format: 'txt' | 'docx') => {
    if (!article) return;

    const blob = new Blob([article.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `article.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Enhanced function to convert markdown to HTML with better handling of special sections
  const renderContent = (content: string) => {
    // Clean the content first - remove any stray quotes or malformed JSON artifacts
    let cleanedContent = content;

    // Remove any leading/trailing quotes that might be from JSON parsing issues
    cleanedContent = cleanedContent.replace(/^["']|["']$/g, '');

    // Remove any stray "html or 'html at the beginning
    cleanedContent = cleanedContent.replace(/^["']?html["']?\s*/i, '');

    // Remove any other common JSON artifacts
    cleanedContent = cleanedContent.replace(/^```html\s*/i, '');
    cleanedContent = cleanedContent.replace(/\s*```$/i, '');

    // Remove any escaped quotes that might be causing issues
    cleanedContent = cleanedContent.replace(/\\"/g, '"');
    cleanedContent = cleanedContent.replace(/\\'/g, "'");

    // Remove any leading whitespace or newlines
    cleanedContent = cleanedContent.trim();

    // First, preserve HTML sections like Table of Contents, FAQ, and Related Keywords
    const preservedSections: {[key: string]: string} = {};
    let processedContent = cleanedContent;

    // Preserve HTML sections by replacing them with placeholders
    const htmlSectionRegex = /(<div class="[^"]*">|<section class="[^"]*">)[\s\S]*?(<\/div>|<\/section>)/g;
    let match;
    let placeholderIndex = 0;

    while ((match = htmlSectionRegex.exec(content)) !== null) {
      const placeholder = `__HTML_SECTION_${placeholderIndex}__`;
      preservedSections[placeholder] = match[0];
      processedContent = processedContent.replace(match[0], placeholder);
      placeholderIndex++;
    }

    // Convert markdown headings to HTML
    let htmlContent = processedContent
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      // Convert markdown links to HTML with target="_blank" for external links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
        const isExternal = url.startsWith('http') || url.startsWith('www');
        return `<a href="${url}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
      })
      // Convert newlines to paragraphs, but skip lines that are just placeholders
      .split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)
      .map(paragraph => {
        // If paragraph is just a placeholder, return it as is
        if (paragraph.match(/^__HTML_SECTION_\d+__$/)) {
          return paragraph;
        }
        return `<p>${paragraph}</p>`;
      })
      .join('\n');

    // Restore preserved HTML sections
    Object.keys(preservedSections).forEach(placeholder => {
      htmlContent = htmlContent.replace(placeholder, preservedSections[placeholder]);
    });

    return (
      <div className="prose prose-lg max-w-none">
        <style>{articleStyles}</style>
        <div
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          className="article-content"
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Preview</h2>
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-16" />
          </div>
        </div>
        <Skeleton className="h-4 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[95%]" />
        </div>
      </div>
    );
  }

  if (!article && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Eye className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Article Generated</h3>
        <p className="text-gray-500">Generate an article to see the preview here</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
        <p className="text-gray-600">Generating your article...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              {article?.readingTime || 8} min read
            </div>
            <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <FileText className="h-4 w-4 mr-1" />
              {article?.wordCount || 1750} words
            </div>
            {article?.qualityMetrics && (
              <div className="flex items-center text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                <Award className="h-4 w-4 mr-1" />
                Quality: {Math.round(article.qualityMetrics.overall_score)}/100
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadArticle('txt')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              SEO Analysis
            </Button>
          </div>
        </div>
      </div>

      {/* Quality Metrics */}
      {article?.qualityMetrics && (
        <div className="px-6 mb-6">
          <div className="max-w-3xl mx-auto">
            <QualityMetricsDisplay
              metrics={article.qualityMetrics}
              expertPersona={article.expertPersona}
              industry={article.industry}
            />
          </div>
        </div>
      )}

      {/* Article Content */}
      <div className="px-6">
        <div className="max-w-3xl mx-auto">
          {article && renderContent(article.content)}
        </div>
      </div>
    </div>
  );
}
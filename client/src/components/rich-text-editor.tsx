import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import '@/styles/rich-text-editor.css';
import {
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  EditorState,
  LexicalNode,
  ElementNode,
  TextNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  LexicalEditor,
  RangeSelection,
  $isTextNode,
} from 'lexical';
import { HeadingNode, $createHeadingNode } from '@lexical/rich-text';
import { useEffect, useCallback } from 'react';
import { ToolbarPlugin } from './editor/toolbar-plugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import {
  ListItemNode,
  ListNode,
  $createListNode,
  $createListItemNode,
  ListType,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { QuoteNode, $createQuoteNode } from '@lexical/rich-text';
import debounce from 'lodash/debounce';
import { Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon, Heading1 as Heading1Icon, Heading2 as Heading2Icon, Heading3 as Heading3Icon, List as ListIcon, ListOrdered as ListOrderedIcon } from 'lucide-react';

const theme = {
  root: 'bg-background text-foreground min-h-[500px] outline-none',
  paragraph: 'mb-4 text-foreground leading-relaxed',
  heading: {
    h1: 'text-4xl font-bold mb-6 text-foreground font-sora',
    h2: 'text-3xl font-semibold mt-8 mb-4 text-foreground font-sora',
    h3: 'text-2xl font-semibold mt-6 mb-3 text-foreground font-sora',
  },
  list: {
    ul: 'list-disc ml-6 mb-4 space-y-2',
    ol: 'list-decimal ml-6 mb-4 space-y-2',
    listitem: 'mb-2 text-foreground',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
  },
  link: 'text-primary hover:underline',
  quote: 'border-l-4 border-primary/20 pl-4 italic my-4',
};

const ContentInitializer = ({ content }: { content: string }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!content) return;

    editor.update(() => {
      try {
        const root = $getRoot();

        // Clear existing content first
        root.clear();

        // Use the same content processing logic as the article preview
        const processedContent = processContentLikePreview(content);

        // Parse the processed HTML content
        const parser = new DOMParser();
        const dom = parser.parseFromString(processedContent, 'text/html');

        // Process nodes recursively to maintain structure
        const processNode = (node: Node, parent: ElementNode) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
              const textNode = $createTextNode(text);
              parent.append(textNode);
            }
            return;
          }

          if (node.nodeType !== Node.ELEMENT_NODE) return;

          const element = node as HTMLElement;
          let lexicalNode: ElementNode | null = null;

          // Create appropriate Lexical node based on HTML element
          switch (element.tagName.toLowerCase()) {
            case 'h1':
            case 'h2':
            case 'h3':
              lexicalNode = $createHeadingNode(element.tagName.toLowerCase() as 'h1' | 'h2' | 'h3');
              break;
            case 'ul':
              lexicalNode = $createListNode('bullet');
              break;
            case 'ol':
              lexicalNode = $createListNode('number');
              break;
            case 'li':
              lexicalNode = $createListItemNode();
              break;
            case 'blockquote':
              lexicalNode = $createQuoteNode();
              break;
            case 'div':
            case 'section': {
              // For special sections (FAQ, TOC, etc.), create a quote node to preserve them
              const className = element.className;
              if (className && (className.includes('faq') || className.includes('toc') || className.includes('takeaway') || className.includes('highlight'))) {
                lexicalNode = $createQuoteNode();
              } else {
                lexicalNode = $createParagraphNode();
              }
              break;
            }
            case 'p':
            default:
              lexicalNode = $createParagraphNode();
          }

          if (lexicalNode) {
            parent.append(lexicalNode);

            // Handle text formatting within elements
            if (element.children.length === 0) {
              // If no child elements, process text content with formatting
              const textContent = element.textContent || '';
              if (textContent.trim()) {
                const textNode = $createTextNode(textContent.trim());
                lexicalNode.append(textNode);
              }
            } else {
              // Process child nodes
              Array.from(element.childNodes).forEach(child => {
                processNode(child, lexicalNode!);
              });
            }
          }
        };

        // Start processing from body
        Array.from(dom.body.childNodes).forEach(node => {
          processNode(node, root);
        });

        // Ensure there's always at least one paragraph if no content was added
        if (root.getChildren().length === 0) {
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(''));
          root.append(paragraph);
        }
      } catch (error) {
        console.error('Error initializing editor content:', error);
        // Fallback: create a simple paragraph with the content as text
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(content || ''));
        root.append(paragraph);
      }
    });
  }, [editor, content]);

  return null;
};

// Helper function to process content the same way as article preview
const processContentLikePreview = (content: string): string => {
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

  // If content already contains HTML, return it as is
  if (cleanedContent.includes('<div') || cleanedContent.includes('<section') || cleanedContent.includes('<h1') || cleanedContent.includes('<h2')) {
    return cleanedContent;
  }

  // Convert markdown headings to HTML
  let htmlContent = cleanedContent
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    // Convert markdown links to HTML
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      const isExternal = url.startsWith('http') || url.startsWith('www');
      return `<a href="${url}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
    })
    // Convert newlines to paragraphs
    .split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .map(paragraph => {
      // Don't wrap headings in paragraphs
      if (paragraph.startsWith('<h1') || paragraph.startsWith('<h2') || paragraph.startsWith('<h3')) {
        return paragraph;
      }
      return `<p>${paragraph}</p>`;
    })
    .join('\n');

  return htmlContent;
};

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function ToolbarButton({ 
  onClick, 
  'aria-label': ariaLabel,
  children 
}: { 
  onClick: () => void;
  'aria-label': string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground rounded-md h-8 w-8 p-0"
    >
      {children}
    </button>
  );
}

// Remove the duplicate EditorContent component as it's not being used

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const initialConfig = {
    namespace: 'MyEditor',
    theme,
    onError: (error: Error) => {
      console.error('Lexical Editor error:', error);
      // Don't throw the error, just log it to prevent crashes
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      LinkNode,
      QuoteNode,
    ],
    editorState: null, // Start with empty state
  };

  // Create debounced onChange function for this component
  const debouncedOnChange = useCallback(
    debounce((editorState: EditorState) => {
      try {
        editorState.read(() => {
          const root = $getRoot();
          let html = '';

          const serializeNode = (node: LexicalNode): string => {
            try {
              if (node instanceof TextNode) {
                return formatText(node.getTextContent(), node);
              }

              if (node instanceof HeadingNode) {
                const tag = node.getTag();
                const children = node.getChildren().map(child => serializeNode(child)).join('');
                return `<${tag}>${children}</${tag}>\n`;
              }

              if (node instanceof ListNode) {
                const listType = node.getListType();
                const tag = listType === 'bullet' ? 'ul' : 'ol';
                const children = node.getChildren().map(child => serializeNode(child)).join('');
                return `<${tag}>\n${children}</${tag}>\n`;
              }

              if (node instanceof ListItemNode) {
                const children = node.getChildren().map(child => serializeNode(child)).join('');
                return `  <li>${children}</li>\n`;
              }

              if (node instanceof QuoteNode) {
                const children = node.getChildren().map(child => serializeNode(child)).join('');
                const textContent = children.trim();

                // Try to preserve special section formatting
                if (textContent.toLowerCase().includes('faq') || textContent.toLowerCase().includes('frequently asked')) {
                  return `<div class="faq-section">${children}</div>\n`;
                } else if (textContent.toLowerCase().includes('table of contents') || textContent.toLowerCase().includes('toc')) {
                  return `<div class="toc-section">${children}</div>\n`;
                } else if (textContent.toLowerCase().includes('takeaway') || textContent.toLowerCase().includes('key point')) {
                  return `<div class="quick-takeaway">${children}</div>\n`;
                } else {
                  return `<blockquote>${children}</blockquote>\n`;
                }
              }

              if (node instanceof ElementNode) {
                const children = node.getChildren().map(child => serializeNode(child)).join('');
                if (children.trim()) {
                  return `<p>${children}</p>\n`;
                }
                return '';
              }

              return '';
            } catch (error) {
              console.warn('Error serializing node:', error);
              return node.getTextContent() || '';
            }
          };

          const formatText = (text: string, node: LexicalNode): string => {
            try {
              let formattedText = text;

              if (node instanceof TextNode) {
                const format = node.getFormat();
                if (format & 1) { // FORMAT_BOLD = 1
                  formattedText = `<strong>${formattedText}</strong>`;
                }
                if (format & 2) { // FORMAT_ITALIC = 2
                  formattedText = `<em>${formattedText}</em>`;
                }
                if (format & 4) { // FORMAT_UNDERLINE = 4
                  formattedText = `<u>${formattedText}</u>`;
                }
              }

              return formattedText;
            } catch (error) {
              console.warn('Error formatting text:', error);
              return text;
            }
          };

          try {
            root.getChildren().forEach(node => {
              html += serializeNode(node);
            });

            // Clean up extra newlines
            html = html.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

            onChange(html);
          } catch (error) {
            console.error('Error processing editor content:', error);
            // Fallback to plain text
            onChange(root.getTextContent());
          }
        });
      } catch (error) {
        console.error('Error in onChange handler:', error);
      }
    }, 300),
    [onChange]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="bg-background text-foreground h-full flex flex-col">
        {/* Apply the same article styles as the preview */}
        <style>{`
          /* Base article container */
          .rich-text-content {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }

          /* Main heading styles */
          .rich-text-content h1 {
            font-size: 2.75rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
            color: #000000;
            line-height: 1.1;
            letter-spacing: -0.025em;
            font-family: 'Sora', -apple-system, BlinkMacSystemFont, sans-serif;
          }

          /* Section heading styles */
          .rich-text-content h2 {
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
          .rich-text-content h3 {
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
          .rich-text-content p {
            margin-bottom: 1.5rem;
            line-height: 1.7;
            color: #374151;
            font-size: 1.125rem;
            font-weight: 400;
            letter-spacing: 0.01em;
          }

          /* List styles */
          .rich-text-content ul,
          .rich-text-content ol {
            margin: 1.5rem 0;
            padding-left: 1.5rem;
          }

          .rich-text-content ul {
            list-style-type: disc;
          }

          .rich-text-content ol {
            list-style-type: decimal;
          }

          .rich-text-content li {
            margin-bottom: 0.75rem;
            line-height: 1.6;
            font-size: 1.125rem;
            color: #374151;
          }

          .rich-text-content li::marker {
            color: #6b7280;
          }

          /* Enhanced link styles */
          .rich-text-content a {
            color: #2563eb;
            text-decoration: none;
            border-bottom: 1px solid #93c5fd;
            transition: all 0.2s ease;
            font-weight: 500;
          }

          .rich-text-content a:hover {
            color: #1d4ed8;
            border-bottom-color: #2563eb;
            background-color: rgba(37, 99, 235, 0.05);
          }

          /* Enhanced emphasis styles */
          .rich-text-content strong {
            font-weight: 600;
            color: #111827;
          }

          .rich-text-content em {
            font-style: italic;
            color: #4b5563;
          }

          /* Enhanced blockquote styles */
          .rich-text-content blockquote {
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

          /* Special section styles */
          .rich-text-content .faq-section,
          .rich-text-content .toc-section,
          .rich-text-content .quick-takeaway {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 0.5rem;
            padding: 1.5rem;
            margin: 2rem 0;
          }

          /* Responsive typography */
          @media (max-width: 768px) {
            .rich-text-content h1 {
              font-size: 2.25rem;
              line-height: 1.2;
            }

            .rich-text-content h2 {
              font-size: 1.75rem;
              margin-top: 2rem;
            }

            .rich-text-content h3 {
              font-size: 1.375rem;
              margin-top: 1.5rem;
            }

            .rich-text-content p,
            .rich-text-content li {
              font-size: 1rem;
              line-height: 1.65;
            }
          }
        `}</style>

        <div className="flex-shrink-0 border-b sticky top-0 z-10 bg-background shadow-sm">
          <ToolbarPlugin />
        </div>
        <div className="flex-grow overflow-auto relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="outline-none prose prose-lg max-w-none p-4 min-h-[400px] h-full text-foreground bg-background rich-text-content"
                style={{ resize: 'none' }}
              />
            }
            placeholder={
              <div className="absolute top-[15px] left-[15px] text-muted-foreground pointer-events-none">
                Start writing your article...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <ContentInitializer content={content} />
        <OnChangePlugin onChange={debouncedOnChange} />
      </div>
    </LexicalComposer>
  );
}
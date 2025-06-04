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

        // Handle both HTML and markdown-style content
        if (content.includes('<')) {
          // HTML content - use a simpler approach
          const parser = new DOMParser();
          const dom = parser.parseFromString(content, 'text/html');

          // Convert HTML to plain text and create paragraphs
          const textContent = dom.body.textContent || dom.body.innerText || '';
          const lines = textContent.split('\n').filter(line => line.trim());

          if (lines.length === 0) {
            // If no content, create empty paragraph
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(''));
            root.append(paragraph);
          } else {
            // Create paragraphs for each line
            lines.forEach(line => {
              const trimmedLine = line.trim();
              if (trimmedLine) {
                const paragraph = $createParagraphNode();
                paragraph.append($createTextNode(trimmedLine));
                root.append(paragraph);
              }
            });
          }
        } else {
          // Handle markdown-style content
          const lines = content.split('\n').filter(line => line.trim());

          if (lines.length === 0) {
            // If no content, create empty paragraph
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(''));
            root.append(paragraph);
          } else {
            lines.forEach(line => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return;

              // Check for headings
              const h1Match = trimmedLine.match(/^#\s+(.+)$/);
              if (h1Match) {
                const heading = $createHeadingNode('h1');
                heading.append($createTextNode(h1Match[1].trim()));
                root.append(heading);
                return;
              }

              const h2Match = trimmedLine.match(/^##\s+(.+)$/);
              if (h2Match) {
                const heading = $createHeadingNode('h2');
                heading.append($createTextNode(h2Match[1].trim()));
                root.append(heading);
                return;
              }

              const h3Match = trimmedLine.match(/^###\s+(.+)$/);
              if (h3Match) {
                const heading = $createHeadingNode('h3');
                heading.append($createTextNode(h3Match[1].trim()));
                root.append(heading);
                return;
              }

              // Default to paragraph for regular content
              const paragraph = $createParagraphNode();
              paragraph.append($createTextNode(trimmedLine));
              root.append(paragraph);
            });
          }
        }

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
                return `<${tag}>${children}</${tag}>`;
              }

              if (node instanceof ListNode) {
                const listType = node.getListType();
                const tag = listType === 'bullet' ? 'ul' : 'ol';
                const children = node.getChildren().map(child => serializeNode(child)).join('');
                return `<${tag}>${children}</${tag}>`;
              }

              if (node instanceof ListItemNode) {
                const children = node.getChildren().map(child => serializeNode(child)).join('');
                return `<li>${children}</li>`;
              }

              if (node instanceof QuoteNode) {
                const children = node.getChildren().map(child => serializeNode(child)).join('');
                return `<blockquote>${children}</blockquote>`;
              }

              if (node instanceof ElementNode) {
                const children = node.getChildren().map(child => serializeNode(child)).join('');
                return `<p>${children}</p>`;
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
        <div className="flex-shrink-0 border-b sticky top-0 z-10 bg-background shadow-sm">
          <ToolbarPlugin />
        </div>
        <div className="flex-grow overflow-auto relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="outline-none prose prose-sm max-w-none p-4 min-h-[400px] h-full text-foreground bg-background rich-text-content"
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
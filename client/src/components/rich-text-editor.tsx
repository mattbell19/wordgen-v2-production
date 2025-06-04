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
      const root = $getRoot();
      
      // Handle both HTML and markdown-style content
      if (content.includes('<')) {
        // HTML content
        const parser = new DOMParser();
        const dom = parser.parseFromString(content, 'text/html');
        
        // Clear existing content
        root.clear();

        // Process nodes recursively
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
            case 'div': {
              const className = element.className;
              if (className === 'quick-takeaway' || className === 'pro-tip' || className === 'stat-highlight') {
                lexicalNode = $createQuoteNode();
              } else {
                lexicalNode = $createParagraphNode();
              }
              break;
            }
            case 'strong':
            case 'b': {
              const textContent = element.textContent;
              if (textContent) {
                const textNode = $createTextNode(textContent);
                textNode.toggleFormat('bold');
                parent.append(textNode);
              }
              return;
            }
            case 'em':
            case 'i': {
              const textContent = element.textContent;
              if (textContent) {
                const textNode = $createTextNode(textContent);
                textNode.toggleFormat('italic');
                parent.append(textNode);
              }
              return;
            }
            case 'u': {
              const textContent = element.textContent;
              if (textContent) {
                const textNode = $createTextNode(textContent);
                textNode.toggleFormat('underline');
                parent.append(textNode);
              }
              return;
            }
            case 'p':
            default:
              lexicalNode = $createParagraphNode();
          }

          if (lexicalNode) {
            parent.append(lexicalNode);
            // Process child nodes
            Array.from(element.childNodes).forEach(child => {
              processNode(child, lexicalNode!);
            });
          }
        };

        // Start processing from body
        Array.from(dom.body.childNodes).forEach(node => {
          processNode(node, root);
        });
      } else {
        // Handle markdown-style content
        const lines = content.split('\n');
        
        lines.forEach(line => {
          // Improved heading detection with more flexible regex patterns
          const h1Match = line.match(/^\s*#\s+(.+)$/m);
          if (h1Match) {
            const heading = $createHeadingNode('h1');
            heading.append($createTextNode(h1Match[1].trim()));
            root.append(heading);
            return;
          }
          
          const h2Match = line.match(/^\s*##\s+(.+)$/m);
          if (h2Match) {
            const heading = $createHeadingNode('h2');
            heading.append($createTextNode(h2Match[1].trim()));
            root.append(heading);
            return;
          }
          
          const h3Match = line.match(/^\s*###\s+(.+)$/m);
          if (h3Match) {
            const heading = $createHeadingNode('h3');
            heading.append($createTextNode(h3Match[1].trim()));
            root.append(heading);
            return;
          }

          // Default to paragraph for non-heading content
          if (line.trim()) {
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(line.trim()));
            root.append(paragraph);
          }
        });
      }

      // Ensure there's always at least one paragraph if no content
      if (root.getChildren().length === 0) {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('');
        paragraph.append(text);
        root.append(paragraph);
      }

      // Select the first text node if it exists
      const firstNode = root.getFirstDescendant();
      if (firstNode && $isTextNode(firstNode)) {
        firstNode.select();
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
      console.error('Editor error:', error);
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      LinkNode,
      QuoteNode,
    ],
  };

  // Create debounced onChange function for this component
  const debouncedOnChange = useCallback(
    debounce((editorState: EditorState) => {
      editorState.read(() => {
        const root = $getRoot();
        let html = '';

        const serializeNode = (node: LexicalNode): string => {
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
        };

        const formatText = (text: string, node: LexicalNode): string => {
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
        };

        root.getChildren().forEach(node => {
          html += serializeNode(node);
        });

        onChange(html);
      });
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
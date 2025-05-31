import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RichTextEditor } from '../rich-text-editor';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { HeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const initialConfig = {
    namespace: 'TestEditor',
    theme: {
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
    },
    nodes: [HeadingNode, ListNode, ListItemNode, LinkNode],
    onError: (error: Error) => {
      console.error('Editor error:', error);
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      {children}
    </LexicalComposer>
  );
};

describe('RichTextEditor', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with initial content', async () => {
    const initialContent = '<h1>Test Title</h1><p>Test content</p>';
    await act(async () => {
      render(
        <TestWrapper>
          <RichTextEditor content={initialContent} onChange={mockOnChange} />
        </TestWrapper>
      );
    });

    const editor = screen.getByTestId('editor-content');
    expect(editor).toBeInTheDocument();
    await waitFor(() => {
      expect(editor).toHaveTextContent('Test Title');
      expect(editor).toHaveTextContent('Test content');
    });
  });

  it('renders toolbar with accessible buttons', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <RichTextEditor content="" onChange={mockOnChange} />
        </TestWrapper>
      );
    });

    // Check for common toolbar buttons
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Underline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Heading 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bullet List' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Numbered List' })).toBeInTheDocument();
  });

  it('handles empty content', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <RichTextEditor content="" onChange={mockOnChange} />
        </TestWrapper>
      );
    });
    
    const editor = screen.getByTestId('editor-content');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveTextContent('');
  });

  it('preserves HTML formatting when initializing content', async () => {
    const complexContent = `
      <h1>Main Title</h1>
      <h2>Subtitle</h2>
      <ul>
        <li>List item 1</li>
        <li>List item 2</li>
      </ul>
    `;
    await act(async () => {
      render(
        <TestWrapper>
          <RichTextEditor content={complexContent} onChange={mockOnChange} />
        </TestWrapper>
      );
    });

    const editor = screen.getByTestId('editor-content');
    await waitFor(() => {
      expect(editor).toHaveTextContent('Main Title');
      expect(editor).toHaveTextContent('Subtitle');
      expect(editor).toHaveTextContent('List item 1');
      expect(editor).toHaveTextContent('List item 2');
    });
  });

  it('converts content to HTML on change', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <RichTextEditor content="" onChange={mockOnChange} />
        </TestWrapper>
      );
    });

    const editor = screen.getByTestId('editor-content');
    await act(async () => {
      await userEvent.type(editor, 'New content');
    });

    // Wait for debounced onChange to be called
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('New content'));
    }, { timeout: 400 }); // Slightly longer than debounce delay
  });

  it('maintains proper HTML structure for special blocks', async () => {
    const content = `
      <div class="quick-takeaway">Key takeaway</div>
      <div class="pro-tip">Pro tip content</div>
      <div class="stat-highlight">Important statistic</div>
    `;
    await act(async () => {
      render(
        <TestWrapper>
          <RichTextEditor content={content} onChange={mockOnChange} />
        </TestWrapper>
      );
    });

    const editor = screen.getByTestId('editor-content');
    await waitFor(() => {
      expect(editor).toHaveTextContent('Key takeaway');
      expect(editor).toHaveTextContent('Pro tip content');
      expect(editor).toHaveTextContent('Important statistic');
    });
  });

  it('handles list formatting correctly', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <RichTextEditor content="" onChange={mockOnChange} />
        </TestWrapper>
      );
    });

    const editor = screen.getByTestId('editor-content');
    await act(async () => {
      await userEvent.type(editor, 'List item');
      const bulletListButton = screen.getByRole('button', { name: 'Bullet List' });
      await userEvent.click(bulletListButton);
    });

    // Wait for debounced onChange to be called
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(expect.stringMatching(/<ul>[\s\S]*<li>[\s\S]*<\/li>[\s\S]*<\/ul>/));
    }, { timeout: 400 });
  });

  it('handles heading formatting correctly', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <RichTextEditor content="" onChange={mockOnChange} />
        </TestWrapper>
      );
    });

    const editor = screen.getByTestId('editor-content');
    await act(async () => {
      await userEvent.type(editor, 'Heading Text');
      const h1Button = screen.getByRole('button', { name: 'Heading 1' });
      await userEvent.click(h1Button);
    });

    // Wait for debounced onChange to be called
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('<h1>Heading Text</h1>'));
    }, { timeout: 400 });
  });
}); 
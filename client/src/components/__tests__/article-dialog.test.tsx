import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArticleDialog } from '../article-dialog';
import { useToast } from '@/hooks/use-toast';
import { WebflowDialog } from '../webflow-dialog';
import type { ArticleSettings } from '@/lib/types';

// Mock the useToast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock the WebflowDialog component
jest.mock('../webflow-dialog', () => ({
  WebflowDialog: jest.fn(),
}));

const mockArticle = {
  id: 1,
  title: 'Test Article',
  content: '<h1>Test Heading</h1><p>Test content</p><ul><li>List item 1</li></ul>',
  wordCount: 100,
  readingTime: 5,
  status: 'draft',
  primaryKeyword: 'test',
  userId: 1,
  projectId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  settings: {
    keyword: 'test',
    tone: 'professional',
    wordCount: 100
  } as ArticleSettings
};

const mockProps = {
  article: mockArticle,
  open: true,
  onOpenChange: jest.fn(),
};

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('ArticleDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (WebflowDialog as jest.Mock).mockImplementation(() => null);
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as jest.Mock;

    // Mock URL.createObjectURL and revokeObjectURL
    const mockObjectURL = 'blob:test';
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: jest.fn(() => mockObjectURL),
        revokeObjectURL: jest.fn(),
      },
      writable: true,
    });
  });

  it('renders article content correctly', () => {
    // Mock the RichTextEditor component since it's complex to test
    jest.mock('../rich-text-editor', () => ({
      RichTextEditor: jest.fn(({ content }) => (
        <div data-testid="rich-text-editor" dangerouslySetInnerHTML={{ __html: content }} />
      )),
    }));

    render(<ArticleDialog {...mockProps} />, { wrapper });

    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText(/100 words/)).toBeInTheDocument();
    expect(screen.getByText(/5 min read/)).toBeInTheDocument();
  });

  it('handles download functionality', async () => {
    // Mock createObjectURL and createElement.click
    const mockClickFn = jest.fn();
    const mockAnchor = { click: mockClickFn, href: '', download: '' };
    document.createElement = jest.fn().mockImplementation((tag) => {
      if (tag === 'a') return mockAnchor;
      return {};
    });

    render(<ArticleDialog {...mockProps} />, { wrapper });
    
    const downloadTxtBtn = screen.getByRole('button', { name: /download txt/i });
    await userEvent.click(downloadTxtBtn);

    expect(mockClickFn).toHaveBeenCalled();
    expect(mockAnchor.download).toContain('.txt');
  });

  it('handles save functionality', async () => {
    render(<ArticleDialog {...mockProps} />, { wrapper });
    
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(saveBtn);

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/articles/${mockArticle.id}`,
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }),
        credentials: 'include',
        body: JSON.stringify({ 
          content: mockArticle.content,
          id: mockArticle.id
        }),
      })
    );
  });

  it('handles close functionality', async () => {
    render(<ArticleDialog {...mockProps} />, { wrapper });
    
    const closeBtn = screen.getByTestId('close-button');
    await userEvent.click(closeBtn);

    expect(mockProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles Webflow dialog', async () => {
    (WebflowDialog as jest.Mock).mockImplementation(() => (
      <div data-testid="webflow-dialog">Webflow Dialog</div>
    ));

    render(<ArticleDialog {...mockProps} />, { wrapper });
    
    const webflowBtn = screen.getByRole('button', { name: /webflow/i });
    await userEvent.click(webflowBtn);

    await waitFor(() => {
      expect(screen.getByTestId('webflow-dialog')).toBeInTheDocument();
    });
  });

  it('applies proper styling to content', () => {
    render(<ArticleDialog {...mockProps} />, { wrapper });
    
    const content = screen.getByTestId('article-content');
    expect(content).toHaveClass('py-8', 'px-10', 'min-h-[500px]');
  });

  it('handles loading state correctly', async () => {
    global.fetch = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100))) as jest.Mock;

    render(<ArticleDialog {...mockProps} />, { wrapper });

    const saveBtn = screen.getByTestId('save-button');
    await userEvent.click(saveBtn);

    expect(saveBtn).toBeDisabled();
    expect(screen.getByRole('button', { name: /download txt/i })).not.toBeDisabled();
    expect(screen.getByTestId('close-button')).not.toBeDisabled();
  });

  it('handles error state in save functionality', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Failed to save'))
    ) as jest.Mock;

    render(<ArticleDialog {...mockProps} />, { wrapper });
    
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        description: 'Failed to save',
        variant: 'destructive',
      }));
    });
  });

  it('handles 404 error during save', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve('<html><body>Not Found</body></html>')
      })
    ) as jest.Mock;

    render(<ArticleDialog {...mockProps} />, { wrapper });
    
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        description: expect.stringMatching(/404|not found/i),
        variant: 'destructive',
      }));
    });
  });

  it('handles non-JSON error response during save', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve('<html><body>Server Error</body></html>')
      })
    ) as jest.Mock;

    render(<ArticleDialog {...mockProps} />, { wrapper });
    
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Server error: Server Error',
        variant: 'destructive',
      });
    });
  });

  it('handles JSON error response during save', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ error: 'Invalid data' })
      })
    ) as jest.Mock;

    render(<ArticleDialog {...mockProps} />, { wrapper });
    
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Invalid data',
        variant: 'destructive',
      });
    });
  });
});

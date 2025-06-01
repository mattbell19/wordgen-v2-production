import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArticlePreview } from '../article-preview';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('ArticlePreview', () => {
  const mockArticle = {
    content: `
      <h1>Test Article Title</h1>
      <p>This is a test article with some content.</p>
      <h2>Section 1</h2>
      <p>More content here.</p>
      <ul>
        <li>List item 1</li>
        <li>List item 2</li>
      </ul>
    `,
    wordCount: 150,
    readingTime: 1,
    settings: {
      keyword: 'test keyword',
      wordCount: 1500,
      tone: 'professional',
      callToAction: 'Contact us today!',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.mockClear();
  });

  it('should render loading state when isLoading is true', () => {
    render(<ArticlePreview article={null} isLoading={true} />);

    expect(screen.getByText(/generating your article/i)).toBeInTheDocument();
    expect(screen.getByText(/this may take a few moments/i)).toBeInTheDocument();
  });

  it('should render empty state when no article is provided', () => {
    render(<ArticlePreview article={null} isLoading={false} />);

    expect(screen.getByText(/no article to preview/i)).toBeInTheDocument();
    expect(screen.getByText(/generate an article to see the preview/i)).toBeInTheDocument();
  });

  it('should render article content when article is provided', () => {
    render(<ArticlePreview article={mockArticle} isLoading={false} />);

    // Check if article content is rendered
    expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    expect(screen.getByText('This is a test article with some content.')).toBeInTheDocument();
    expect(screen.getByText('Section 1')).toBeInTheDocument();
    expect(screen.getByText('List item 1')).toBeInTheDocument();
    expect(screen.getByText('List item 2')).toBeInTheDocument();
  });

  it('should display article metadata correctly', () => {
    render(<ArticlePreview article={mockArticle} isLoading={false} />);

    // Check if metadata is displayed
    expect(screen.getByText('150 words')).toBeInTheDocument();
    expect(screen.getByText('1 min read')).toBeInTheDocument();
  });

  it('should render action buttons when article is provided', () => {
    render(<ArticlePreview article={mockArticle} isLoading={false} />);

    // Check if action buttons are rendered
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /seo analysis/i })).toBeInTheDocument();
  });

  it('should copy article content to clipboard when copy button is clicked', async () => {
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    render(<ArticlePreview article={mockArticle} isLoading={false} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    await userEvent.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith(mockArticle.content);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Copied!',
      description: 'Article content copied to clipboard.',
    });
  });

  it('should handle copy error gracefully', async () => {
    const mockWriteText = jest.fn().mockRejectedValue(new Error('Copy failed'));
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    render(<ArticlePreview article={mockArticle} isLoading={false} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    await userEvent.click(copyButton);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to copy content to clipboard.',
      variant: 'destructive',
    });
  });

  it('should clean malformed content correctly', () => {
    const malformedArticle = {
      ...mockArticle,
      content: '"html<h1>Test Title</h1><p>Content with escaped quotes and "html prefix.</p>',
    };

    render(<ArticlePreview article={malformedArticle} isLoading={false} />);

    // Check if content is cleaned and rendered properly
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText(/Content with escaped quotes/)).toBeInTheDocument();
  });

  it('should handle content with special sections', () => {
    const articleWithSpecialSections = {
      ...mockArticle,
      content: `
        <h1>Test Article</h1>
        <div class="quick-takeaway">
          <p>Key takeaway here</p>
        </div>
        <div class="pro-tip">
          <p>Pro tip content</p>
        </div>
        <div class="stat-highlight">
          <p>Important statistic: 85% of users</p>
        </div>
      `,
    };

    render(<ArticlePreview article={articleWithSpecialSections} isLoading={false} />);

    expect(screen.getByText('Key takeaway here')).toBeInTheDocument();
    expect(screen.getByText('Pro tip content')).toBeInTheDocument();
    expect(screen.getByText('Important statistic: 85% of users')).toBeInTheDocument();
  });

  it('should render with proper styling classes', () => {
    const { container } = render(<ArticlePreview article={mockArticle} isLoading={false} />);

    // Check if main container has proper classes
    const articleContainer = container.querySelector('[data-testid="article-content"]');
    expect(articleContainer).toHaveClass('py-8', 'px-10', 'min-h-[500px]');
  });

  it('should handle empty content gracefully', () => {
    const emptyArticle = {
      ...mockArticle,
      content: '',
    };

    render(<ArticlePreview article={emptyArticle} isLoading={false} />);

    // Should still render the preview container
    expect(screen.getByText('150 words')).toBeInTheDocument();
    expect(screen.getByText('1 min read')).toBeInTheDocument();
  });

  it('should handle content with markdown code blocks', () => {
    const articleWithCodeBlocks = {
      ...mockArticle,
      content: '```html\n<h1>Test Title</h1>\n<p>Content here</p>\n```',
    };

    render(<ArticlePreview article={articleWithCodeBlocks} isLoading={false} />);

    // Content should be cleaned of markdown artifacts
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('should display share button functionality', async () => {
    // Mock Web Share API
    const mockShare = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      share: mockShare,
    });

    render(<ArticlePreview article={mockArticle} isLoading={false} />);

    const shareButton = screen.getByRole('button', { name: /share/i });
    await userEvent.click(shareButton);

    // Should attempt to use Web Share API or fallback to copy
    expect(mockShare).toHaveBeenCalled();
  });
});

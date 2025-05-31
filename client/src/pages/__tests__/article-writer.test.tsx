import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ArticleWriter from '../article-writer';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/hooks/use-auth';

// Mock the auth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

// Mock the article form and preview components
jest.mock('@/components/article-form', () => ({
  ArticleForm: ({ onArticleGenerated, isGenerating }: any) => {
    const handleSubmit = () => {
      if (typeof onArticleGenerated === 'function') {
        onArticleGenerated({
          content: '<h1>Generated Article</h1><p>This is a test article content.</p>',
          wordCount: 500,
          readingTime: 3,
          settings: {
            keyword: 'test keyword',
            wordCount: 500,
            tone: 'professional',
            callToAction: 'Sign up now!',
          }
        });
      }
    };
    
    return (
      <div data-testid="article-form">
        <button 
          data-testid="generate-button" 
          disabled={isGenerating}
          onClick={handleSubmit}
        >
          Generate Article
        </button>
      </div>
    );
  },
}));

jest.mock('@/components/article-preview', () => ({
  ArticlePreview: ({ article }: any) => (
    <div data-testid="article-preview">
      {article ? (
        <>
          <div data-testid="preview-content">{article.content}</div>
          <div data-testid="preview-word-count">{article.wordCount} words</div>
        </>
      ) : (
        <div>No article generated yet</div>
      )}
    </div>
  ),
}));

// Mock wouter's useLocation
jest.mock('wouter', () => ({
  useLocation: () => ['/article-writer', jest.fn()],
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('ArticleWriter Component', () => {
  beforeEach(() => {
    queryClient.clear();
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('should render the article writer form when authenticated', () => {
    render(<ArticleWriter />, { wrapper });
    
    expect(screen.getByText('AI Article Writer')).toBeInTheDocument();
    expect(screen.getByTestId('article-form')).toBeInTheDocument();
  });

  it('should redirect to auth page when not authenticated', async () => {
    const mockSetLocation = jest.fn();
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });
    
    jest.spyOn(require('wouter'), 'useLocation').mockReturnValue(['/', mockSetLocation]);

    render(<ArticleWriter />, { wrapper });
    
    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/auth');
    });
  });

  it('should show loading state while auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    render(<ArticleWriter />, { wrapper });
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should generate an article and display it in the preview', async () => {
    render(<ArticleWriter />, { wrapper });
    
    // Generate an article
    const user = userEvent.setup();
    await user.click(screen.getByTestId('generate-button'));
    
    // Check if article is displayed in preview
    await waitFor(() => {
      expect(screen.getByTestId('article-preview')).toBeInTheDocument();
      expect(screen.getByTestId('preview-content')).toHaveTextContent('Generated Article');
      expect(screen.getByTestId('preview-word-count')).toHaveTextContent('500 words');
    });
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArticleForm } from '../article-form';
import { useArticleSettings } from '@/hooks/use-article-settings';

// Mock the useArticleSettings hook
jest.mock('@/hooks/use-article-settings');
const mockUseArticleSettings = useArticleSettings as jest.MockedFunction<typeof useArticleSettings>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('ArticleForm', () => {
  let queryClient: QueryClient;
  const mockOnArticleGenerated = jest.fn();

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockToast.mockClear();

    // Mock default settings
    mockUseArticleSettings.mockReturnValue({
      settings: {
        wordCount: 1750,
        writingStyle: 'professional',
        targetAudience: 'general',
        contentDensity: 3,
        readingLevel: 'intermediate',
        enableInternalLinking: true,
        enableExternalLinking: true,
        language: 'english',
        callToAction: '',
      },
      updateSettings: jest.fn(),
      resetSettings: jest.fn(),
    });
  });

  it('should render the form with all required fields', () => {
    const wrapper = createWrapper();
    render(<ArticleForm onArticleGenerated={mockOnArticleGenerated} />, { wrapper });

    // Check if main elements are rendered
    expect(screen.getByPlaceholderText(/enter your target keyword/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate article/i })).toBeInTheDocument();
    
    // Check if settings are displayed
    expect(screen.getByText('1750')).toBeInTheDocument(); // Word count
    expect(screen.getByText('professional')).toBeInTheDocument(); // Writing style
  });

  it('should show validation error when keyword is empty', async () => {
    const wrapper = createWrapper();
    render(<ArticleForm onArticleGenerated={mockOnArticleGenerated} />, { wrapper });

    const generateButton = screen.getByRole('button', { name: /generate article/i });
    await userEvent.click(generateButton);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Please enter a keyword to generate an article.',
      variant: 'destructive',
    });
  });

  it('should generate article when form is submitted with valid data', async () => {
    const mockArticleResponse = {
      content: '<h1>Test Article</h1><p>This is a test article.</p>',
      wordCount: 1750,
      readingTime: 9,
      settings: {
        keyword: 'test keyword',
        wordCount: 1750,
        tone: 'professional',
        callToAction: '',
      },
    };

    // Mock successful API responses
    mockFetch.mockImplementation((url) => {
      if (url === '/api/ai/article/generate') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockArticleResponse),
        });
      }
      if (url === '/api/articles') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 1 } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    const wrapper = createWrapper();
    render(<ArticleForm onArticleGenerated={mockOnArticleGenerated} />, { wrapper });

    // Enter keyword
    const keywordInput = screen.getByPlaceholderText(/enter your target keyword/i);
    await userEvent.type(keywordInput, 'test keyword');

    // Submit form
    const generateButton = screen.getByRole('button', { name: /generate article/i });
    await userEvent.click(generateButton);

    // Wait for generation to complete
    await waitFor(() => {
      expect(mockOnArticleGenerated).toHaveBeenCalledWith(mockArticleResponse);
    });

    // Check if success toast was shown
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Your SEO-optimized article has been generated and saved successfully!',
    });
  });

  it('should show loading state during article generation', async () => {
    // Mock a delayed response
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            content: '<h1>Test</h1>',
            wordCount: 1000,
            readingTime: 5,
            settings: {},
          }),
        }), 100)
      )
    );

    const wrapper = createWrapper();
    render(<ArticleForm onArticleGenerated={mockOnArticleGenerated} />, { wrapper });

    // Enter keyword
    const keywordInput = screen.getByPlaceholderText(/enter your target keyword/i);
    await userEvent.type(keywordInput, 'test keyword');

    // Submit form
    const generateButton = screen.getByRole('button', { name: /generate article/i });
    await userEvent.click(generateButton);

    // Check loading state
    expect(screen.getByText(/generating article/i)).toBeInTheDocument();
    expect(generateButton).toBeDisabled();
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'));

    const wrapper = createWrapper();
    render(<ArticleForm onArticleGenerated={mockOnArticleGenerated} />, { wrapper });

    // Enter keyword
    const keywordInput = screen.getByPlaceholderText(/enter your target keyword/i);
    await userEvent.type(keywordInput, 'test keyword');

    // Submit form
    const generateButton = screen.getByRole('button', { name: /generate article/i });
    await userEvent.click(generateButton);

    // Wait for error handling
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to generate article. Please try again.',
        variant: 'destructive',
      });
    });
  });

  it('should display current settings correctly', () => {
    const customSettings = {
      wordCount: 2000,
      writingStyle: 'casual',
      targetAudience: 'beginners',
      contentDensity: 4,
      readingLevel: 'advanced',
      enableInternalLinking: false,
      enableExternalLinking: false,
      language: 'spanish',
      callToAction: 'Contact us today!',
    };

    mockUseArticleSettings.mockReturnValue({
      settings: customSettings,
      updateSettings: jest.fn(),
      resetSettings: jest.fn(),
    });

    const wrapper = createWrapper();
    render(<ArticleForm onArticleGenerated={mockOnArticleGenerated} />, { wrapper });

    // Check if custom settings are displayed
    expect(screen.getByText('2000')).toBeInTheDocument();
    expect(screen.getByText('casual')).toBeInTheDocument();
  });

  it('should clear keyword input after successful generation', async () => {
    mockFetch.mockImplementation((url) => {
      if (url === '/api/ai/article/generate') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            content: '<h1>Test</h1>',
            wordCount: 1000,
            readingTime: 5,
            settings: {},
          }),
        });
      }
      if (url === '/api/articles') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 1 } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    const wrapper = createWrapper();
    render(<ArticleForm onArticleGenerated={mockOnArticleGenerated} />, { wrapper });

    const keywordInput = screen.getByPlaceholderText(/enter your target keyword/i);
    await userEvent.type(keywordInput, 'test keyword');

    const generateButton = screen.getByRole('button', { name: /generate article/i });
    await userEvent.click(generateButton);

    await waitFor(() => {
      expect(keywordInput).toHaveValue('');
    });
  });
});

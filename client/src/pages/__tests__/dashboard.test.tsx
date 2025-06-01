import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../dashboard';
import { useAuth } from '@/hooks/use-auth';
import userEvent from '@testing-library/user-event';

// Mock the useAuth hook
jest.mock('@/hooks/use-auth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock wouter's useLocation
jest.mock('wouter', () => ({
  useLocation: jest.fn().mockReturnValue(['/', jest.fn()]),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  Bar: () => <div data-testid="bar" />,
  CartesianGrid: () => <div data-testid="grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('Dashboard', () => {
  let queryClient: QueryClient;

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
  });

  it('should redirect to auth when user is not logged in', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    const wrapper = createWrapper();
    render(<Dashboard />, { wrapper });

    // Should return null when no user
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('should show loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    const wrapper = createWrapper();
    render(<Dashboard />, { wrapper });

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('should render dashboard when user is logged in', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    // Mock successful API responses
    mockFetch.mockImplementation((url) => {
      if (url === '/api/user/sync') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      if (url === '/api/user/usage') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            totalArticlesGenerated: 5,
            totalWordCount: 10000,
            totalKeywordsAnalyzed: 25,
            freeArticlesUsed: 2,
            creditsUsed: 5,
            lastArticleDate: '2023-01-01',
            lastKeywordDate: '2023-01-01',
          }),
        });
      }
      if (url === '/api/user/recent-articles') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 1,
              title: 'Test Article',
              createdAt: '2023-01-01',
              wordCount: 1000,
            },
          ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    const wrapper = createWrapper();
    render(<Dashboard />, { wrapper });

    // Check if dashboard title is rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, Test User! 👋')).toBeInTheDocument();

    // Check if New Article button is rendered
    expect(screen.getByRole('button', { name: /new article/i })).toBeInTheDocument();

    // Check if tabs are rendered
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /activity/i })).toBeInTheDocument();
  });

  it('should display usage statistics when loaded', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    mockFetch.mockImplementation((url) => {
      if (url === '/api/user/sync') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      if (url === '/api/user/usage') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            totalArticlesGenerated: 5,
            totalWordCount: 10000,
            totalKeywordsAnalyzed: 25,
            freeArticlesUsed: 2,
            creditsUsed: 5,
            lastArticleDate: '2023-01-01',
            lastKeywordDate: '2023-01-01',
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    const wrapper = createWrapper();
    render(<Dashboard />, { wrapper });

    // Wait for usage stats to load
    await waitFor(() => {
      expect(screen.getByText('Usage Statistics')).toBeInTheDocument();
    });

    // Check if usage stats are displayed
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Total articles
      expect(screen.getByText('10,000')).toBeInTheDocument(); // Total words
      expect(screen.getByText('25')).toBeInTheDocument(); // Keywords analyzed
      expect(screen.getByText('2/3')).toBeInTheDocument(); // Free credits
    });
  });

  it('should render charts in overview tab', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const wrapper = createWrapper();
    render(<Dashboard />, { wrapper });

    // Check if charts are rendered
    expect(screen.getAllByTestId('chart-container')).toHaveLength(2);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('should switch to activity tab and show recent articles', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    });

    mockFetch.mockImplementation((url) => {
      if (url === '/api/user/recent-articles') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 1,
              title: 'Test Article',
              createdAt: '2023-01-01',
              wordCount: 1000,
            },
          ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    const wrapper = createWrapper();
    render(<Dashboard />, { wrapper });

    // Click on activity tab
    const activityTab = screen.getByRole('tab', { name: /activity/i });
    await userEvent.click(activityTab);

    // Wait for recent articles to load
    await waitFor(() => {
      expect(screen.getByText('Recent Articles')).toBeInTheDocument();
    });
  });
});

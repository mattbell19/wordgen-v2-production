import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SiteSelector } from '../site-selector';
import { useGSC } from '@/hooks/use-gsc';

// Mock the useGSC hook
jest.mock('@/hooks/use-gsc', () => ({
  useGSC: jest.fn()
}));

describe('SiteSelector Component', () => {
  const mockSetDefaultSite = {
    mutate: jest.fn(),
    isLoading: false
  };

  const mockSites = [
    { id: 1, siteUrl: 'https://example.com', isDefault: true },
    { id: 2, siteUrl: 'https://test.com', isDefault: false }
  ];

  const mockOnSiteChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render the site selector with sites', () => {
    (useGSC as any).mockReturnValue({
      sites: mockSites,
      sitesLoading: false,
      setDefaultSite: mockSetDefaultSite
    });

    render(<SiteSelector onSiteChange={mockOnSiteChange} />);

    expect(screen.getByText('example.com (Default)')).toBeInTheDocument();
  });

  it('should show loading state when loading sites', () => {
    (useGSC as any).mockReturnValue({
      sites: [],
      sitesLoading: true,
      setDefaultSite: mockSetDefaultSite
    });

    render(<SiteSelector onSiteChange={mockOnSiteChange} />);

    expect(screen.getByText('Loading sites...')).toBeInTheDocument();
  });

  it('should show no sites message when no sites are available', () => {
    (useGSC as any).mockReturnValue({
      sites: [],
      sitesLoading: false,
      setDefaultSite: mockSetDefaultSite
    });

    render(<SiteSelector onSiteChange={mockOnSiteChange} />);

    expect(screen.getByText('No Sites Available')).toBeInTheDocument();
    expect(screen.getByText('Add Site to Search Console')).toBeInTheDocument();
  });

  it('should call onSiteChange when a site is selected', async () => {
    (useGSC as any).mockReturnValue({
      sites: mockSites,
      sitesLoading: false,
      setDefaultSite: mockSetDefaultSite
    });

    render(<SiteSelector onSiteChange={mockOnSiteChange} />);

    // Open the select dropdown
    fireEvent.click(screen.getByRole('combobox'));

    // Select the second site
    fireEvent.click(screen.getByText('test.com'));

    expect(mockSetDefaultSite.mutate).toHaveBeenCalledWith(2);
    expect(mockOnSiteChange).toHaveBeenCalledWith(2);
  });

  it('should format site URLs correctly', () => {
    const sitesWithProtocols = [
      { id: 1, siteUrl: 'https://example.com/', isDefault: true },
      { id: 2, siteUrl: 'http://test.com/path/', isDefault: false }
    ];

    (useGSC as any).mockReturnValue({
      sites: sitesWithProtocols,
      sitesLoading: false,
      setDefaultSite: mockSetDefaultSite
    });

    render(<SiteSelector onSiteChange={mockOnSiteChange} />);

    // Open the select dropdown
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('example.com (Default)')).toBeInTheDocument();
    expect(screen.getByText('test.com/path')).toBeInTheDocument();
  });
});

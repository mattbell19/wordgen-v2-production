import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConnectGSC } from '../connect-gsc';
import { useGSC } from '@/hooks/use-gsc';

// Mock the useGSC hook
jest.mock('@/hooks/use-gsc', () => ({
  useGSC: jest.fn()
}));

describe('ConnectGSC Component', () => {
  const mockGetAuthUrl = {
    mutate: jest.fn(),
    isLoading: false
  };

  const mockDisconnect = {
    mutate: jest.fn(),
    isLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render the connect button when not connected', () => {
    (useGSC as any).mockReturnValue({
      isConnected: false,
      isLoading: false,
      getAuthUrl: mockGetAuthUrl,
      disconnect: mockDisconnect
    });

    render(<ConnectGSC />);

    expect(screen.getByText('Connect to Google Search Console')).toBeInTheDocument();
    expect(screen.queryByText('Disconnect')).not.toBeInTheDocument();
  });

  it('should render the disconnect button when connected', () => {
    (useGSC as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      getAuthUrl: mockGetAuthUrl,
      disconnect: mockDisconnect
    });

    render(<ConnectGSC />);

    expect(screen.getByText('Disconnect')).toBeInTheDocument();
    expect(screen.getByText('Open Search Console')).toBeInTheDocument();
    expect(screen.queryByText('Connect to Google Search Console')).not.toBeInTheDocument();
  });

  it('should show loading state when checking connection', () => {
    (useGSC as any).mockReturnValue({
      isConnected: false,
      isLoading: true,
      getAuthUrl: mockGetAuthUrl,
      disconnect: mockDisconnect
    });

    render(<ConnectGSC />);

    expect(screen.getByText('Checking connection status...')).toBeInTheDocument();
  });

  it('should call getAuthUrl.mutate when connect button is clicked', async () => {
    (useGSC as any).mockReturnValue({
      isConnected: false,
      isLoading: false,
      getAuthUrl: mockGetAuthUrl,
      disconnect: mockDisconnect
    });

    render(<ConnectGSC />);

    fireEvent.click(screen.getByText('Connect to Google Search Console'));

    expect(mockGetAuthUrl.mutate).toHaveBeenCalled();
  });

  it('should call disconnect.mutate when disconnect button is clicked', async () => {
    (useGSC as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      getAuthUrl: mockGetAuthUrl,
      disconnect: mockDisconnect
    });

    render(<ConnectGSC />);

    fireEvent.click(screen.getByText('Disconnect'));

    expect(mockDisconnect.mutate).toHaveBeenCalled();
  });

  it('should disable connect button when loading', () => {
    (useGSC as any).mockReturnValue({
      isConnected: false,
      isLoading: false,
      getAuthUrl: { ...mockGetAuthUrl, isLoading: true },
      disconnect: mockDisconnect
    });

    render(<ConnectGSC />);

    const button = screen.getByText('Connecting...');
    expect(button).toBeDisabled();
  });

  it('should disable disconnect button when loading', () => {
    (useGSC as any).mockReturnValue({
      isConnected: true,
      isLoading: false,
      getAuthUrl: mockGetAuthUrl,
      disconnect: { ...mockDisconnect, isLoading: true }
    });

    render(<ConnectGSC />);

    const button = screen.getByText('Disconnecting...');
    expect(button).toBeDisabled();
  });
});

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { useUser } from './use-user';

interface Team {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
}

interface ApiResponse<T> {
  ok: boolean;
  data: T;
  message?: string;
  error?: string;
}

interface TeamContextType {
  activeTeam: Team | null;
  isLoading: boolean;
  error: Error | null;
  userTeams: Team[];
  switchToPersonal: () => Promise<void>;
  switchToTeam: (teamId: number) => Promise<void>;
  isPersonalMode: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user, refetch: refetchUser, isLoading: isUserLoading } = useUser();
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's teams
  const { data: userTeams = [], isLoading: isTeamsLoading, error: teamsError } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
    enabled: !isUserLoading, // Only fetch when user loading is complete
    queryFn: async () => {
      try {
        console.log('TeamContext - Starting teams API request');
        const response = await fetch('/api/teams', {
          credentials: 'include',
        });

        console.log('TeamContext - Teams API response status:', response.status);

        if (!response.ok) {
          const error = await response.json();
          console.error('TeamContext - Teams API error:', error);
          throw new Error(error.message || 'Failed to fetch teams');
        }

        const data = await response.json();
        console.log('TeamContext - Teams API response data:', data);

        // Check if the response has the expected structure
        if (data.success === false) {
          console.error('TeamContext - API response not successful:', data);
          throw new Error(data.message || 'Failed to fetch teams');
        }

        // Handle the response format
        if (data.data && data.data.teams && Array.isArray(data.data.teams)) {
          console.log('TeamContext - Using nested teams array format, found', data.data.teams.length, 'teams');
          return data.data.teams;
        } else if (data.data && Array.isArray(data.data)) {
          console.log('TeamContext - Using array response format, found', data.data.length, 'teams');
          return data.data;
        } else {
          console.warn('TeamContext - Unexpected teams data format:', data.data);
          return [];
        }
      } catch (error: any) {
        console.error('TeamContext - Error fetching teams:', error);
        setError(error);
        return []; // Return empty array on error
      }
    },
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });

  // Fetch active team details if user has an activeTeamId
  const { data: activeTeamData, isLoading: isActiveTeamLoading, error: activeTeamError } = useQuery<Team | null>({
    queryKey: ['/api/teams/active'] as const,
    enabled: !isUserLoading && !!user?.activeTeamId, // Only fetch when user is loaded and has activeTeamId
    queryFn: async () => {
      try {
        console.log('TeamContext - Starting active team API request');
        const response = await fetch('/api/teams/active', {
          credentials: 'include',
        });

        console.log('TeamContext - Active team API response status:', response.status);

        if (!response.ok) {
          const error = await response.json();
          console.error('TeamContext - Active team API error:', error);
          throw new Error(error.message || 'Failed to fetch active team');
        }

        const data = await response.json();
        console.log('TeamContext - Active team API response data:', data);

        // Check if the response has the expected structure
        if (data.success === false) {
          console.error('TeamContext - Active team API response not successful:', data);
          throw new Error(data.message || 'Failed to fetch active team');
        }

        return data.data as Team | null;
      } catch (error: any) {
        console.error('TeamContext - Error fetching active team:', error);
        setError(error);
        return null; // Return null on error
      }
    },
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });

  // Update active team when data changes
  useEffect(() => {
    if (activeTeamData) {
      setActiveTeam(activeTeamData);
    } else if (!isActiveTeamLoading && !user?.activeTeamId) {
      setActiveTeam(null);
    }
  }, [activeTeamData, isActiveTeamLoading, user?.activeTeamId]);

  // Update error state
  useEffect(() => {
    if (teamsError) setError(teamsError as Error);
    else if (activeTeamError) setError(activeTeamError as Error);
    else setError(null);
  }, [teamsError, activeTeamError]);

  // Switch to personal account
  const switchToPersonal = async () => {
    try {
      const response = await fetch('/api/teams/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teamId: null }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to switch to personal account');
      }

      const data: ApiResponse<null> = await response.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to switch to personal account');
      }

      // Clear active team
      setActiveTeam(null);

      // Invalidate user data to refresh activeTeamId
      await refetchUser();

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/keywords'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      toast({
        title: 'Switched to personal account',
        description: 'You are now using your personal account',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Switch to team account
  const switchToTeam = async (teamId: number) => {
    try {
      const response = await fetch('/api/teams/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teamId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to switch to team account');
      }

      const data: ApiResponse<{ teamId: number }> = await response.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to switch to team account');
      }

      // Find the team in userTeams
      const team = userTeams.find(t => t.id === teamId) || null;
      setActiveTeam(team);

      // Invalidate user data to refresh activeTeamId
      await refetchUser();

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/articles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/keywords'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      toast({
        title: 'Switched to team account',
        description: `You are now using ${team?.name} team account`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <TeamContext.Provider
      value={{
        activeTeam,
        isLoading: isUserLoading || isTeamsLoading || isActiveTeamLoading,
        error,
        userTeams,
        switchToPersonal,
        switchToTeam,
        isPersonalMode: !activeTeam,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}

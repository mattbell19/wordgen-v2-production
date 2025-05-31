import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Team {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
}



export default function Teams() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  console.log('Teams page - Component mounted');

  const { data: teams = [], isLoading, error } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
    queryFn: async () => {
      console.log('Teams page - Starting API request');
      try {
        const response = await fetch('/api/teams', {
          credentials: 'include',
        });

        console.log('Teams page - API response status:', response.status);

        if (!response.ok) {
          const error = await response.json();
          console.error('Teams page - API error:', error);
          throw new Error(error.message || 'Failed to fetch teams');
        }

        const data = await response.json();
        console.log('Teams page - API response data:', data);

        // Check if the response has the expected structure
        if (data.success === false) {
          console.error('Teams page - API response not successful:', data);
          throw new Error(data.message || 'Failed to fetch teams');
        }

        // Handle the response format
        if (data.data && data.data.teams && Array.isArray(data.data.teams)) {
          console.log('Teams page - Using nested teams array format, found', data.data.teams.length, 'teams');
          return data.data.teams;
        } else if (data.data && Array.isArray(data.data)) {
          console.log('Teams page - Using array response format, found', data.data.length, 'teams');
          return data.data;
        } else {
          console.warn('Teams page - Unexpected teams data format:', data.data);
          return [];
        }
      } catch (error: any) {
        console.error('Teams page - Error fetching teams:', error);
        throw error;
      }
    },
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });

  console.log('Teams page - Current teams data:', teams);
  console.log('Teams page - Loading state:', isLoading);
  if (error) console.error('Teams page - Query error:', error);

  const hasTeam = teams && teams.length > 0;

  // Function to handle team switching
  const handleSwitchTeam = (teamId: number) => {
    fetch('/api/teams/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ teamId }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          toast({
            title: "Success",
            description: `Switched to team account`,
          });
          // Refresh the page to update the UI
          window.location.reload();
        } else {
          throw new Error(data.message || 'Failed to switch team');
        }
      })
      .catch(error => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Team Management</h1>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Team Management</h1>
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-500">
                <p>Error loading teams: {error instanceof Error ? error.message : 'Unknown error'}</p>
                <Button
                  onClick={() => window.location.reload()}
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Team Management</h1>
          {!hasTeam && (
            <Button
              onClick={() => setLocation('/dashboard/teams/create')}
              className="flex items-center gap-2"
            >
              Create New Team
            </Button>
          )}
        </div>

        {/* Teams List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Your Team</h2>
          {!teams?.length ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                You haven't created a team yet.
              </CardContent>
            </Card>
          ) : (
            teams.map((team) => (
              <Card key={team.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{team.name}</h3>
                      {team.description && (
                        <p className="text-muted-foreground">{team.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setLocation(`/dashboard/teams/${team.id}`)}
                      >
                        Manage Team
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleSwitchTeam(team.id)}
                      >
                        Switch to Team
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
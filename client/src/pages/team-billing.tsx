import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { TeamBilling } from '@/components/team-billing';
import { useUser } from '@/hooks/use-user';

interface Team {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
}

export default function TeamBillingPage() {
  const { teamId } = useParams();
  const { user } = useUser();
  
  // Fetch team details
  const { data: team, isLoading } = useQuery<Team>({
    queryKey: [`/api/teams/${teamId}`],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch team details');
      }
      
      return response.json().then(res => res.data);
    },
    enabled: !!teamId && !!user,
  });
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Team Not Found</h1>
          <p>The team you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }
  
  const isOwner = team.ownerId === user?.id;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">{team.name}</h1>
        <p className="text-muted-foreground mb-6">Team Billing & Subscription</p>
        
        <TeamBilling 
          teamId={parseInt(teamId!)} 
          teamName={team.name} 
          isOwner={isOwner} 
        />
      </div>
    </div>
  );
}

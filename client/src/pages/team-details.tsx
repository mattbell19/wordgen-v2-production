import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, User, CreditCard, Shield } from "lucide-react";
import { TeamInviteForm } from "@/components/team-invite-form";
import { TeamMemberList } from "@/components/team-member-list";
import { useUser } from "@/hooks/use-user";

interface TeamMember {
  id: number;
  status: string;
  user: {
    id: number;
    email: string;
    name?: string;
  };
  role: {
    id: number;
    name: string;
    permissions: Record<string, boolean>;
  };
}

interface Team {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  members: TeamMember[];
}

export default function TeamDetails() {
  const { id } = useParams();
  const teamId = id ? parseInt(id) : 0;
  const { user } = useUser();

  const { data: team, isLoading } = useQuery<Team>({
    queryKey: [`/api/teams/${teamId}`],
    enabled: !!teamId,
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team details');
      }

      const data = await response.json();
      return data.team;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Team not found or access denied
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{team.name}</CardTitle>
            {team.description && (
              <CardDescription>{team.description}</CardDescription>
            )}
          </CardHeader>
          <CardFooter className="flex gap-2">
            <Link href={`/dashboard/teams/${teamId}/billing`}>
              <Button variant="outline" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Manage Billing
              </Button>
            </Link>
            <Link href={`/dashboard/teams/${teamId}/roles`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Manage Roles
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeamInviteForm teamId={teamId} teamName={team.name} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeamMemberList
              teamId={teamId}
              members={team.members}
              currentUserId={user?.id || 0}
              isOwner={team.ownerId === user?.id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
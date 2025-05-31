import { useEffect, useState } from "react";
import { useLocation, useRoute, useLocation as useNavigate } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Users } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useTeam } from "@/hooks/use-team-context";

interface TeamInviteData {
  teamId: number;
  teamName: string;
  inviterId: number;
  inviterName: string;
}

export default function TeamInvitePage() {
  const [, params] = useRoute("/dashboard/teams/invite");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const { switchToTeam } = useTeam();
  const [token, setToken] = useState<string | null>(null);

  // Extract token from URL query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  // Fetch invitation details
  const { data: inviteData, isLoading: isLoadingInvite } = useQuery<TeamInviteData>({
    queryKey: ["/api/teams/invites", token],
    enabled: !!token && !!user,
    queryFn: async () => {
      const response = await fetch(`/api/teams/invites/verify?token=${token}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify invitation");
      }
      
      return response.json().then(res => res.data);
    },
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/teams/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to accept invitation");
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Invitation accepted",
        description: `You have joined ${inviteData?.teamName}`,
      });
      
      // Switch to the team
      if (data.teamId) {
        try {
          await switchToTeam(data.teamId);
        } catch (error) {
          console.error("Failed to switch to team:", error);
        }
      }
      
      // Navigate to dashboard
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Decline invitation mutation
  const declineMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/teams/invites/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to decline invitation");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation declined",
        description: "You have declined the team invitation",
      });
      
      // Navigate to dashboard
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle missing token
  if (!token) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoadingInvite) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Verifying invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid or expired invitation
  if (!inviteData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Users className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center">Team Invitation</CardTitle>
          <CardDescription className="text-center">
            You've been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium text-lg">{inviteData.teamName}</p>
              <p className="text-sm text-muted-foreground">
                Invited by {inviteData.inviterName}
              </p>
            </div>
            <p className="text-center">
              Would you like to join this team? You'll be able to collaborate and share content with other team members.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => declineMutation.mutate()}
            disabled={declineMutation.isPending || acceptMutation.isPending}
            className="flex-1 mr-2"
          >
            {declineMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Decline
          </Button>
          <Button
            onClick={() => acceptMutation.mutate()}
            disabled={declineMutation.isPending || acceptMutation.isPending}
            className="flex-1 ml-2"
          >
            {acceptMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Accept
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

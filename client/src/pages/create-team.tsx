import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users } from "lucide-react";
import { useTeam } from "@/hooks/use-team-context";

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

export default function CreateTeamPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { switchToTeam } = useTeam();

  // Check if user already has a team
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/teams', {
          credentials: 'include',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to fetch teams');
        }

        const data: ApiResponse<{ teams: Team[] }> = await response.json();
        if (!data.ok) {
          throw new Error(data.message || 'Failed to fetch teams');
        }

        // Log the response for debugging
        console.log('Create team page - API response:', data);

        // Handle both possible response formats
        if (Array.isArray(data.data)) {
          return data.data;
        } else if (data.data && Array.isArray(data.data.teams)) {
          return data.data.teams;
        } else {
          console.warn('Unexpected teams data format:', data.data);
          return [];
        }
      } catch (error: any) {
        console.error('Error fetching teams:', error);
        throw error;
      }
    },
    retry: 1,
    retryDelay: 1000,
  });

  const hasTeam = teams && teams.length > 0;

  // If user already has a team, redirect to teams page
  if (hasTeam) {
    navigate("/dashboard/teams");
    return null;
  }

  const createTeamMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data: ApiResponse<{ team: Team }> = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Failed to create team");
      }

      return data;
    },
    onSuccess: async (data) => {
      toast({
        title: "Team created",
        description: `${name} team has been created successfully`,
      });

      // Switch to the new team
      if (data.data?.team?.id) {
        try {
          await switchToTeam(data.data.team.id);
        } catch (error) {
          console.error("Failed to switch to team:", error);
        }
      }

      // Navigate to teams page
      navigate("/dashboard/teams");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate team name
    if (!name.trim()) {
      setNameError("Team name is required");
      return;
    }

    if (hasTeam) {
      toast({
        title: "Error",
        description: "You can only create one team",
        variant: "destructive",
      });
      navigate("/dashboard/teams");
      return;
    }

    setNameError("");
    createTeamMutation.mutate();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Users className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center">Create a New Team</CardTitle>
          <CardDescription className="text-center">
            Create a team to collaborate and share content with others
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder="Enter team name"
                className={nameError ? "border-red-500" : ""}
              />
              {nameError && (
                <p className="text-sm text-red-500">{nameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your team's purpose"
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard/teams")}
              disabled={createTeamMutation.isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTeamMutation.isLoading}
            >
              {createTeamMutation.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Team"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

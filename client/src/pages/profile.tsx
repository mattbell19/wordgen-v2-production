import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";
import { useLocation } from "wouter";
import { SubscriptionManagement } from "@/components/subscription-management";
import { useUser } from "@/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileFormData {
  name: string;
  email: string;
  company: string;
  website: string;
  timezone: string;
  emailNotifications: boolean;
}

export default function Profile() {
  const { toast } = useToast();
  const { user, isLoading } = useUser();
  const [editing, setEditing] = useState(false);
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    email: "",
    company: "",
    website: "",
    timezone: "",
    emailNotifications: true
  });

  // Update form data when user data is loaded
  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        company: user.company || "",
        website: user.website || "",
        timezone: user.timezone || "",
        emailNotifications: user.emailNotifications ?? true
      });
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your profile has been successfully updated.",
      });
      setEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
        <div className="space-y-8">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      <section className="mb-8">
        <SubscriptionManagement />
      </section>

      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Manage your team settings, invitations, and collaborations.
            </p>
            <Button
              onClick={() => setLocation("/teams")}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Manage Teams
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Your email"
                      type="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Your company"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={formData.timezone}
                      onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                      placeholder="UTC+0"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="notifications"
                      checked={formData.emailNotifications}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, emailNotifications: checked }))
                      }
                    />
                    <Label htmlFor="notifications">Email Notifications</Label>
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button
                    type="submit"
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                    disabled={updateProfile.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <div className="font-medium mt-1">{user?.email || "Not set"}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <div className="font-medium mt-1">{user?.name || "Not set"}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Company</Label>
                    <div className="font-medium mt-1">{user?.company || "Not set"}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Website</Label>
                    <div className="font-medium mt-1">
                      {user?.website ? (
                        <a
                          href={user.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {user.website}
                        </a>
                      ) : (
                        "Not set"
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Timezone</Label>
                    <div className="font-medium mt-1">{user?.timezone || "Not set"}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email Notifications</Label>
                    <div className="font-medium mt-1">
                      {user?.emailNotifications ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                </div>
                <Button onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

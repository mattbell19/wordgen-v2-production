import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Component, ErrorInfo, ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Search, 
  UserPlus, 
  Users, 
  MoreVertical, 
  Crown, 
  Ban,
  Clock,
  CreditCard,
  Mail,
  RefreshCw,
  UserCog,
  AlertTriangle,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { api } from "@/lib/api";

interface User {
  id: number;
  email: string;
  name: string | null;
  isAdmin: boolean;
  subscriptionTier: string;
  articleCreditsRemaining: number;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  status: string;
  lastLoginDate: string | null;
  totalArticlesGenerated: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UserDetailsDialogProps {
  user: User;
  onClose: () => void;
}

function UserDetailsDialog({ user, onClose }: UserDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateSubscription = useMutation({
    mutationFn: (data: { userId: number; tier: string }) =>
      api.admin.updateUserSubscription.mutate(data),
    onSuccess: () => {
      toast({
        title: "Subscription updated",
        description: "User's subscription has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin.users"] });
    },
  });

  const updateCredits = useMutation({
    mutationFn: (data: { userId: number; credits: number }) =>
      api.admin.updateUserCredits.mutate(data),
    onSuccess: () => {
      toast({
        title: "Credits updated",
        description: "User's credits have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin.users"] });
    },
  });

  return (
    <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
      <DialogHeader>
        <DialogTitle>User Details</DialogTitle>
        <DialogDescription>View and manage user details</DialogDescription>
      </DialogHeader>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Basic Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span>{user.name || 'Unnamed User'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span>{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                  {user.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined:</span>
                <span>{user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Login:</span>
                <span>
                  {user.lastLoginDate && !isNaN(new Date(user.lastLoginDate).getTime())
                    ? formatDistanceToNow(new Date(user.lastLoginDate), { addSuffix: true })
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Subscription</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Plan:</span>
                <Select
                  defaultValue={user.subscriptionTier}
                  onValueChange={(value) =>
                    updateSubscription.mutate({ userId: user.id, tier: value })
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {user.subscriptionEndDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires:</span>
                  <span>{format(new Date(user.subscriptionEndDate), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Usage Statistics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Articles Generated:</span>
                <span>{user.totalArticlesGenerated || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Credits Remaining:</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20"
                    defaultValue={user.articleCreditsRemaining}
                    onChange={(e) =>
                      updateCredits.mutate({
                        userId: user.id,
                        credits: parseInt(e.target.value),
                      })
                    }
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      updateCredits.mutate({
                        userId: user.id,
                        credits: user.articleCreditsRemaining + 10,
                      })
                    }
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href={`mailto:${user.email}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Clock className="mr-2 h-4 w-4" />
                View Activity Log
              </Button>
              {user.status === 'active' ? (
                <Button variant="destructive" className="w-full justify-start">
                  <Ban className="mr-2 h-4 w-4" />
                  Suspend Account
                </Button>
              ) : (
                <Button variant="default" className="w-full justify-start">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reactivate Account
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

// Add Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <Button onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["admin.users"],
    queryFn: () => api.admin.users.query(),
    retry: 1,
  });

  const selectedUser = useMemo(() => {
    if (!response?.data || !selectedUserId) return null;
    return response.data.find(user => user.id === selectedUserId) || null;
  }, [response?.data, selectedUserId]);

  const filteredUsers = useMemo(() => {
    if (!response?.data) return [];
    
    return response.data.filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name === null;
      
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      
      const matchesSubscription =
        subscriptionFilter === "all" || user.subscriptionTier === subscriptionFilter;

      return matchesSearch && matchesStatus && matchesSubscription;
    });
  }, [response?.data, searchQuery, statusFilter, subscriptionFilter]);

  const handleUserSelect = useCallback((userId: number) => {
    setSelectedUserId(userId);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    // Add a small delay before clearing the selected user to prevent UI flicker
    setTimeout(() => setSelectedUserId(null), 100);
  }, []);

  const toggleAdmin = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => {
      return api.admin.updateUser.mutate({ userId, isAdmin });
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User permissions have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin.users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading users: {(error as Error).message}</p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["admin.users"] })}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-full max-w-sm" />
              <Skeleton className="h-[400px] w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
            </CardTitle>
            <CardDescription>
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Subscription" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name || 'Unnamed User'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.isAdmin ? "default" : "secondary"}>
                          {user.isAdmin ? "Admin" : "User"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === "active"
                              ? "default"
                              : user.status === "suspended"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.subscriptionTier}</Badge>
                      </TableCell>
                      <TableCell>{user.articleCreditsRemaining}</TableCell>
                      <TableCell>
                        {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleUserSelect(user.id)}>
                              <UserCog className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toggleAdmin.mutate({
                                  userId: user.id,
                                  isAdmin: !user.isAdmin,
                                })
                              }
                            >
                              <Crown className="mr-2 h-4 w-4" />
                              {user.isAdmin ? "Remove Admin" : "Make Admin"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              {user.status === "active" ? "Suspend" : "Reactivate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {dialogOpen && selectedUser && (
          <Dialog 
            open={dialogOpen} 
            onOpenChange={(open) => {
              if (!open) handleDialogClose();
            }}
          >
            <UserDetailsDialog
              user={selectedUser}
              onClose={handleDialogClose}
            />
          </Dialog>
        )}
      </div>
    </ErrorBoundary>
  );
} 
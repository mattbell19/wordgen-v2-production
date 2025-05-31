import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Edit, Shield, Users } from 'lucide-react';

interface TeamRoleManagerProps {
  teamId: number;
  isOwner: boolean;
}

interface TeamRole {
  id: number;
  name: string;
  teamId: number;
  permissions: {
    canInviteMembers: boolean;
    canRemoveMembers: boolean;
    canEditTeamSettings: boolean;
    canCreateContent: boolean;
    canEditContent: boolean;
    canDeleteContent: boolean;
    canApproveContent: boolean;
    canManageKeywords: boolean;
    canViewAnalytics: boolean;
    canManageBilling: boolean;
    canManageRoles: boolean;
  };
  description?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: number;
  userId: number;
  email: string;
  status: string;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
  role: {
    id: number;
    name: string;
  };
}

export function TeamRoleManager({ teamId, isOwner }: TeamRoleManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<TeamRole | null>(null);
  const [newRole, setNewRole] = useState<Partial<TeamRole>>({
    name: '',
    permissions: {
      canInviteMembers: false,
      canRemoveMembers: false,
      canEditTeamSettings: false,
      canCreateContent: true,
      canEditContent: false,
      canDeleteContent: false,
      canApproveContent: false,
      canManageKeywords: true,
      canViewAnalytics: true,
      canManageBilling: false,
      canManageRoles: false,
    },
    description: '',
  });
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch team roles
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<TeamRole[]>({
    queryKey: [`/api/teams/${teamId}/roles`],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}/roles`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch team roles');
      }
      
      return response.json().then(res => res.data);
    },
  });

  // Fetch team members
  const { data: members = [], isLoading: isLoadingMembers } = useQuery<TeamMember[]>({
    queryKey: [`/api/teams/${teamId}/members`],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch team members');
      }
      
      return response.json().then(res => res.data);
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (role: Partial<TeamRole>) => {
      const response = await fetch(`/api/teams/${teamId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(role),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/roles`] });
      setIsCreateDialogOpen(false);
      setNewRole({
        name: '',
        permissions: {
          canInviteMembers: false,
          canRemoveMembers: false,
          canEditTeamSettings: false,
          canCreateContent: true,
          canEditContent: false,
          canDeleteContent: false,
          canApproveContent: false,
          canManageKeywords: true,
          canViewAnalytics: true,
          canManageBilling: false,
          canManageRoles: false,
        },
        description: '',
      });
      toast({
        title: 'Role created',
        description: 'The role has been created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (role: Partial<TeamRole>) => {
      if (!selectedRole) return null;
      
      const response = await fetch(`/api/teams/${teamId}/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(role),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/roles`] });
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      toast({
        title: 'Role updated',
        description: 'The role has been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const response = await fetch(`/api/teams/${teamId}/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/roles`] });
      toast({
        title: 'Role deleted',
        description: 'The role has been deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
      const response = await fetch(`/api/teams/${teamId}/roles/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, roleId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
      setIsAssignDialogOpen(false);
      setSelectedMemberId(null);
      setSelectedRoleId(null);
      toast({
        title: 'Role assigned',
        description: 'The role has been assigned successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateRole = () => {
    createRoleMutation.mutate(newRole);
  };

  const handleUpdateRole = () => {
    if (!selectedRole) return;
    updateRoleMutation.mutate(selectedRole);
  };

  const handleDeleteRole = (roleId: number) => {
    if (confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const handleAssignRole = () => {
    if (!selectedMemberId || !selectedRoleId) return;
    assignRoleMutation.mutate({ userId: selectedMemberId, roleId: selectedRoleId });
  };

  const handleEditRole = (role: TeamRole) => {
    setSelectedRole({ ...role });
    setIsEditDialogOpen(true);
  };

  const isLoading = isLoadingRoles || isLoadingMembers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="roles" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="roles" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Roles
        </TabsTrigger>
        <TabsTrigger value="members" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Members
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="roles" className="space-y-4 mt-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Team Roles</h3>
          {(isOwner || roles.some(role => role.permissions.canManageRoles)) && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                  <DialogDescription>
                    Create a new role with specific permissions for your team members.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Role Name</Label>
                    <Input
                      id="name"
                      value={newRole.name}
                      onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                      placeholder="e.g., Editor, Viewer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={newRole.description || ''}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                      placeholder="Describe the role's purpose"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    <div className="grid grid-cols-1 gap-2 pt-2">
                      {Object.entries(newRole.permissions || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`new-${key}`}
                            checked={value}
                            onCheckedChange={(checked) => {
                              setNewRole({
                                ...newRole,
                                permissions: {
                                  ...newRole.permissions,
                                  [key]: checked === true,
                                },
                              });
                            }}
                          />
                          <Label htmlFor={`new-${key}`} className="capitalize">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateRole}
                    disabled={!newRole.name || createRoleMutation.isPending}
                  >
                    {createRoleMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle>{role.name}</CardTitle>
                {role.description && (
                  <CardDescription>{role.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Permissions</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {Object.entries(role.permissions).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                        </span>
                        <span className={value ? 'text-green-500' : 'text-red-500'}>
                          {value ? 'Yes' : 'No'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              {(isOwner || roles.some(r => r.permissions.canManageRoles)) && (
                <CardFooter className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditRole(role)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRole(role.id)}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
        
        {/* Edit Role Dialog */}
        {selectedRole && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Role</DialogTitle>
                <DialogDescription>
                  Update the role's name and permissions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Role Name</Label>
                  <Input
                    id="edit-name"
                    value={selectedRole.name}
                    onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description (Optional)</Label>
                  <Input
                    id="edit-description"
                    value={selectedRole.description || ''}
                    onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {Object.entries(selectedRole.permissions).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${key}`}
                          checked={value}
                          onCheckedChange={(checked) => {
                            setSelectedRole({
                              ...selectedRole,
                              permissions: {
                                ...selectedRole.permissions,
                                [key]: checked === true,
                              },
                            });
                          }}
                        />
                        <Label htmlFor={`edit-${key}`} className="capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateRole}
                  disabled={!selectedRole.name || updateRoleMutation.isPending}
                >
                  {updateRoleMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </TabsContent>
      
      <TabsContent value="members" className="space-y-4 mt-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Team Members</h3>
          {(isOwner || roles.some(role => role.permissions.canManageRoles)) && (
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Assign Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Role</DialogTitle>
                  <DialogDescription>
                    Assign a role to a team member to define their permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="member">Team Member</Label>
                    <Select
                      value={selectedMemberId?.toString() || ''}
                      onValueChange={(value) => setSelectedMemberId(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.userId.toString()}>
                            {member.user.name || member.user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={selectedRoleId?.toString() || ''}
                      onValueChange={(value) => setSelectedRoleId(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAssignDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignRole}
                    disabled={!selectedMemberId || !selectedRoleId || assignRoleMutation.isPending}
                  >
                    {assignRoleMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Assign Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        <div className="space-y-4">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{member.user.name || member.user.email}</h4>
                  <p className="text-sm text-muted-foreground">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {member.role.name}
                  </span>
                  {(isOwner || roles.some(role => role.permissions.canManageRoles)) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMemberId(member.userId);
                        setSelectedRoleId(member.role.id);
                        setIsAssignDialogOpen(true);
                      }}
                    >
                      Change
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}

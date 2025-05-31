import React from 'react';
import { useTeam } from '@/hooks/use-team-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronsUpDown, Users, User } from 'lucide-react';
import { useLocation } from 'wouter';

export function TeamSwitcher() {
  const { activeTeam, userTeams, switchToPersonal, switchToTeam, isPersonalMode, isLoading } = useTeam();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" className="w-[200px] justify-between" disabled>
        <span className="truncate">Loading...</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  // If user has no teams, show a button to create one
  if (userTeams.length === 0) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="w-[200px] justify-between"
        onClick={() => navigate('/dashboard/teams')}
      >
        <Users className="mr-2 h-4 w-4" />
        <span className="truncate">Create Team</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-[200px] justify-between">
          {isPersonalMode ? (
            <>
              <User className="mr-2 h-4 w-4" />
              <span className="truncate">Personal Account</span>
            </>
          ) : (
            <>
              <Users className="mr-2 h-4 w-4" />
              <span className="truncate">{activeTeam?.name}</span>
            </>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Switch Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Personal Account Option */}
        <DropdownMenuItem 
          onClick={() => switchToPersonal()}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Personal Account</span>
          {isPersonalMode && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Your Teams</DropdownMenuLabel>
        
        {/* Team Options */}
        {userTeams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => switchToTeam(team.id)}
            className="cursor-pointer"
          >
            <Users className="mr-2 h-4 w-4" />
            <span className="truncate">{team.name}</span>
            {activeTeam?.id === team.id && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => navigate('/dashboard/teams')}
          className="cursor-pointer"
        >
          <span>Manage Teams</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

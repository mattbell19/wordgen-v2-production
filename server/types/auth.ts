export interface User {
  id: number;
  email: string;
  name?: string | null;
  company?: string | null;
  website?: string | null;
  timezone?: string | null;
  isAdmin: boolean;
  emailNotifications: boolean;
  hasSeenTour: boolean;
  activeTeamId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
}
import { Request } from "express";
import type { User, SelectUser } from '@db/schema';

export interface User {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
  emailNotifications: boolean;
  hasSeenTour: boolean;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  keywords: string[];
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface KeywordList {
  id: number;
  name: string;
  keywords: string[];
  source: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Integration {
  id: number;
  type: string;
  config: Record<string, any>;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user: SelectUser;
}

export interface KeywordSearchParams {
  search_question: string;
  search_country?: string;
}

export type WhereClause = {
  eq: (a: any, b: any) => boolean;
  and: (a: boolean, b: boolean) => boolean;
}; 
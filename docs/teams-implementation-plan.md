# Teams Feature Implementation Plan

## Overview
This document outlines the plan for implementing the teams feature in WordGen. The teams feature will allow users to:
1. Join a teams account and switch between personal and team accounts
2. Invite team members
3. Remove team members
4. Share all content (articles, keywords, etc.) between team members
5. Send email invites using the Resend API

## Database Structure
The database schema already includes the necessary tables for teams:
- `teams` - Stores team information
- `team_roles` - Defines roles and permissions
- `team_members` - Manages team membership

## Implementation Plan

### 1. User Context Enhancement
- Update the user context to include current team information
- Add team switching functionality

### 2. Team Management API Endpoints
- Complete/enhance existing team API endpoints
- Implement team invitation system with Resend email integration
- Add team member management endpoints

### 3. UI Components
- Create team switching UI in the header/sidebar
- Enhance team creation and management pages
- Build team invitation and member management UI

### 4. Data Sharing
- Modify existing data access to consider team context
- Update queries to fetch team-shared resources
- Ensure proper permissions for team data access

### 5. Email Notifications
- Implement team invitation emails using Resend API
- Create email templates for team-related actions

## Detailed Implementation Steps

### 1. User Context Enhancement

1. **Update User Model and Context**
   - Add `activeTeamId` field to user model or session
   - Create a team context provider to manage team state
   - Implement team switching functionality

2. **Team Selector Component**
   - Create a dropdown component for switching between personal and team accounts
   - Add this to the main layout/header

### 2. Team Management API Endpoints

1. **Team Creation and Management**
   - Enhance existing team creation endpoint
   - Add team update and deletion endpoints

2. **Team Invitation System**
   - Create endpoint for sending team invitations
   - Implement invitation acceptance/rejection endpoints
   - Add endpoint for removing team members

3. **Team Switching**
   - Create endpoint for switching active team
   - Update session to store active team information

### 3. UI Components

1. **Team Dashboard**
   - Enhance existing team management page
   - Add member management interface
   - Create invitation management UI

2. **Team Switching UI**
   - Add team selector in header/sidebar
   - Show current active team context

3. **Team Settings**
   - Create team settings page
   - Add role management interface

### 4. Data Sharing

1. **Update Data Access Logic**
   - Modify queries to consider team context
   - Update article, keyword, and project queries to include team data

2. **Permission System**
   - Implement role-based access control for team resources
   - Add permission checks to API endpoints

### 5. Email Notifications

1. **Team Invitation Emails**
   - Create email template for team invitations
   - Implement email sending using Resend API

2. **Notification Settings**
   - Add team notification preferences
   - Implement email notifications for team activities

## Backend Changes

1. **Update User Model**
   - Add `activeTeamId` to user model
   - Create migration for this change

2. **Enhance Team Routes**
   - Complete team invitation endpoints
   - Add team switching endpoint
   - Implement member management endpoints

3. **Update Data Access**
   - Modify article, keyword, and project queries to include team data
   - Add team context to data access logic

## Frontend Changes

1. **Create Team Context**
   - Implement team context provider
   - Add team switching functionality

2. **Enhance Team UI**
   - Complete team management pages
   - Add team switching UI
   - Create invitation management interface

3. **Update Data Fetching**
   - Modify queries to include team context
   - Update UI to show team-shared resources

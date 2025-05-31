import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { Request, Response } from 'express';
import { db } from '../../../db';
import { teams, teamMembers, teamRoles, users } from '../../../db/schema';
import { sendEmail } from '../../../services/email';

// Mock the database and email service
jest.mock('../../../db', () => ({
  db: {
    query: {
      teams: {
        findFirst: jest.fn(),
      },
      teamRoles: {
        findFirst: jest.fn(),
      },
      users: {
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn().mockResolvedValue([{ id: 1 }]),
      })),
    })),
  },
}));

jest.mock('../../../services/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

// Import the router after mocking dependencies
import inviteRouter from '../../../routes/teams/invite';

describe('Team Invitation API', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request and response objects
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    
    req = {
      params: { id: '1' },
      body: { email: 'test@example.com' },
      user: { id: 1, email: 'owner@example.com', name: 'Team Owner' },
    };
    
    res = {
      status: statusMock,
      json: jsonMock,
    };

    // Mock database responses
    (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Test Team',
      ownerId: 1,
    });

    (db.query.teamRoles.findFirst as jest.Mock).mockResolvedValue({
      id: 2,
      name: 'Member',
      permissions: {
        canInviteMembers: false,
        canRemoveMembers: false,
        canEditTeamSettings: false,
      },
    });
  });

  describe('POST /api/teams/:id/invite', () => {
    it('should send invitation to new user', async () => {
      // Mock user not found
      (db.query.users.findFirst as jest.Mock).mockResolvedValue(null);

      // Call the route handler
      await inviteRouter.handle(req as Request, res as Response);

      // Verify database operations
      expect(db.query.teams.findFirst).toHaveBeenCalled();
      expect(db.query.teamRoles.findFirst).toHaveBeenCalled();
      expect(db.query.users.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
      });
      expect(db.insert).toHaveBeenCalledWith(teamMembers);

      // Verify email was sent
      expect(sendEmail).toHaveBeenCalledWith(
        'team_invitation',
        expect.objectContaining({
          teamName: 'Test Team',
          inviterName: 'Team Owner',
          acceptLink: expect.stringContaining('invite='),
        }),
        expect.objectContaining({
          to: 'test@example.com',
          userId: 1,
          subject: expect.stringContaining('Test Team'),
        })
      );

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: 'Invitation sent to new user',
            email: 'test@example.com',
            status: 'new_user',
          }),
        })
      );
    });

    it('should send invitation to existing user', async () => {
      // Mock existing user
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 2,
        email: 'test@example.com',
        name: 'Test User',
      });

      // Call the route handler
      await inviteRouter.handle(req as Request, res as Response);

      // Verify database operations
      expect(db.query.teams.findFirst).toHaveBeenCalled();
      expect(db.query.teamRoles.findFirst).toHaveBeenCalled();
      expect(db.query.users.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
      });
      expect(db.insert).toHaveBeenCalledWith(teamMembers);

      // Verify email was sent
      expect(sendEmail).toHaveBeenCalledWith(
        'team_invitation',
        expect.objectContaining({
          teamName: 'Test Team',
          inviterName: 'Team Owner',
          acceptLink: expect.stringContaining('token='),
        }),
        expect.objectContaining({
          to: 'test@example.com',
          userId: 2,
          subject: expect.stringContaining('Test Team'),
        })
      );

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: 'Invitation sent to existing user',
            email: 'test@example.com',
            status: 'existing_user',
          }),
        })
      );
    });

    it('should return 404 if team not found', async () => {
      // Mock team not found
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue(null);

      // Call the route handler
      await inviteRouter.handle(req as Request, res as Response);

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Team not found',
          error: 'TEAM_NOT_FOUND',
        })
      );
    });

    it('should return 400 if email is invalid', async () => {
      // Set invalid email
      req.body.email = 'invalid-email';

      // Call the route handler
      await inviteRouter.handle(req as Request, res as Response);

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('valid email'),
        })
      );
    });
  });
});

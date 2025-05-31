import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { db } from '../../../db';
import { teams, teamMembers, users } from '../../../db/schema';
import { type RequestHandler } from 'express';

// Define mock types
type MockTeam = {
  id: number;
  name: string;
  ownerId: number;
};

type MockTeamMember = {
  id: number;
  teamId: number;
  userId: number;
  status: string;
  invitedBy: number;
  inviter: {
    id: number;
    name: string;
    email: string;
  };
};

// Mock the database
jest.mock('../../../db', () => ({
  db: {
    query: {
      teams: {
        findFirst: jest.fn(),
      },
      teamMembers: {
        findFirst: jest.fn(),
      },
      users: {
        findFirst: jest.fn(),
      },
    },
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([{ id: 1 }] as MockTeamMember[]),
      })),
    })),
    delete: jest.fn(() => ({
      where: jest.fn().mockResolvedValue([{ id: 1 }] as MockTeamMember[]),
    })),
  },
}));

// Import the router after mocking dependencies
import invitesRouter from '../../../routes/teams/invites';

describe('Team Invites API', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let verifyHandler: RequestHandler;
  let acceptHandler: RequestHandler;
  let declineHandler: RequestHandler;
  let next: NextFunction;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request and response objects
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    next = jest.fn();
    
    req = {
      query: { token: 'MToxMjM=' }, // Base64 encoded "1:123"
      body: { token: 'MToxMjM=' },
      user: { id: 123, email: 'test@example.com', name: 'Test User' } as any,
    };
    
    res = {
      status: statusMock as any,
      json: jsonMock as any,
      type: jest.fn().mockReturnThis() as any,
    };

    // Get route handlers
    const routes = (invitesRouter as any).stack;
    verifyHandler = routes.find((r: any) => r.route?.path === '/verify')?.route.stack[1]?.handle;
    acceptHandler = routes.find((r: any) => r.route?.path === '/accept')?.route.stack[2]?.handle;
    declineHandler = routes.find((r: any) => r.route?.path === '/decline')?.route.stack[2]?.handle;

    // Mock database responses
    (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      name: 'Test Team',
      ownerId: 456,
    } as MockTeam);

    (db.query.teamMembers.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      teamId: 1,
      userId: 123,
      status: 'pending',
      invitedBy: 456,
      inviter: {
        id: 456,
        name: 'Inviter',
        email: 'inviter@example.com',
      },
    } as MockTeamMember);
  });

  describe('GET /api/teams/invites/verify', () => {
    it('should verify valid invitation token', async () => {
      // Call the route handler
      await verifyHandler(req as Request, res as Response, next);

      // Verify database operations
      expect(db.query.teams.findFirst).toHaveBeenCalled();
      expect(db.query.teamMembers.findFirst).toHaveBeenCalled();

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            teamId: 1,
            teamName: 'Test Team',
            inviterId: 456,
            inviterName: expect.stringMatching(/Inviter|inviter@example.com/),
          }),
        })
      );
    });

    it('should return 400 if token is missing', async () => {
      // Remove token
      req.query = {};

      // Call the route handler
      await verifyHandler(req as Request, res as Response, next);

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invitation token is required',
          error: 'MISSING_TOKEN',
        })
      );
    });

    it('should return 404 if invitation not found', async () => {
      // Mock invitation not found
      (db.query.teamMembers.findFirst as jest.Mock).mockResolvedValue(null);

      // Call the route handler
      await verifyHandler(req as Request, res as Response, next);

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invitation not found or already accepted',
          error: 'INVITATION_NOT_FOUND',
        })
      );
    });
  });

  describe('POST /api/teams/invites/accept', () => {
    it('should accept valid invitation', async () => {
      // Call the route handler
      await acceptHandler(req as Request, res as Response, next);

      // Verify database operations
      expect(db.query.teams.findFirst).toHaveBeenCalled();
      expect(db.query.teamMembers.findFirst).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalledWith(teamMembers);
      expect(db.update).toHaveBeenCalledWith(users);

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: 'Invitation accepted successfully',
            teamId: 1,
          }),
        })
      );
    });

    it('should return 400 if token is invalid', async () => {
      // Set invalid token
      req.body.token = 'invalid-token';

      // Call the route handler
      await acceptHandler(req as Request, res as Response, next);

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid invitation token',
          error: 'INVALID_TOKEN',
        })
      );
    });
  });

  describe('POST /api/teams/invites/decline', () => {
    it('should decline valid invitation', async () => {
      // Call the route handler
      await declineHandler(req as Request, res as Response, next);

      // Verify database operations
      expect(db.query.teams.findFirst).toHaveBeenCalled();
      expect(db.query.teamMembers.findFirst).toHaveBeenCalled();
      expect(db.delete).toHaveBeenCalledWith(teamMembers);

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: 'Invitation declined successfully',
          }),
        })
      );
    });

    it('should return 404 if invitation not found', async () => {
      // Mock invitation not found
      (db.query.teamMembers.findFirst as jest.Mock).mockResolvedValue(null);

      // Call the route handler
      await declineHandler(req as Request, res as Response, next);

      // Verify response
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invitation not found or already processed',
          error: 'INVITATION_NOT_FOUND',
        })
      );
    });
  });
});

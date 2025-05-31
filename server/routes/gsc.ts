import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { gscService } from '../services/gsc.service';
import ApiResponse from '../lib/api-response';

const router = Router();

// Debug route (no auth required)
router.get('/debug', (req: Request, res: Response) => {
  console.log('GSC debug route called');
  return ApiResponse.success(res, { message: 'GSC debug route working' });
});

// Debug route with auth
router.get('/debug-auth', requireAuth, (req: Request, res: Response) => {
  console.log('GSC debug auth route called');
  return ApiResponse.success(res, { message: 'GSC debug auth route working', user: req.user });
});

/**
 * Initiate Google OAuth flow
 * GET /api/gsc/auth
 */
router.get('/auth', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    // Generate auth URL
    const authUrl = gscService.generateAuthUrl(req.user.id);

    return ApiResponse.success(res, { authUrl }, 'Authorization URL generated');
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return ApiResponse.serverError(res, 'Failed to generate authorization URL', 'GSC_AUTH_ERROR');
  }
});

/**
 * Handle OAuth callback
 * GET /api/gsc/callback
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect('/dashboard/search-console?error=missing_params');
    }

    // Decode state parameter to get user ID
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());

    if (!stateData.userId) {
      return res.redirect('/dashboard/search-console?error=invalid_state');
    }

    // Exchange code for tokens
    const tokens = await gscService.getTokensFromCode(code as string);

    // Get user info if ID token is available
    let email, profilePicture;
    if (tokens.id_token) {
      const userInfo = await gscService.getUserInfo(tokens.id_token);
      email = userInfo.email;
      profilePicture = userInfo.picture;
    }

    // Save tokens
    await gscService.saveUserTokens(
      stateData.userId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expiry_date,
      email,
      profilePicture
    );

    // Fetch and save sites
    await gscService.getSitesForUser(stateData.userId);

    return res.redirect('/dashboard/search-console?success=true');
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return res.redirect('/dashboard/search-console?error=auth_failed');
  }
});

/**
 * Check if user is connected to GSC
 * GET /api/gsc/status
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    const isConnected = await gscService.isUserConnected(req.user.id);

    return ApiResponse.success(res, { isConnected }, 'Connection status retrieved');
  } catch (error) {
    console.error('Error checking connection status:', error);
    return ApiResponse.serverError(res, 'Failed to check connection status', 'GSC_STATUS_ERROR');
  }
});

/**
 * Disconnect from GSC
 * POST /api/gsc/disconnect
 */
router.post('/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    await gscService.disconnectUser(req.user.id);

    return ApiResponse.success(res, null, 'Successfully disconnected from Google Search Console');
  } catch (error) {
    console.error('Error disconnecting from GSC:', error);
    return ApiResponse.serverError(res, 'Failed to disconnect from Google Search Console', 'GSC_DISCONNECT_ERROR');
  }
});

/**
 * Get sites
 * GET /api/gsc/sites
 */
router.get('/sites', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    // Check if user is connected
    const isConnected = await gscService.isUserConnected(req.user.id);
    if (!isConnected) {
      return ApiResponse.badRequest(res, 'User is not connected to Google Search Console', 'GSC_NOT_CONNECTED');
    }

    const sites = await gscService.getSitesForUser(req.user.id);

    return ApiResponse.success(res, { sites }, 'Sites retrieved successfully');
  } catch (error) {
    console.error('Error getting sites:', error);
    return ApiResponse.serverError(res, 'Failed to retrieve sites', 'GSC_SITES_ERROR');
  }
});

/**
 * Set default site
 * POST /api/gsc/sites/default
 */
router.post('/sites/default', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    const { siteId } = req.body;

    if (!siteId) {
      return ApiResponse.badRequest(res, 'Site ID is required', 'MISSING_SITE_ID');
    }

    await gscService.setDefaultSite(req.user.id, siteId);

    return ApiResponse.success(res, null, 'Default site set successfully');
  } catch (error) {
    console.error('Error setting default site:', error);
    return ApiResponse.serverError(res, 'Failed to set default site', 'GSC_DEFAULT_SITE_ERROR');
  }
});

/**
 * Get search performance data
 * GET /api/gsc/performance
 */
router.get('/performance', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    // Check if user is connected
    const isConnected = await gscService.isUserConnected(req.user.id);
    if (!isConnected) {
      return ApiResponse.badRequest(res, 'User is not connected to Google Search Console', 'GSC_NOT_CONNECTED');
    }

    const { siteId, startDate, endDate, dimensions, rowLimit } = req.query;

    const performanceData = await gscService.getSearchPerformance(
      req.user.id,
      siteId ? parseInt(siteId as string) : undefined,
      startDate as string,
      endDate as string,
      dimensions ? (dimensions as string).split(',') : undefined,
      rowLimit ? parseInt(rowLimit as string) : undefined
    );

    return ApiResponse.success(res, performanceData, 'Performance data retrieved successfully');
  } catch (error) {
    console.error('Error getting performance data:', error);
    return ApiResponse.serverError(res, 'Failed to retrieve performance data', 'GSC_PERFORMANCE_ERROR');
  }
});

/**
 * Get top keywords
 * GET /api/gsc/keywords
 */
router.get('/keywords', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    // Check if user is connected
    const isConnected = await gscService.isUserConnected(req.user.id);
    if (!isConnected) {
      return ApiResponse.badRequest(res, 'User is not connected to Google Search Console', 'GSC_NOT_CONNECTED');
    }

    const { siteId, startDate, endDate, limit } = req.query;

    const keywords = await gscService.getTopKeywords(
      req.user.id,
      siteId ? parseInt(siteId as string) : undefined,
      startDate as string,
      endDate as string,
      limit ? parseInt(limit as string) : undefined
    );

    return ApiResponse.success(res, { keywords }, 'Keywords retrieved successfully');
  } catch (error) {
    console.error('Error getting keywords:', error);
    return ApiResponse.serverError(res, 'Failed to retrieve keywords', 'GSC_KEYWORDS_ERROR');
  }
});

/**
 * Get top pages
 * GET /api/gsc/pages
 */
router.get('/pages', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    // Check if user is connected
    const isConnected = await gscService.isUserConnected(req.user.id);
    if (!isConnected) {
      return ApiResponse.badRequest(res, 'User is not connected to Google Search Console', 'GSC_NOT_CONNECTED');
    }

    const { siteId, startDate, endDate, limit } = req.query;

    const pages = await gscService.getTopPages(
      req.user.id,
      siteId ? parseInt(siteId as string) : undefined,
      startDate as string,
      endDate as string,
      limit ? parseInt(limit as string) : undefined
    );

    return ApiResponse.success(res, { pages }, 'Pages retrieved successfully');
  } catch (error) {
    console.error('Error getting pages:', error);
    return ApiResponse.serverError(res, 'Failed to retrieve pages', 'GSC_PAGES_ERROR');
  }
});

export default router;

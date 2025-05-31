import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { gscService } from '../services/gsc.service';
import ApiResponse from '../lib/api-response';

const router = Router();

/**
 * Get Google authorization URL
 * GET /api/gsc-direct/auth
 */
router.get('/auth', async (req: Request, res: Response) => {
  try {
    // For testing purposes, use a test user ID if not authenticated
    const userId = req.user?.id || 1; // Use user ID 1 for testing

    console.log('Generating auth URL for user:', userId);
    const authUrl = gscService.generateAuthUrl(userId);
    console.log('Generated auth URL:', authUrl);

    return ApiResponse.success(res, { authUrl });
  } catch (error) {
    console.error('Error generating Google authorization URL:', error);
    return ApiResponse.serverError(res, 'Failed to generate Google authorization URL', 'GSC_AUTH_ERROR');
  }
});

/**
 * Check if user is connected to Google Search Console
 * GET /api/gsc-direct/status
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    console.log('Checking GSC connection status for user:', req.user.id);
    const isConnected = await gscService.isUserConnected(req.user.id);
    console.log('GSC connection status:', isConnected);

    let defaultSite = null;
    if (isConnected) {
      defaultSite = await gscService.getDefaultSite(req.user.id);
    }

    return ApiResponse.success(res, { isConnected, defaultSite });
  } catch (error) {
    console.error('Error checking GSC connection status:', error);
    return ApiResponse.serverError(res, 'Failed to check GSC connection status', 'GSC_STATUS_ERROR');
  }
});

/**
 * Handle Google OAuth callback
 * GET /api/gsc-direct/callback
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return ApiResponse.badRequest(res, 'Missing required parameters', 'GSC_CALLBACK_ERROR');
    }

    const userId = parseInt(state as string, 10);
    if (isNaN(userId)) {
      return ApiResponse.badRequest(res, 'Invalid state parameter', 'GSC_CALLBACK_ERROR');
    }

    console.log('Processing GSC callback for user:', userId);
    const tokens = await gscService.getTokensFromCode(code as string);
    const userInfo = await gscService.getUserInfo(tokens.access_token);

    await gscService.saveUserTokens(userId, tokens, userInfo);

    // Redirect to the search console page
    res.redirect('/dashboard/search-console');
  } catch (error) {
    console.error('Error processing Google OAuth callback:', error);
    res.redirect('/dashboard/search-console?error=callback_failed');
  }
});

/**
 * Get user's Google Search Console sites
 * GET /api/gsc-direct/sites
 */
router.get('/sites', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    console.log('Getting GSC sites for user:', req.user.id);
    const sites = await gscService.getSitesForUser(req.user.id);
    console.log('Found GSC sites:', sites.length);

    return ApiResponse.success(res, { sites });
  } catch (error) {
    console.error('Error getting GSC sites:', error);
    return ApiResponse.serverError(res, 'Failed to get GSC sites', 'GSC_SITES_ERROR');
  }
});

/**
 * Set default Google Search Console site
 * POST /api/gsc-direct/sites/default
 */
router.post('/sites/default', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    const { siteId, siteUrl } = req.body;
    if (!siteId && !siteUrl) {
      return ApiResponse.badRequest(res, 'Missing site ID or URL', 'GSC_DEFAULT_SITE_ERROR');
    }

    console.log('Setting default GSC site for user:', req.user.id, 'SiteId:', siteId, 'SiteUrl:', siteUrl);
    await gscService.setDefaultSite(req.user.id, siteId, siteUrl);

    return ApiResponse.success(res, { success: true });
  } catch (error) {
    console.error('Error setting default GSC site:', error);
    return ApiResponse.serverError(res, 'Failed to set default GSC site', 'GSC_DEFAULT_SITE_ERROR');
  }
});

/**
 * Get search performance data
 * GET /api/gsc-direct/performance
 */
router.get('/performance', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    const { startDate, endDate } = req.query;

    console.log('Getting GSC performance data for user:', req.user.id);
    const data = await gscService.getSearchPerformance(
      req.user.id,
      startDate as string,
      endDate as string
    );

    return ApiResponse.success(res, { data });
  } catch (error) {
    console.error('Error getting GSC performance data:', error);
    return ApiResponse.serverError(res, 'Failed to get GSC performance data', 'GSC_PERFORMANCE_ERROR');
  }
});

/**
 * Get top keywords
 * GET /api/gsc-direct/keywords
 */
router.get('/keywords', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    const { startDate, endDate, limit } = req.query;

    console.log('Getting GSC top keywords for user:', req.user.id);
    const keywords = await gscService.getTopKeywords(
      req.user.id,
      startDate as string,
      endDate as string,
      limit ? parseInt(limit as string, 10) : undefined
    );

    return ApiResponse.success(res, { keywords });
  } catch (error) {
    console.error('Error getting GSC top keywords:', error);
    return ApiResponse.serverError(res, 'Failed to get GSC top keywords', 'GSC_KEYWORDS_ERROR');
  }
});

/**
 * Get top pages
 * GET /api/gsc-direct/pages
 */
router.get('/pages', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    const { startDate, endDate, limit } = req.query;

    console.log('Getting GSC top pages for user:', req.user.id);
    const pages = await gscService.getTopPages(
      req.user.id,
      startDate as string,
      endDate as string,
      limit ? parseInt(limit as string, 10) : undefined
    );

    return ApiResponse.success(res, { pages });
  } catch (error) {
    console.error('Error getting GSC top pages:', error);
    return ApiResponse.serverError(res, 'Failed to get GSC top pages', 'GSC_PAGES_ERROR');
  }
});

/**
 * Disconnect user from Google Search Console
 * POST /api/gsc-direct/disconnect
 */
router.post('/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    console.log('Disconnecting user from GSC:', req.user.id);
    await gscService.disconnectUser(req.user.id);

    return ApiResponse.success(res, { success: true });
  } catch (error) {
    console.error('Error disconnecting user from GSC:', error);
    return ApiResponse.serverError(res, 'Failed to disconnect from GSC', 'GSC_DISCONNECT_ERROR');
  }
});

export default router;

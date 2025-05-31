import express from 'express';
import type { Request, Response } from 'express';
import { gscService } from './services/gsc.service';
import config from './config';

const router = express.Router();

/**
 * Get GSC connection status
 * GET /api/gsc/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get user ID from session or use default for testing
    const userId = req.user?.id || 1; // Use user ID from session or default to 1 for testing

    console.log('Checking GSC connection status for user:', userId);
    const isConnected = await gscService.isUserConnected(userId);

    let sites = [];
    if (isConnected) {
      try {
        sites = await gscService.getSitesForUser(userId);
      } catch (siteError) {
        console.error('Error fetching GSC sites:', siteError);
        // Continue with empty sites array
      }
    }

    return res.json({
      isConnected,
      sites: sites || []
    });
  } catch (error) {
    console.error('Error checking GSC connection status:', error);
    // Return a successful response with isConnected: false instead of an error
    return res.json({
      isConnected: false,
      sites: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate auth URL
 * GET /api/gsc/auth
 */
router.get('/auth', (req: Request, res: Response) => {
  try {
    // Get user ID from session or use default for testing
    const userId = req.user?.id || 1; // Use user ID from session or default to 1 for testing

    console.log('Generating auth URL for user:', userId);
    const authUrl = gscService.generateAuthUrl(userId);
    console.log('Generated auth URL:', authUrl);

    return res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Google authorization URL:', error);
    return res.status(500).json({
      error: 'Failed to generate Google authorization URL',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'AUTH_URL_ERROR'
    });
  }
});

/**
 * Handle OAuth callback
 * GET /api/gsc/callback
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    console.log('Callback received with code:', code);
    console.log('Callback received with state:', state);

    if (!code || !state) {
      console.error('Missing code or state parameter');
      return res.redirect(`${config.clientUrl}/dashboard/search-console?error=missing_params`);
    }

    // Parse the state parameter
    let stateUserId;
    try {
      // Try to parse as JSON
      const stateObj = JSON.parse(state as string);
      stateUserId = stateObj.userId;
    } catch (e) {
      // If JSON parsing fails, try base64 decoding
      try {
        const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
        stateUserId = stateData.userId;
      } catch (e2) {
        console.error('Failed to parse state parameter:', e2);
        return res.redirect(`${config.clientUrl}/dashboard/search-console?error=invalid_state`);
      }
    }

    // Use the user ID from the session if available, otherwise use the one from the state
    const userId = req.user?.id || stateUserId;

    if (!userId) {
      console.error('No userId found in state parameter or session');
      return res.redirect(`${config.clientUrl}/dashboard/search-console?error=invalid_state`);
    }

    console.log('Processing callback for user:', userId);

    // Exchange code for tokens
    try {
      const tokens = await gscService.getTokensFromCode(code as string);
      console.log('Received tokens:', tokens ? 'tokens received' : 'no tokens');

      // Get user info
      let email = 'unknown@example.com';
      let profilePicture = '';

      if (tokens.access_token) {
        try {
          const userInfo = await gscService.getUserInfo(tokens.access_token);
          email = userInfo.email;
          profilePicture = userInfo.picture;
          console.log('User info retrieved:', email);
        } catch (userInfoError) {
          console.error('Error getting user info:', userInfoError);
          // Continue with default values
        }
      }

      // Save tokens
      await gscService.saveUserTokens(
        userId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expiry_date,
        email,
        profilePicture
      );
      console.log('Tokens saved for user:', userId);

      // Fetch and save sites
      await gscService.getSitesForUser(userId);
      console.log('Sites fetched and saved for user:', userId);

      return res.redirect(`${config.clientUrl}/dashboard/search-console?success=true`);
    } catch (tokenError) {
      console.error('Error exchanging code for tokens:', tokenError);
      return res.redirect(`${config.clientUrl}/dashboard/search-console?error=invalid_code`);
    }
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return res.redirect(`${config.clientUrl}/dashboard/search-console?error=auth_failed`);
  }
});

/**
 * Get GSC sites
 * GET /api/gsc/sites
 */
router.get('/sites', async (req: Request, res: Response) => {
  try {
    // Get user ID from session or use default for testing
    const userId = req.user?.id || 1; // Use user ID from session or default to 1 for testing

    const sites = await gscService.getSitesForUser(userId);
    return res.json({ sites: sites || [] });
  } catch (error) {
    console.error('Error fetching GSC sites:', error);
    return res.status(500).json({
      error: 'Failed to fetch GSC sites',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'GSC_SITES_ERROR'
    });
  }
});

/**
 * Set default GSC site
 * POST /api/gsc/sites/default
 */
router.post('/sites/default', async (req: Request, res: Response) => {
  try {
    // Get user ID from session or use default for testing
    const userId = req.user?.id || 1; // Use user ID from session or default to 1 for testing
    const { siteId } = req.body;

    if (!siteId) {
      return res.status(400).json({
        error: 'Site ID is required',
        code: 'MISSING_SITE_ID'
      });
    }

    await gscService.setDefaultSite(userId, siteId);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error setting default site:', error);
    return res.status(500).json({
      error: 'Failed to set default site',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'DEFAULT_SITE_ERROR'
    });
  }
});

/**
 * Get GSC performance data
 * GET /api/gsc/performance
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    // Get user ID from session or use default for testing
    const userId = req.user?.id || 1; // Use user ID from session or default to 1 for testing

    const { siteId, startDate, endDate, dimensions, rowLimit } = req.query;

    // Get default site if siteId is not provided
    let siteUrl;
    if (siteId) {
      const site = await gscService.getSiteById(Number(siteId));
      if (site) {
        siteUrl = site.siteUrl;
      }
    } else {
      const defaultSite = await gscService.getDefaultSite(userId);
      if (defaultSite) {
        siteUrl = defaultSite.siteUrl;
      }
    }

    if (!siteUrl) {
      return res.status(400).json({
        error: 'No site found',
        code: 'NO_SITE_FOUND'
      });
    }

    // Parse dimensions
    const dimensionsArray = dimensions ? (dimensions as string).split(',') : ['date'];

    // Get performance data
    const data = await gscService.getSearchAnalyticsData(
      userId,
      siteUrl,
      startDate as string || '2023-01-01',
      endDate as string || new Date().toISOString().split('T')[0],
      dimensionsArray,
      Number(rowLimit) || 1000
    );

    return res.json(data);
  } catch (error) {
    console.error('Error fetching GSC performance data:', error);
    return res.status(500).json({
      error: 'Failed to fetch GSC performance data',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'PERFORMANCE_DATA_ERROR'
    });
  }
});

/**
 * Get GSC keywords
 * GET /api/gsc/keywords
 */
router.get('/keywords', async (req: Request, res: Response) => {
  try {
    // Get user ID from session or use default for testing
    const userId = req.user?.id || 1; // Use user ID from session or default to 1 for testing

    const { siteId, startDate, endDate, limit } = req.query;

    // Get default site if siteId is not provided
    let siteUrl;
    if (siteId) {
      const site = await gscService.getSiteById(Number(siteId));
      if (site) {
        siteUrl = site.siteUrl;
      }
    } else {
      const defaultSite = await gscService.getDefaultSite(userId);
      if (defaultSite) {
        siteUrl = defaultSite.siteUrl;
      }
    }

    if (!siteUrl) {
      return res.status(400).json({
        error: 'No site found',
        code: 'NO_SITE_FOUND'
      });
    }

    // Get keywords data
    const data = await gscService.getSearchAnalyticsData(
      userId,
      siteUrl,
      startDate as string || '2023-01-01',
      endDate as string || new Date().toISOString().split('T')[0],
      ['query'],
      Number(limit) || 100
    );

    return res.json({ keywords: data.rows || [] });
  } catch (error) {
    console.error('Error fetching GSC keywords:', error);
    return res.status(500).json({
      error: 'Failed to fetch GSC keywords',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'KEYWORDS_ERROR'
    });
  }
});

/**
 * Get GSC pages
 * GET /api/gsc/pages
 */
router.get('/pages', async (req: Request, res: Response) => {
  try {
    // Get user ID from session or use default for testing
    const userId = req.user?.id || 1; // Use user ID from session or default to 1 for testing

    const { siteId, startDate, endDate, limit } = req.query;

    // Get default site if siteId is not provided
    let siteUrl;
    if (siteId) {
      const site = await gscService.getSiteById(Number(siteId));
      if (site) {
        siteUrl = site.siteUrl;
      }
    } else {
      const defaultSite = await gscService.getDefaultSite(userId);
      if (defaultSite) {
        siteUrl = defaultSite.siteUrl;
      }
    }

    if (!siteUrl) {
      return res.status(400).json({
        error: 'No site found',
        code: 'NO_SITE_FOUND'
      });
    }

    // Get pages data
    const data = await gscService.getSearchAnalyticsData(
      userId,
      siteUrl,
      startDate as string || '2023-01-01',
      endDate as string || new Date().toISOString().split('T')[0],
      ['page'],
      Number(limit) || 100
    );

    return res.json({ pages: data.rows || [] });
  } catch (error) {
    console.error('Error fetching GSC pages:', error);
    return res.status(500).json({
      error: 'Failed to fetch GSC pages',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'PAGES_ERROR'
    });
  }
});

export default router;

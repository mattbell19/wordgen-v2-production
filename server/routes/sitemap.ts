import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/authMiddleware';
import { internalLinkService } from '../services/internal-link.service';
import ApiResponse from '../lib/api-response';

const router = Router();

// Add sitemap URL for a user
router.post('/add', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'UNAUTHORIZED');
    }

    const { sitemapUrl } = req.body;
    
    if (!sitemapUrl) {
      return ApiResponse.badRequest(res, 'Sitemap URL is required', 'MISSING_SITEMAP_URL');
    }
    
    // Process and store the sitemap
    const links = await internalLinkService.storeUserLinks(req.user.id, sitemapUrl);
    
    return ApiResponse.success(res, { 
      linksFound: links.length,
      sitemapUrl
    }, 'Sitemap processed successfully');
    
  } catch (error: any) {
    console.error('Error processing sitemap:', error);
    return ApiResponse.serverError(res, error.message || 'Failed to process sitemap', 'SITEMAP_PROCESSING_ERROR');
  }
});

// Get stored internal links for a user
router.get('/links', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'UNAUTHORIZED');
    }
    
    // Find links for this user (using an empty keyword to get all links)
    const links = await internalLinkService.findRelevantLinks(req.user.id, '', 100);
    
    return ApiResponse.success(res, { links }, 'Internal links retrieved successfully');
    
  } catch (error: any) {
    console.error('Error retrieving internal links:', error);
    return ApiResponse.serverError(res, error.message || 'Failed to retrieve internal links', 'LINKS_RETRIEVAL_ERROR');
  }
});

export const sitemapRoutes = router;

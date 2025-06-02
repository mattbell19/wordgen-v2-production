import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { researchKeywords } from '../services/keyword.service';
import { generateArticle } from '../services/article.service';
import { generateWords } from '../services/word.service';
import type { ArticleCreationParams } from '../services/article.service';
import type { WordGenerationParams } from '../services/word.service';
import { requireAuth } from '../middlewares/authMiddleware';
import ApiResponse from '../lib/api-response';
// import { subscriptionMiddleware } from '../middleware/subscription';

// Initialize router
const router = Router();

// Debug endpoint to check authentication
router.get('/debug-auth', (req: Request, res: Response) => {
  console.log('[Debug] Auth check:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    userId: req.user?.id,
    sessionID: req.sessionID,
    cookies: req.headers.cookie
  });

  return ApiResponse.success(res, {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    userId: req.user?.id,
    sessionID: req.sessionID
  }, 'Authentication debug information');
});

// Article generation route with improved error handling
router.post('/article/generate',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        console.log('[Article Generation] Unauthorized request');
        return ApiResponse.unauthorized(res, 'Authentication required', 'UNAUTHORIZED');
      }

      const requestBody = req.body as ArticleCreationParams;
      console.log('[Article Generation] Request body:', JSON.stringify(requestBody, null, 2));

      // Ensure we have either keyword or title
      if (!requestBody.keyword && !requestBody.title) {
        console.log('[Article Generation] Missing keyword in request');
        return ApiResponse.badRequest(res, 'Keyword or title is required', 'MISSING_KEYWORD');
      }

      // If keyword is not set but title is, use title as keyword
      if (!requestBody.keyword && requestBody.title) {
        requestBody.keyword = requestBody.title;
      }

      // Validate word count
      if (!requestBody.wordCount || requestBody.wordCount < 100 || requestBody.wordCount > 5000) {
        console.log('[Article Generation] Invalid word count:', requestBody.wordCount);
        return ApiResponse.badRequest(res, 'Word count must be between 100 and 5000', 'INVALID_WORD_COUNT');
      }

      // Validate tone
      if (!requestBody.tone) {
        requestBody.tone = 'professional'; // Default tone
      }

      // Validate and set defaults for additional fields
      if (!requestBody.industry) {
        requestBody.industry = 'marketing'; // Default industry
      }

      if (!requestBody.targetAudience) {
        requestBody.targetAudience = requestBody.tone; // Use tone as default target audience
      }

      if (!requestBody.contentType) {
        requestBody.contentType = 'guide'; // Default content type
      }

      console.log('[Article Generation] Starting generation for user:', req.user.id, 'keyword:', requestBody.keyword);
      console.log('[Article Generation] Full request parameters:', {
        keyword: requestBody.keyword,
        wordCount: requestBody.wordCount,
        tone: requestBody.tone,
        industry: requestBody.industry,
        targetAudience: requestBody.targetAudience,
        contentType: requestBody.contentType,
        enableInternalLinking: requestBody.enableInternalLinking,
        enableExternalLinking: requestBody.enableExternalLinking
      });

      try {
        // Add user ID from authentication
        requestBody.userId = req.user.id;

        // Use a timeout wrapper to prevent Heroku timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Generation timeout')), 25000); // 25 second timeout
        });

        const generationPromise = generateArticle(requestBody);

        // Race between generation and timeout
        const article = await Promise.race([generationPromise, timeoutPromise]);

        console.log('[Article Generation] Successfully generated article:', {
          wordCount: article.wordCount,
          readingTime: article.readingTime
        });

        return ApiResponse.success(res, article, 'Article generated successfully');

      } catch (error: any) {
        console.error('[Article Generation] Generation error:', {
          message: error.message,
          stack: error.stack,
          userId: req.user.id,
          keyword: requestBody.keyword
        });

        // Handle specific API errors
        if (error.status === 401 || error.message?.includes('API key') || error.message?.includes('authentication')) {
          return ApiResponse.serverError(res, 'There was an issue with the AI service configuration. Please try again later.', 'API_CONFIGURATION_ERROR');
        }

        if (error.status === 400) {
          return ApiResponse.badRequest(res, 'The AI service encountered an error. Please try again with different parameters.', 'INVALID_REQUEST');
        }

        if (error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('quota')) {
          return ApiResponse.tooManyRequests(res, 'API rate limit exceeded. Please try again later.', 'RATE_LIMIT_EXCEEDED');
        }

        if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT') {
          return ApiResponse.serverError(res, 'Article generation is taking longer than expected. Please try again with a shorter word count.', 'TIMEOUT_ERROR');
        }

        return ApiResponse.serverError(res, 'Failed to generate article. Please try again.', 'GENERATION_FAILED');
      }

    } catch (error: any) {
      console.error('[Article Generation] Request error:', error);
      return ApiResponse.serverError(res, error.message || 'An unexpected error occurred', 'REQUEST_PROCESSING_ERROR');
    }
});

// Add word generation route
router.post('/words/generate',
  (req: Request, res: Response, next: NextFunction) => {
    console.log('[Word Generation] Auth check:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      userId: req.user?.id,
      sessionID: req.sessionID,
      cookies: req.headers.cookie
    });
    next();
  },
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        console.log('[Word Generation] Unauthorized request');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const requestBody = req.body as WordGenerationParams;

      // Ensure we have a keyword
      if (!requestBody.keyword) {
        console.log('[Word Generation] Missing keyword in request');
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Keyword is required'
        });
      }

      console.log('[Word Generation] Starting generation for user:', req.user.id, 'keyword:', requestBody.keyword);

      try {
        // Add user ID from authentication
        requestBody.userId = req.user.id;

        // Generate words
        const result = await generateWords(requestBody);

        console.log('[Word Generation] Successfully generated words:', {
          count: result.words.length
        });

        return res.json({
          success: true,
          data: result
        });

      } catch (error: any) {
        console.error('[Word Generation] Generation error:', {
          message: error.message,
          stack: error.stack,
          userId: req.user.id,
          keyword: requestBody.keyword
        });

        // Handle specific API errors
        if (error.status === 401) {
          return res.status(500).json({
            success: false,
            error: 'AI Service Configuration Error',
            message: 'There was an issue with the AI service configuration. Please try again later.'
          });
        }

        if (error.status === 400) {
          return res.status(500).json({
            success: false,
            error: 'AI Service Error',
            message: 'The AI service encountered an error. Please try again with different parameters.'
          });
        }

        return res.status(500).json({
          success: false,
          error: 'Failed to generate words',
          message: error.message || 'An unexpected error occurred'
        });
      }

    } catch (error: any) {
      console.error('[Word Generation] Request error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process request',
        message: error.message || 'An unexpected error occurred'
      });
    }
});

export const aiRoutes = router;
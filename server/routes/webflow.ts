import { Router } from 'express';
import { WebflowService } from '../services/webflow.service';
import { requireAuth } from '../auth';

const router = Router();

router.post('/connect', requireAuth, async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (typeof apiKey !== 'string' || apiKey.length < 10) {
      return res.status(400).json({
        error: 'Invalid API key format'
      });
    }
    console.log('Connecting to Webflow with API key:', apiKey.substring(0, 10) + '...');

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'API key is required' 
      });
    }

    const webflow = new WebflowService(apiKey);
    const sites = await webflow.getSites();

    res.json({ success: true, sites });
  } catch (error: any) {
    console.error('Webflow connection error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to connect to Webflow' 
    });
  }
});

router.get('/collections/:apiKey/:siteId', requireAuth, async (req, res) => {
  try {
    const { apiKey, siteId } = req.params;
    const webflow = new WebflowService(apiKey);
    const collections = await webflow.getCollections(siteId);
    res.json(collections);
  } catch (error: any) {
    res.status(400).json({ 
      error: error.message || 'Failed to fetch collections' 
    });
  }
});

router.post('/publish', requireAuth, async (req, res) => {
  try {
    const { apiKey, collectionId, articleData } = req.body;

    if (!apiKey || !collectionId || !articleData) {
      return res.status(400).json({
        error: 'API key, collection ID, and article data are required'
      });
    }

    const webflow = new WebflowService(apiKey);
    const result = await webflow.createItem(collectionId, articleData);

    res.json({
      success: true,
      item: result,
      message: 'Article published to Webflow as draft'
    });
  } catch (error: any) {
    res.status(400).json({ 
      error: error.message || 'Failed to publish to Webflow' 
    });
  }
});

export default router;
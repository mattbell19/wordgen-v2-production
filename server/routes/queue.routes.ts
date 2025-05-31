import { Router } from 'express';
import { QueueManagerService } from '../services/queue-manager.service';
import { validateRequest } from '../middleware/validate-request';
import { z } from 'zod';

const router = Router();
const queueManager = QueueManagerService.getInstance();

// Validation schemas
const articleSettingsSchema = z.object({
  wordCount: z.number().min(100).max(5000),
  tone: z.string(),
  callToAction: z.string().optional(),
});

const createBatchSchema = z.object({
  items: z.array(z.object({
    keyword: z.string().min(1),
    settings: articleSettingsSchema,
  })).min(1).max(50),
  batchName: z.string().optional(),
});

// Create a new batch of articles
router.post('/bulk', validateRequest(createBatchSchema), async (req, res) => {
  try {
    const { items, batchName } = req.body;
    const userId = req.user.id;

    const queue = await queueManager.createBatch(userId, items, batchName);
    res.status(201).json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific queue
router.get('/:id', async (req, res) => {
  try {
    const queue = await queueManager.getQueue(req.params.id);
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    
    // Check if the queue belongs to the user
    if (queue.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all queues for the user
router.get('/', async (req, res) => {
  try {
    const queues = await queueManager.getUserQueues(req.user.id);
    res.json(queues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

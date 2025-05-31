import { Router } from 'express';
import { db } from '../../db';
import { teams } from '../../db/schema';
import { teamBillingService } from '../../services/team-billing.service';

const router = Router();

// Get team subscription status
router.get('/:teamId/subscription', async (req, res) => {
  try {
    const { teamId } = req.params;
    const status = await teamBillingService.getSubscriptionStatus(teamId);
    res.json({ status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update subscription
router.post('/:teamId/subscription', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { planType } = req.body;
    const subscription = await teamBillingService.createSubscription(teamId, planType);
    res.json(subscription);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Record usage
router.post('/:teamId/usage', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { usageType, quantity } = req.body;
    const usage = await teamBillingService.recordUsage(teamId, usageType, quantity);
    res.json(usage);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get usage
router.get('/:teamId/usage', async (req, res) => {
  try {
    const { teamId } = req.params;
    const usage = await teamBillingService.getUsage(teamId);
    res.json(usage);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Set usage limit
router.post('/:teamId/limits', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { limitType, maxQuantity } = req.body;
    const limit = await teamBillingService.setUsageLimit(teamId, limitType, maxQuantity);
    res.json(limit);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get usage limits
router.get('/:teamId/limits', async (req, res) => {
  try {
    const { teamId } = req.params;
    const limits = await teamBillingService.getUsageLimits(teamId);
    res.json(limits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add billing contact
router.post('/:teamId/contacts', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, email, phone } = req.body;
    const contact = await teamBillingService.addBillingContact(teamId, name, email, phone);
    res.json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get billing contacts
router.get('/:teamId/contacts', async (req, res) => {
  try {
    const { teamId } = req.params;
    const contacts = await teamBillingService.getBillingContacts(teamId);
    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

import { Router } from 'express';
import { teamRoutes } from '../teams';
import switchRouter from './switch';
import inviteRouter from './invite';
import membersRouter from './members';
import invitesRouter from './invites';
import activeRouter from './active';
import billingRouter from './billing';
import rolesRouter from './roles';

const router = Router();

// Mount the main team routes
router.use('/', teamRoutes);

// Mount the team switching routes
router.use('/switch', switchRouter);

// Mount the team invitation routes
router.use('/:teamId/invite', inviteRouter);

// Mount the team members routes
router.use('/:teamId/members', membersRouter);

// Mount the team invites management routes
router.use('/invites', invitesRouter);

// Mount the active team route
router.use('/active', activeRouter);

// Mount the team billing routes
router.use('/:teamId/billing', billingRouter);
router.use('/billing/plans', billingRouter);

// Mount the team roles routes
router.use('/:teamId/roles', rolesRouter);

export default router;

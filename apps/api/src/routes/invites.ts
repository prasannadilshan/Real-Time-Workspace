import { Router } from 'express';
import { sendInvite, getMyInvites, acceptInvite, declineInvite } from '../controllers/InviteController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/documents/:documentId', sendInvite);
router.get('/', getMyInvites);
router.post('/:inviteId/accept', acceptInvite);
router.post('/:inviteId/decline', declineInvite);

export default router;

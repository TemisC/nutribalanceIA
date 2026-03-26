import express from 'express';
import * as messageController from '../controllers/messageController';

const router = express.Router();

router.post('/', messageController.sendMessage);
router.get('/:userId', messageController.getInbox);
router.patch('/:id/read', messageController.markRead);

export default router;

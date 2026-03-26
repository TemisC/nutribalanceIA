
import express from 'express';
import { getCommunityFeed, createPost, toggleLike, addComment } from '../controllers/communityController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All routes protected
router.use(protect);

router.get('/', getCommunityFeed);
router.post('/', createPost);
router.post('/:postId/like', toggleLike);
router.post('/:postId/comments', addComment);

import { updatePostStatus } from '../controllers/communityController';
router.patch('/:postId/status', updatePostStatus);

export default router;

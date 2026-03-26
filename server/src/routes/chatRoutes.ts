import express from 'express';
import { handleChatMessage, handleFoodAnalysis, handleMealPlan } from '../controllers/chatController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/message', protect, handleChatMessage);
router.post('/food-analysis', protect, handleFoodAnalysis);
router.post('/meal-plan', protect, handleMealPlan);

export default router;

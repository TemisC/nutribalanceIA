import express from 'express';
import { saveMealPlan, getMealHistory } from '../controllers/mealPlanController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All routes protected
router.use(protect);

router.post('/', saveMealPlan);
router.get('/', getMealHistory);

export default router;

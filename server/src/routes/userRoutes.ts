import express from 'express';
import { getUserProfile, updateBiometrics, saveUserMetrics, updateBasicProfile, getUserProgress, logUserProgress, getCoachClients, deleteUserProfile, getAllUsers, toggleUserStatus, toggleBulkUserStatus, getCommunityInfo, getSuperAdminAnalytics } from '../controllers/userController';
// We should add auth middleware here later to protect routes

const router = express.Router();

router.get('/community-stats', getCommunityInfo); // Dynamic stats
router.get('/analytics', getSuperAdminAnalytics); // New SuperAdmin Analytics (Must be before /:id)
router.get('/', getAllUsers);
router.get('/:id', getUserProfile);
router.put('/:id', updateBasicProfile); // Handle general updates
router.put('/:id/biometrics', updateBiometrics);
router.delete('/:id', deleteUserProfile);
router.post('/:id/metrics', saveUserMetrics);
router.patch('/:id/status', toggleUserStatus); // Admin Only (logic inside controller or middleware)

router.get('/:id/progress', getUserProgress);
router.post('/:id/progress', logUserProgress);

import { protect, checkActive } from '../middleware/authMiddleware';

// Coach Routes
router.get('/:id/clients', getCoachClients);
router.patch('/coach/:id/status', toggleBulkUserStatus); // Bulk Toggle

// SuperAdmin Token Management
import { addTokens } from '../controllers/userController';
router.post('/:id/tokens', addTokens);

// Meal History
import { saveMeal, getMeals, deleteUserMeal } from '../controllers/userController';
router.post('/:id/meals', saveMeal);
router.get('/:id/meals', getMeals);
router.delete('/:id/meals/:mealId', deleteUserMeal);

export default router;

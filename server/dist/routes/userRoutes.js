"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
// We should add auth middleware here later to protect routes
const router = express_1.default.Router();
router.get('/community-stats', userController_1.getCommunityInfo); // Dynamic stats
router.get('/analytics', userController_1.getSuperAdminAnalytics); // New SuperAdmin Analytics (Must be before /:id)
router.get('/', userController_1.getAllUsers);
router.get('/:id', userController_1.getUserProfile);
router.put('/:id', userController_1.updateBasicProfile); // Handle general updates
router.put('/:id/biometrics', userController_1.updateBiometrics);
router.delete('/:id', userController_1.deleteUserProfile);
router.post('/:id/metrics', userController_1.saveUserMetrics);
router.patch('/:id/status', userController_1.toggleUserStatus); // Admin Only (logic inside controller or middleware)
router.get('/:id/progress', userController_1.getUserProgress);
router.post('/:id/progress', userController_1.logUserProgress);
// Coach Routes
router.get('/:id/clients', userController_1.getCoachClients);
router.patch('/coach/:id/status', userController_1.toggleBulkUserStatus); // Bulk Toggle
// SuperAdmin Token Management
const userController_2 = require("../controllers/userController");
router.post('/:id/tokens', userController_2.addTokens);
// Meal History
const userController_3 = require("../controllers/userController");
router.post('/:id/meals', userController_3.saveMeal);
router.get('/:id/meals', userController_3.getMeals);
router.delete('/:id/meals/:mealId', userController_3.deleteUserMeal);
exports.default = router;

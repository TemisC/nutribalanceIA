"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mealPlanController_1 = require("../controllers/mealPlanController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// All routes protected
router.use(authMiddleware_1.protect);
router.post('/', mealPlanController_1.saveMealPlan);
router.get('/', mealPlanController_1.getMealHistory);
exports.default = router;

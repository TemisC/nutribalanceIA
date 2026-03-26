"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMealHistory = exports.saveMealPlan = void 0;
const mealPlanModel_1 = require("../models/mealPlanModel");
const uuid_1 = require("uuid");
const saveMealPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // From Auth Middleware
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { plan } = req.body;
        if (!plan) {
            return res.status(400).json({ message: 'Plan data is required' });
        }
        // Ensure plan has an ID, or generate one if strictly new (though frontend usually generates it)
        // We use the plan.id if provided to keep consistency or generate new if missing.
        const planId = plan.id || (0, uuid_1.v4)();
        // Construct DB Record
        const newRecord = {
            id: planId,
            user_id: userId,
            plan_data: plan // We save the whole object
        };
        yield mealPlanModel_1.MealPlanModel.create(newRecord);
        res.status(201).json({ message: 'Meal plan saved successfully', id: planId });
    }
    catch (error) {
        console.error('[MealPlanController] Save Error:', error);
        res.status(500).json({ message: 'Failed to save meal plan' });
    }
});
exports.saveMealPlan = saveMealPlan;
const getMealHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const plans = yield mealPlanModel_1.MealPlanModel.findByUserId(userId);
        // Transform slightly if needed, or return the raw plan_data array?
        // Frontend expects an array of WeeklyPlan objects.
        // Our DB stores them in `plan_data` column.
        // So we should map it back to just the plan objects, maybe injecting the `created_at`?
        // The WeeklyPlan type usually has an ID.
        // Let's return the full plan objects.
        const history = plans.map(p => (Object.assign(Object.assign({}, p.plan_data), { 
            // Ensure db-level ID and createdAt take precedence strictly speaking, 
            // but plan_data usually has them too. 
            // Let's ensure top-level properties are accurate.
            created_at: p.created_at })));
        res.json(history);
    }
    catch (error) {
        console.error('[MealPlanController] GetHistory Error:', error);
        res.status(500).json({ message: 'Failed to fetch meal history' });
    }
});
exports.getMealHistory = getMealHistory;

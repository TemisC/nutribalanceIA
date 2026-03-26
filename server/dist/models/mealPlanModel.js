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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MealPlanModel = void 0;
const db_1 = __importDefault(require("../config/db"));
exports.MealPlanModel = {
    // Save a new meal plan
    create: (mealPlan) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id, user_id, plan_data } = mealPlan;
            // Updated to match existing DB schema: plan_data_json and status
            const query = `
                INSERT INTO meal_plans (id, user_id, plan_data_json, status)
                VALUES (?, ?, ?, 'active')
            `;
            // MySQL2 driver requires JSON to be stringified if passed as object to a JSON column?
            // Actually, newer versions handle object -> JSON serialization automatically.
            // But to be safe and consistent with previous patterns, let's verify.
            // RowDataPacket handling usually wraps it. Let's send it stringified if in doubt, or object.
            // best practice with mysql2 is passing JSON.stringify generally for explicit control.
            yield db_1.default.execute(query, [id, user_id, JSON.stringify(plan_data)]);
            return true;
        }
        catch (error) {
            console.error('[MealPlanModel] Create Error:', error);
            throw error; // Let controller handle
        }
    }),
    // Get all plans for a user
    findByUserId: (userId) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const query = `
                SELECT * FROM meal_plans 
                WHERE user_id = ? 
                ORDER BY created_at DESC
            `;
            const [rows] = yield db_1.default.execute(query, [userId]);
            // Map rows and parse JSON
            return rows.map(row => ({
                id: row.id,
                user_id: row.user_id,
                // Handle case where plan_data comes back as string (common drivers) or already object
                // Adapting to 'plan_data_json' column name from DB
                plan_data: typeof (row.plan_data_json || row.plan_data) === 'string'
                    ? JSON.parse(row.plan_data_json || row.plan_data)
                    : (row.plan_data_json || row.plan_data),
                created_at: row.created_at
            }));
        }
        catch (error) {
            console.error('[MealPlanModel] FindByUserId Error:', error);
            return [];
        }
    })
};

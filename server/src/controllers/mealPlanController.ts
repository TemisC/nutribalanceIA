import { Request, Response } from 'express';
import { MealPlanModel, MealPlan } from '../models/mealPlanModel';
import { v4 as uuidv4 } from 'uuid';

export const saveMealPlan = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id; // From Auth Middleware
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { plan } = req.body;
        if (!plan) {
            return res.status(400).json({ message: 'Plan data is required' });
        }

        // Ensure plan has an ID, or generate one if strictly new (though frontend usually generates it)
        // We use the plan.id if provided to keep consistency or generate new if missing.
        const planId = plan.id || uuidv4();

        // Construct DB Record
        const newRecord: MealPlan = {
            id: planId,
            user_id: userId,
            plan_data: plan // We save the whole object
        };

        await MealPlanModel.create(newRecord);

        res.status(201).json({ message: 'Meal plan saved successfully', id: planId });
    } catch (error) {
        console.error('[MealPlanController] Save Error:', error);
        res.status(500).json({ message: 'Failed to save meal plan' });
    }
};

export const getMealHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const plans = await MealPlanModel.findByUserId(userId);

        // Transform slightly if needed, or return the raw plan_data array?
        // Frontend expects an array of WeeklyPlan objects.
        // Our DB stores them in `plan_data` column.
        // So we should map it back to just the plan objects, maybe injecting the `created_at`?
        // The WeeklyPlan type usually has an ID.
        // Let's return the full plan objects.

        const history = plans.map(p => ({
            ...p.plan_data,
            // Ensure db-level ID and createdAt take precedence strictly speaking, 
            // but plan_data usually has them too. 
            // Let's ensure top-level properties are accurate.
            created_at: p.created_at, // useful for sorting if plan_data.metadata.createdAt is wrong
        }));

        res.json(history);
    } catch (error) {
        console.error('[MealPlanController] GetHistory Error:', error);
        res.status(500).json({ message: 'Failed to fetch meal history' });
    }
};

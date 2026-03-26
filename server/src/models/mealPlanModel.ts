import supabase from '../config/db';

export interface MealPlan {
    id: string;
    user_id: string;
    plan_data: any;
    created_at?: Date;
}

export const MealPlanModel = {
    create: async (mealPlan: MealPlan): Promise<boolean> => {
        try {
            const { error } = await supabase.from('meal_plans').insert({
                id: mealPlan.id,
                user_id: mealPlan.user_id,
                plan_data_json: mealPlan.plan_data, // Supabase handles JSONB natively
                status: 'active',
            });
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[MealPlanModel] Create Error:', error);
            throw error;
        }
    },

    findByUserId: async (userId: string): Promise<MealPlan[]> => {
        try {
            const { data, error } = await supabase
                .from('meal_plans')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error || !data) return [];

            return (data as any[]).map(row => ({
                id: row.id,
                user_id: row.user_id,
                // JSONB columns come back as objects from Supabase — no JSON.parse needed
                plan_data: row.plan_data_json,
                created_at: row.created_at,
            }));
        } catch (error) {
            console.error('[MealPlanModel] FindByUserId Error:', error);
            return [];
        }
    },
};

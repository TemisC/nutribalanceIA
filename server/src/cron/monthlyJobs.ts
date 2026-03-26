import cron from 'node-cron';
import supabase from '../config/db';

/**
 * Monthly Job: Calculate Coach Commissions and Tiers
 * Runs at Midnight on the 1st of every month.
 */
export const startMonthlyJobs = () => {
    cron.schedule('0 0 1 * *', async () => {
        console.log('📅 [Monthly Job] Starting Commission & Tier Calculation...');
        await calculateCoachCommissions();
    });
};

export const calculateCoachCommissions = async () => {
    try {
        console.log('🔄 [Commission Job] Fetching active coaches...');

        // 1. Get all coaches
        const { data: coaches, error: coachError } = await supabase
            .from('users')
            .select('id, email, name, coach_tier')
            .eq('role', 'coach');

        if (coachError || !coaches) {
            console.error('❌ [Commission Job] Failed to load coaches:', coachError?.message);
            return;
        }

        console.log(`📊 [Commission Job] Processing ${coaches.length} coaches.`);

        for (const coach of coaches) {
            // 2. Count ACTIVE pro/pro_master clients for this coach
            const { count: clientCount } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('coach_id', coach.id)
                .eq('role', 'client')
                .in('plan_type', ['pro', 'pro_master']);

            const count = clientCount || 0;
            let newCommissionRate = 0.0;

            // 3. Apply Tier Rules
            if (count >= 50) {
                newCommissionRate = 0.50;
            } else if (count >= 30) {
                newCommissionRate = 0.30;
            } else {
                newCommissionRate = 0.0;
            }

            // 4. Update commission_rate
            const { error: updateError } = await supabase
                .from('users')
                .update({ commission_rate: newCommissionRate })
                .eq('id', coach.id);

            if (updateError) {
                console.error(`❌ [Commission Job] Failed to update coach ${coach.email}:`, updateError.message);
            } else {
                console.log(`✅ [Commission Job] Coach ${coach.email}: ${count} clients → ${newCommissionRate * 100}% commission.`);
            }
        }

        console.log('🏁 [Monthly Job] Commission Calculation Completed.');
    } catch (error) {
        console.error('❌ [Monthly Job] Failed:', error);
    }
};

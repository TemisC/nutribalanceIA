import { Router } from 'express';
import { calculateCoachCommissions } from '../cron/monthlyJobs';

const router = Router();

// Manually trigger Monthly Job
// Protect with a secret header or SuperAdmin role in future.
router.post('/trigger-monthly', async (req, res) => {
    try {
        console.log('manual-trigger: Starting Monthly Commission Job...');
        await calculateCoachCommissions();
        res.json({ message: 'Monthly Job Triggered Successfully' });
    } catch (error) {
        console.error('manual-trigger failed:', error);
        res.status(500).json({ error: 'Job Failed' });
    }
});

export default router;

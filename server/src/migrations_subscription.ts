import pool from './config/db';
import { RowDataPacket } from 'mysql2';

export const checkSubscriptionMigrations = async () => {
    try {
        console.log('🔄 Checking Subscription migrations...');

        // 1. Add pending_plan column
        const [columns] = await pool.execute<RowDataPacket[]>(`
            SHOW COLUMNS FROM users LIKE 'pending_plan'
        `);

        if (columns.length === 0) {
            console.log('⚠️ Adding pending_plan column to users table...');
            await pool.execute(`
                ALTER TABLE users 
                ADD COLUMN pending_plan ENUM('pro', 'pro_master') NULL AFTER plan_type;
            `);
            console.log('✅ pending_plan column added.');
        }

        // 2. Add last_payment_date column (for renewal tracking)
        const [columnsPayment] = await pool.execute<RowDataPacket[]>(`
            SHOW COLUMNS FROM users LIKE 'last_payment_date'
        `);

        if (columnsPayment.length === 0) {
            console.log('⚠️ Adding last_payment_date column to users table...');
            await pool.execute(`
                ALTER TABLE users 
                ADD COLUMN last_payment_date DATETIME NULL AFTER pending_plan;
            `);
            console.log('✅ last_payment_date column added.');
        }

        console.log('✅ Subscription migrations check complete.');
    } catch (error) {
        console.error('❌ Error checking subscription migrations:', error);
    }
};

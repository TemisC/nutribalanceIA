import pool from './config/db';
import { RowDataPacket } from 'mysql2';

export const checkMigrations = async () => {
    console.log('🔄 Checking database migrations...');

    try {
        const connection = await pool.getConnection();

        try {
            // Check coach_tier
            const [cols1] = await connection.query<RowDataPacket[]>(`SHOW COLUMNS FROM users LIKE 'coach_tier'`);
            if (cols1.length === 0) {
                console.log('⚠️ Missing coach_tier column. Adding...');
                await connection.query(`ALTER TABLE users ADD COLUMN coach_tier ENUM('standard', 'vip') DEFAULT 'standard' AFTER coach_id`);
                console.log('✅ Added coach_tier column.');
            }

            // Check commission_rate
            const [cols2] = await connection.query<RowDataPacket[]>(`SHOW COLUMNS FROM users LIKE 'commission_rate'`);
            if (cols2.length === 0) {
                console.log('⚠️ Missing commission_rate column. Adding...');
                await connection.query(`ALTER TABLE users ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0.15 AFTER coach_tier`);
                console.log('✅ Added commission_rate column.');
            }

            console.log('✅ Migrations verified.');

        } catch (err) {
            console.error('❌ Migration check failed:', err);
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Failed to connect for migrations:', error);
    }
};

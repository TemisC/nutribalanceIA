
import pool from './config/db';
import { RowDataPacket } from 'mysql2';

export const checkCommunityMigrations = async () => {
    console.log('🔄 Checking community migrations...');

    try {
        const connection = await pool.getConnection();

        try {
            // Check coach_id in community_posts
            const [cols] = await connection.query<RowDataPacket[]>(`SHOW COLUMNS FROM community_posts LIKE 'coach_id'`);
            if (cols.length === 0) {
                console.log('⚠️ Missing coach_id column in community_posts. Adding...');
                await connection.query(`ALTER TABLE community_posts ADD COLUMN coach_id VARCHAR(36) NULL AFTER user_id`);
                await connection.query(`CREATE INDEX idx_community_coach ON community_posts(coach_id)`);
                console.log('✅ Added coach_id column to community_posts.');
            }

            console.log('✅ Community migrations verified.');

        } catch (err) {
            console.error('❌ Community migration check failed:', err);
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Failed to connect for community migrations:', error);
    }
};

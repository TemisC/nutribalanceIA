
import pool from './config/db';
import { RowDataPacket } from 'mysql2';

export const checkCommunityInteractionMigrations = async () => {
    console.log('🔄 Checking community interaction migrations...');

    try {
        const connection = await pool.getConnection();

        try {
            // 1. Comments Table
            const [tables1] = await connection.query<RowDataPacket[]>(`SHOW TABLES LIKE 'community_post_comments'`);
            if (tables1.length === 0) {
                console.log('⚠️ Creating community_post_comments table...');
                await connection.query(`
                    CREATE TABLE community_post_comments (
                        id VARCHAR(36) PRIMARY KEY,
                        post_id VARCHAR(36) NOT NULL,
                        user_id VARCHAR(36) NOT NULL,
                        content TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_post_comments (post_id),
                        INDEX idx_user_comments (user_id)
                    )
                `);
                console.log('✅ Created community_post_comments table.');
            }

            // 2. Likes Table
            const [tables2] = await connection.query<RowDataPacket[]>(`SHOW TABLES LIKE 'community_post_likes'`);
            if (tables2.length === 0) {
                console.log('⚠️ Creating community_post_likes table...');
                await connection.query(`
                    CREATE TABLE community_post_likes (
                        post_id VARCHAR(36) NOT NULL,
                        user_id VARCHAR(36) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (post_id, user_id),
                        INDEX idx_post_likes (post_id)
                    )
                `);
                console.log('✅ Created community_post_likes table.');
            }

            console.log('✅ Community interactions verified.');

        } catch (err) {
            console.error('❌ Community interaction migration check failed:', err);
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Failed to connect for interaction migrations:', error);
    }
};

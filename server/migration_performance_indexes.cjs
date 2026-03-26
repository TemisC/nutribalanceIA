const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nutrifit_db',
    port: Number(process.env.DB_PORT) || 3306
};

async function addIndexes() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔌 Connected to database');

        // 1. Index on Users Email (Login Speed)
        try {
            await connection.execute('CREATE INDEX idx_users_email ON users(email)');
            console.log('✅ Added index on users(email)');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME') console.log('ℹ️ Index idx_users_email already exists');
            else console.error('❌ Error indexing users(email):', e.message);
        }

        // 2. Index on Community Posts Status + Date (Feed Speed)
        try {
            await connection.execute('CREATE INDEX idx_community_status_date ON community_posts(status, created_at)');
            console.log('✅ Added index on community_posts(status, created_at)');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME') console.log('ℹ️ Index idx_community_status_date already exists');
            else console.error('❌ Error indexing community_posts:', e.message);
        }

        // 3. Index on Community Posts User ID (Filtering)
        try {
            await connection.execute('CREATE INDEX idx_community_user ON community_posts(user_id)');
            console.log('✅ Added index on community_posts(user_id)');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME') console.log('ℹ️ Index idx_community_user already exists');
            else console.error('❌ Error indexing community_posts(user_id):', e.message);
        }

        // 4. Index on Community Posts Coach ID (Coach Feed Speed)
        try {
            await connection.execute('CREATE INDEX idx_community_coach ON community_posts(coach_id)');
            console.log('✅ Added index on community_posts(coach_id)');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME') console.log('ℹ️ Index idx_community_coach already exists');
            else console.error('❌ Error indexing community_posts(coach_id):', e.message);
        }

        console.log('✨ Optimization complete!');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

addIndexes();


const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            database: process.env.DB_NAME || 'nutrifit_ai_db_v2',
            multipleStatements: true
        });

        console.log('🔌 Connected to database.');

        // 1. Add token_reset_date column
        try {
            await connection.query(`
        ALTER TABLE users 
        ADD COLUMN token_reset_date DATETIME DEFAULT NULL;
      `);
            console.log('✅ Added token_reset_date column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ token_reset_date column already exists.');
            } else {
                throw e;
            }
        }

        // 2. Modify coach_tier ENUM
        // 'standard' -> 1000 (New Name: VIP)
        // 'vip' -> 2000 (New Name: VIP_Plus)

        // Step A: Modify ENUM to include new values
        try {
            await connection.query(`
            ALTER TABLE users 
            MODIFY COLUMN coach_tier ENUM('standard', 'vip', 'vip_plus') DEFAULT 'vip';
        `);
            console.log('✅ Modified coach_tier ENUM.');
        } catch (e) {
            console.error("Error modifying enum", e);
        }

        // Step B: Migrate Data
        // 1. vip (old, 2000) -> vip_plus (new, 2000)
        await connection.query(`UPDATE users SET coach_tier = 'vip_plus' WHERE coach_tier = 'vip'`);
        console.log('✅ Migrated old "vip" users to "vip_plus".');

        // 2. standard (old, 1000) -> vip (new, 1000)
        await connection.query(`UPDATE users SET coach_tier = 'vip' WHERE coach_tier = 'standard'`);
        console.log('✅ Migrated old "standard" users to "vip".');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

run();

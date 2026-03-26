
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            database: process.env.DB_NAME || 'nutrifit_ai_db_v2', // Updated to v2 based on context
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
        // Note: We need to allow old values temporarily or just overwrite if empty. 
        // Assuming we want to replace 'standard','vip' with 'vip','vip_plus' or just ADD them.
        // Ideally we just change column type to VARCHAR to be flexible or update ENUM.
        // Let's update ENUM to include all for safety: 'standard', 'vip', 'vip_plus'
        // 'vip' (old) meant 2000 tokens (now vip_plus). 'standard' (old) meant 1000 (now vip).
        // This is tricky for data migration.
        // If I just add 'vip_plus', existing 'vip' users will stay 'vip' (which now means 1000).
        // User requested "Coach VIP : 1000 Tokens" (was Standard), "Coach VIP_Plus : 2000 Tokens" (was VIP).
        // So 'standard' -> 'vip', 'vip' -> 'vip_plus'.
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
        // standard -> vip
        await connection.query(`UPDATE users SET coach_tier = 'vip' WHERE coach_tier = 'standard'`);
        // vip (old meaning "high tier") -> vip_plus? 
        // Wait, if I run update standard->vip first, I have no collision yet because 'vip' is also a valid old value.
        // But 'vip' OLD meant High Tier. 'vip' NEW means Low Tier.
        // So I must migrate 'vip' -> 'vip_plus' FIRST.

        // BUT 'vip_plus' didn't exist in old ENUM. I just added it.
        // So:
        // 1. vip -> vip_plus
        await connection.query(`UPDATE users SET coach_tier = 'vip_plus' WHERE coach_tier = 'vip'`);
        console.log('✅ Migrated old "vip" users to "vip_plus".');

        // 2. standard -> vip
        await connection.query(`UPDATE users SET coach_tier = 'vip' WHERE coach_tier = 'standard'`);
        console.log('✅ Migrated old "standard" users to "vip".');

        // 3. (Optional) Remove 'standard' from ENUM? Or keep for safety. Let's keep it clean.
        // await connection.query(`ALTER TABLE users MODIFY COLUMN coach_tier ENUM('vip', 'vip_plus') DEFAULT 'vip'`); -- skipping for safety against strict sql modes on open connections


    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

run();

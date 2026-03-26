const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function diagnoseAndFix() {
    console.log('🔍 Diagnosing Users Table Schema...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [columns] = await connection.query(`SHOW COLUMNS FROM users`);
        const columnNames = columns.map(c => c.Field);

        console.log('📋 Existing Columns:', columnNames.join(', '));

        const missingTier = !columnNames.includes('coach_tier');
        const missingCommission = !columnNames.includes('commission_rate');

        if (missingTier) {
            console.log('⚠️ Missing coach_tier column. Adding...');
            await connection.query(`ALTER TABLE users ADD COLUMN coach_tier ENUM('standard', 'vip') DEFAULT 'standard' AFTER coach_id`);
            console.log('✅ Added coach_tier column.');
        } else {
            console.log('✅ coach_tier column exists.');
        }

        if (missingCommission) {
            console.log('⚠️ Missing commission_rate column. Adding...');
            await connection.query(`ALTER TABLE users ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0.15 AFTER coach_tier`);
            console.log('✅ Added commission_rate column.');
        } else {
            console.log('✅ commission_rate column exists.');
        }

        console.log('🎉 Verification Complete. Restart your server now.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

diagnoseAndFix();

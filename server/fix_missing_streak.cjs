const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function fixStreak() {
    console.log('🔍 Checking for missing "streak" column...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [columns] = await connection.query(`SHOW COLUMNS FROM users LIKE 'streak'`);
        if (columns.length === 0) {
            console.log('⚠️ Missing streak column. Adding...');
            await connection.query(`ALTER TABLE users ADD COLUMN streak INT DEFAULT 0`);
            console.log('✅ Added streak column.');
        } else {
            console.log('✅ streak column already exists.');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

fixStreak();

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

async function runMigration() {
    console.log('🔌 Connecting to DB...');
    console.log(`Host: ${process.env.DB_HOST}, User: ${process.env.DB_USER}, DB: ${process.env.DB_NAME}`);

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0,
        connectTimeout: 20000
    });

    try {
        console.log('🔍 Checking community_posts table...');

        // Check if column exists
        const [columns] = await pool.execute(
            "SHOW COLUMNS FROM community_posts LIKE 'image_url'"
        );

        if (columns.length === 0) {
            console.log('🚀 Adding image_url column...');
            await pool.execute(
                "ALTER TABLE community_posts ADD COLUMN image_url TEXT AFTER content"
            );
            console.log('✅ Column image_url added successfully.');
        } else {
            console.log('ℹ️ Column image_url already exists.');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
        process.exit();
    }
}

runMigration();

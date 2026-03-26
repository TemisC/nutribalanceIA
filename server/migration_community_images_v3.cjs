const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config(); // Should pick up .env in server dir automatically if run from there

async function runMigration() {
    console.log('🔌 Connecting to DB...');
    // Log masked creds
    console.log(`Host: ${process.env.DB_HOST}, User: ${process.env.DB_USER}, DB: ${process.env.DB_NAME}`);

    // Check if env vars are loaded
    if (!process.env.DB_HOST) {
        console.error('❌ Error: DB_HOST is missing. Make sure .env is loaded.');
        process.exit(1);
    }

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

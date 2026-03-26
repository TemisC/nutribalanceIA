
const pool = require('./server/src/config/db').default; // Adjust import if needed, might need .js if compiled
// Since it's TS source, using a quick script with direct mysql2 might be easier if config is TS.
// Let's try reading the JS file if it exists, or just use a raw connection string from .env if I could read it.
// Better: use the existing migration scripts pattern which utilize local require if possible.
// Actually, I'll just write a script that assumes standard mysql2 usage.

const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function checkSizes() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log("Checking Data Sizes...");

    const [users] = await connection.execute('SELECT id, LENGTH(avatar) as avatar_size, LENGTH(image_base64) as image_size_legacy FROM users LEFT JOIN meal_logs ON users.id = meal_logs.user_id LIMIT 20');
    console.log("User Avatar Sizes (bytes):");
    users.forEach(u => {
        if (u.avatar_size > 1000) console.log(`User ${u.id}: ${u.avatar_size} bytes`);
    });

    const [posts] = await connection.execute('SELECT id, LENGTH(image_url) as img_size FROM community_posts WHERE image_url IS NOT NULL');
    console.log("\nCommunity Post Image Sizes (bytes):");
    posts.forEach(p => {
        if (p.img_size > 1000) console.log(`Post ${p.id}: ${p.img_size} bytes`);
    });

    await connection.end();
}

checkSizes().catch(console.error);

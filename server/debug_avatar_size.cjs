const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function checkAvatarSize() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'nutrifit_user',
        password: process.env.DB_PASSWORD || 'NutriFit2024!',
        database: process.env.DB_NAME || 'nutrifit_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log("Checking avatar sizes...");
        const [rows] = await pool.execute("SELECT id, name, LENGTH(avatar) as avatar_len, LEFT(avatar, 30) as preview FROM users WHERE avatar IS NOT NULL ORDER BY avatar_len DESC LIMIT 10");

        console.table(rows);

        const [users] = await pool.execute("SELECT COUNT(*) as total FROM users");
        console.log(`Total users: ${users[0].total}`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

checkAvatarSize();

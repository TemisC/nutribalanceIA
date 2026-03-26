const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function checkPostSize() {
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
        console.log("Checking community_posts sizes...");
        // Check content size and image_url length
        const [rows] = await pool.execute(`
            SELECT id, type, status, 
            LENGTH(content) as content_len, 
            LENGTH(image_url) as image_len, 
            LEFT(image_url, 30) as image_preview 
            FROM community_posts 
            ORDER BY image_len DESC, content_len DESC 
            LIMIT 20
        `);

        console.table(rows);

        const [count] = await pool.execute("SELECT COUNT(*) as total FROM community_posts");
        console.log(`Total posts: ${count[0].total}`);

        // Count base64 images
        const [base64] = await pool.execute("SELECT COUNT(*) as b64 FROM community_posts WHERE image_url LIKE 'data:image%'");
        console.log(`Posts with Base64 Images: ${base64[0].b64}`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

checkPostSize();


const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function checkSize() {
    let connection;
    try {
        console.log("Connecting to DB at", process.env.DB_HOST);
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const sql = `
            SELECT 
                table_name AS "Table", 
                ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)" 
            FROM information_schema.TABLES 
            WHERE table_schema = DATABASE() 
            ORDER BY (data_length + index_length) DESC;
        `;

        const [rows] = await connection.execute(sql);

        console.table(rows);

        // Also check row counts for context
        const [countRows] = await connection.execute(`
            SELECT 
                (SELECT COUNT(*) FROM meal_logs) as meal_logs_count,
                (SELECT COUNT(*) FROM community_posts) as posts_count,
                (SELECT COUNT(*) FROM users) as users_count
        `);
        console.log("\nRow Counts:", countRows[0]);

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkSize();

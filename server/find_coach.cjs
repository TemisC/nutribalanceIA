const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function findCoach() {
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
        console.log("Searching for 'Guillermo'...");
        const [rows] = await pool.execute("SELECT id, name, email, role, coach_id FROM users WHERE name LIKE '%Guillermo%' OR email LIKE '%Guillermo%'");
        console.table(rows);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

findCoach();

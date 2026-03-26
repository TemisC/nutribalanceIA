const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function addIndex() {
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
        console.log("Checking indexes...");
        const [rows] = await pool.execute("SHOW INDEX FROM users");
        const hasIndex = rows.some(r => r.Column_name === 'coach_id');

        if (!hasIndex) {
            console.log("Adding index to coach_id...");
            await pool.execute("CREATE INDEX idx_coach_id ON users(coach_id)");
            console.log("Index added!");
        } else {
            console.log("Index on coach_id already exists.");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

addIndex();

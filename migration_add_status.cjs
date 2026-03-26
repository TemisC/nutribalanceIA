
const mysql = require('./server/node_modules/mysql2/promise');
require('./server/node_modules/dotenv').config({ path: './server/.env' });

async function applyMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log("Checking if 'status' column exists in 'users' table...");
        const [rows] = await connection.execute(`SHOW COLUMNS FROM users LIKE 'status'`);

        if (rows.length === 0) {
            console.log("Column 'status' does not exist. Adding it...");
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER role
            `);
            console.log("✅ Migration applied: 'status' column added.");
        } else {
            console.log("ℹ️ Column 'status' already exists. Skipping.");
        }

    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        await connection.end();
    }
}

applyMigration();

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nutrifit_db',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
};

async function migrate() {
    let connection;
    try {
        console.log("🔌 Connecting to database...");
        connection = await mysql.createConnection(dbConfig);
        console.log("✅ Connected!");

        // Add analysis_text column
        try {
            console.log("🛠️ Adding 'analysis_text' column to 'meal_logs'...");
            await connection.query("ALTER TABLE meal_logs ADD COLUMN analysis_text TEXT NULL");
            console.log("✅ 'analysis_text' column added.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ 'analysis_text' column already exists.");
            } else {
                console.error("⚠️ Error adding 'analysis_text':", err.message);
            }
        }

        // Add suggestions_json column
        try {
            console.log("🛠️ Adding 'suggestions_json' column to 'meal_logs'...");
            await connection.query("ALTER TABLE meal_logs ADD COLUMN suggestions_json JSON NULL");
            console.log("✅ 'suggestions_json' column added.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ 'suggestions_json' column already exists.");
            } else {
                console.error("⚠️ Error adding 'suggestions_json':", err.message);
            }
        }

        console.log("🎉 Migration completed successfully.");
    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

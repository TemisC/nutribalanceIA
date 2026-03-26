
const mysql = require('./server/node_modules/mysql2/promise');
require('./server/node_modules/dotenv').config({ path: './server/.env' });

async function applyMigration() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log("Checking if medical columns exist in 'user_biometrics' table...");

        // Define columns to add
        const columns = [
            "ADD COLUMN medical_conditions TEXT NULL",
            "ADD COLUMN allergies TEXT NULL",
            "ADD COLUMN medications TEXT NULL",
            "ADD COLUMN sleep_hours INT NULL",
            "ADD COLUMN stress_level VARCHAR(50) NULL",
            "ADD COLUMN water_intake INT NULL",
            "ADD COLUMN daily_meals INT NULL",
            "ADD COLUMN injuries TEXT NULL" // Added based on nutritionist context
        ];

        // We will try to add them. If they exist, it might error, but IF NOT EXISTS syntax for columns is tricky in MySQL.
        // Better to check one by one or just use a try-catch block for the ALTER or check information_schema.
        // Simple approach: Run ALTER, ignore 'Duplicate column name' error.

        for (const col of columns) {
            try {
                await connection.execute(`ALTER TABLE user_biometrics ${col}`);
                console.log(`✅ Applied: ${col}`);
            } catch (error) {
                if (error.code === 'ER_DUP_FIELDNAME') {
                    console.log(`ℹ️ Skipped (Exists): ${col}`);
                } else {
                    console.error(`❌ Error applying ${col}:`, error);
                }
            }
        }

        console.log("Migration finished.");

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        if (connection) await connection.end();
    }
}

applyMigration();

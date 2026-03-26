
const mysql = require('./server/node_modules/mysql2/promise');
require('./server/node_modules/dotenv').config({ path: './server/.env' }); // Adjust path to env if needed

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nutrifit_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const applyMigration = async () => {
    const queries = [
        "ALTER TABLE user_biometrics MODIFY COLUMN activity_level VARCHAR(50) NULL",
        "ALTER TABLE user_biometrics MODIFY COLUMN goal VARCHAR(50) NULL",
        "ALTER TABLE user_biometrics MODIFY COLUMN diet_preference VARCHAR(50) NULL",
        "ALTER TABLE user_biometrics MODIFY COLUMN gender VARCHAR(20) NULL"
    ];

    try {
        for (const query of queries) {
            await pool.execute(query);
            console.log(`Executed: ${query}`);
        }
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

applyMigration();

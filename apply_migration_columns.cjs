
const mysql = require('./server/node_modules/mysql2/promise');
require('./server/node_modules/dotenv').config({ path: './server/.env' });

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
        "ALTER TABLE users ADD COLUMN surname VARCHAR(100) NULL AFTER name",
        "ALTER TABLE users ADD COLUMN date_of_birth DATE NULL AFTER surname",
        "ALTER TABLE user_metrics ADD COLUMN bmi DECIMAL(5,2) NULL AFTER tdee",
        "ALTER TABLE user_metrics ADD COLUMN body_fat DECIMAL(5,2) NULL AFTER bmi"
    ];

    try {
        for (const query of queries) {
            // Check if column exists first to avoid error? Or just try/catch unique.
            // Mysql error for duplicate column is code 1060.
            try {
                await pool.execute(query);
                console.log(`Executed: ${query}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Column already exists, skipping: ${query}`);
                } else {
                    throw e;
                }
            }
        }
        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

applyMigration();

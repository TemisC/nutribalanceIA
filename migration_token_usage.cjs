
const mysql = require('./server/node_modules/mysql2/promise');
require('./server/node_modules/dotenv').config({ path: './server/.env' });

async function createTokenUsageTable() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const sql = `
            CREATE TABLE IF NOT EXISTS token_usage_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                amount INT NOT NULL,
                purpose VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_date (user_id, created_at)
            );
        `;
        await connection.execute(sql);
        console.log('✅ Table token_usage_logs created successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating table:', error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

createTokenUsageTable();

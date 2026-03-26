const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'nutrifit_user',
    password: process.env.DB_PASSWORD || 'nutrifit_password',
    database: process.env.DB_NAME || 'nutrifit_db',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
};

async function migrate() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS subscription_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                coach_id INT,
                requested_role VARCHAR(50) NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                amount DECIMAL(10, 2),
                admin_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `;

        await connection.execute(createTableQuery);
        console.log('Table subscription_requests created or already exists.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

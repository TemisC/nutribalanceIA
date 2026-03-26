const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' }); // Adjust path if needed

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'nutrifit_db',
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log('Validating database connection...');

        // Create messages table
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        sender_id VARCHAR(36) NOT NULL,
        receiver_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sender (sender_id),
        INDEX idx_receiver (receiver_id)
      );
    `);
        console.log('Messages table created or assured.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();

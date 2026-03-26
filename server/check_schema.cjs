const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to DB. Checking schema...');

        const [rows] = await connection.query(`
            SELECT COLUMN_NAME, COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'community_posts' AND COLUMN_NAME = 'type';
        `, [process.env.DB_NAME]);

        console.log('Schema Info:', rows);
        await connection.end();
    } catch (error) {
        console.error('Error checking schema:', error);
    }
}

checkSchema();

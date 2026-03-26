const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'); // Assuming bcryptjs is used
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nutrifit_db',
    port: Number(process.env.DB_PORT) || 3306
};

async function testLogin(email) {
    let connection;
    try {
        console.log('🔌 Connecting to DB...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected.');

        console.log(`🔍 Searching user: ${email}`);
        const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            console.log('❌ User not found');
            console.log('📋 Listing first 5 users in DB:');
            const [users] = await connection.execute('SELECT id, email, role FROM users LIMIT 5');
            console.table(users);
            return;
        }

        const user = rows[0];
        console.log(`✅ User found: ID=${user.id}, Role=${user.role}, Name=${user.name}`);
        console.log(`🔑 Password Hash: ${user.password_hash ? 'Present' : 'MISSING'}`);

        // Try to query metrics (lazy load check)
        try {
            const [metrics] = await connection.execute('SELECT * FROM user_metrics WHERE user_id = ?', [user.id]);
            console.log(`📊 Metrics found: ${metrics.length}`);
        } catch (e) {
            console.error('❌ Error fetching metrics:', e.message);
        }

        // Try to check findUsersByCoachId logic manually
        if (user.role === 'coach') {
            console.log('👨‍🏫 User is Coach. Checking clients...');
            const [clients] = await connection.execute('SELECT id FROM users WHERE coach_id = ?', [user.id]);
            console.log(`👥 Clients count: ${clients.length}`);
        }

    } catch (error) {
        console.error('❌ Fatal Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

// Test with a known user (or just generic check)
const searchTerm = process.argv[2] || 'guillermo';

async function searchUser() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log(`🔍 Searching for users like '%${searchTerm}%'...`);
        const [rows] = await connection.execute('SELECT id, email, role, name FROM users WHERE email LIKE ? OR name LIKE ?', [`%${searchTerm}%`, `%${searchTerm}%`]);
        console.table(rows);
    } catch (e) {
        console.error(e);
    } finally {
        if (connection) await connection.end();
    }
}

searchUser();


const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nutrifit_ai_pro',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

async function checkMessages() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // 1. Get Users
        const [users] = await connection.execute('SELECT id, name, email, role, coach_id FROM users');
        console.log('\n--- USERS ---');
        console.table(users.map(u => ({ id: u.id.substring(0, 8) + '...', name: u.name, role: u.role, coach_id: u.coach_id ? u.coach_id.substring(0, 8) + '...' : 'NULL' })));

        // 2. Get Last 10 Messages
        const [messages] = await connection.execute('SELECT id, sender_id, receiver_id, content, type, created_at FROM messages ORDER BY created_at DESC LIMIT 10');
        console.log('\n--- RECENT MESSAGES ---');
        console.table(messages.map(m => ({
            id: m.id.substring(0, 8) + '...',
            sender: m.sender_id.substring(0, 8) + '...',
            receiver: m.receiver_id === 'coach' ? 'STRING "coach"' : (m.receiver_id === 'admin' ? 'STRING "admin"' : m.receiver_id.substring(0, 8) + '...'),
            content: m.content.substring(0, 20) + '...',
            type: m.type
        })));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkMessages();

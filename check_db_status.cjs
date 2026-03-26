const mysql = require('./server/node_modules/mysql2/promise');
require('./server/node_modules/dotenv').config({ path: './server/.env' });

async function checkConnection() {
    console.log('🔌 Testing DB Connection (Limit: 3)...');

    // Config match `server/src/config/db.ts`
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'nutrifit_db',
        waitForConnections: true,
        connectionLimit: 3,
    };

    try {
        const pool = mysql.createPool(dbConfig);
        const connection = await pool.getConnection();
        console.log('✅ Connection Successful!');

        const [rows] = await connection.execute('SELECT 1 as val');
        console.log('✅ Query Test:', rows[0].val === 1 ? 'Passed' : 'Failed');

        connection.release();
        await pool.end();
        console.log('👋 Connection Closed correctly.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
        process.exit(1);
    }
}

checkConnection();

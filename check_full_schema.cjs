
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

const checkSchema = async () => {
    try {
        const [users] = await pool.execute('DESCRIBE users');
        console.log('--- USERS TABLE ---');
        users.forEach(row => console.log(`${row.Field} (${row.Type})`));

        const [metrics] = await pool.execute('DESCRIBE user_metrics');
        console.log('\n--- USER_METRICS TABLE ---');
        metrics.forEach(row => console.log(`${row.Field} (${row.Type})`));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkSchema();

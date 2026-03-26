
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

const checkTables = async () => {
    try {
        const [rows] = await pool.execute('SHOW TABLES');
        console.log('--- TABLES ---');
        rows.forEach(r => console.log(Object.values(r)[0]));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkTables();

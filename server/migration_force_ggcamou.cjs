const mysql = require('mysql2/promise');
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

async function forceRevert() {
    let connection;
    try {
        console.log('🔄 Forcing ggcamou@gmail.com to CLIENT role...');
        connection = await mysql.createConnection(dbConfig);

        const [res] = await connection.execute("UPDATE users SET role='client' WHERE email='ggcamou@gmail.com'");
        console.log(`✅ Update result: ${res.changedRows} rows changed.`);

    } catch (e) {
        console.error('❌ Migration Error:', e.message);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

forceRevert();

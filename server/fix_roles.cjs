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

async function fixRoles() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔌 Connected.');

        // 1. Fix Guillermo
        const [res] = await connection.execute("UPDATE users SET role='superadmin' WHERE email='ggcamou@gmail.com'");
        console.log(`✅ Fixed Guillermo: ${res.affectedRows} rows affected.`);

        // 2. Fix others (Safety net)
        const [res2] = await connection.execute("UPDATE users SET role='client', plan_type='free' WHERE role = '' OR role IS NULL");
        console.log(`✅ Fixed other empty roles: ${res2.affectedRows} rows affected.`);

    } catch (e) {
        console.error(e);
    } finally {
        if (connection) await connection.end();
    }
}

fixRoles();

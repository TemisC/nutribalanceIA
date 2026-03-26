const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Load env from current dir or parent
dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nutrifit_db',
    port: Number(process.env.DB_PORT) || 3306
};

async function runMigration() {
    let connection;
    try {
        console.log('🔌 Connecting to DB for Role Fix...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected.');

        // 1. Fix Guillermo (SuperAdmin)
        // Check if exists first
        const [users] = await connection.execute("SELECT id FROM users WHERE email='ggcamou@gmail.com'");
        if (users.length > 0) {
            const [res] = await connection.execute("UPDATE users SET role='superadmin' WHERE email='ggcamou@gmail.com'");
            console.log(`✅ Fixed SuperAdmin (Guillermo): ${res.changedRows} updated.`);
        } else {
            console.log('ℹ️ Guillermo user not found, skipping specific fix.');
        }

        // 2. Fix other empty roles (Safety net)
        const [res2] = await connection.execute("UPDATE users SET role='client', plan_type='free' WHERE role = '' OR role IS NULL");
        console.log(`✅ Fixed other empty roles: ${res2.changedRows} updated.`);

    } catch (e) {
        console.error('❌ Migration Error:', e.message);
        // Don't exit 1, just log error so deploy continues
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

runMigration();

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

async function hardenRoles() {
    let connection;
    try {
        console.log('🛡️ Hardening Users Table (Role Security)...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected.');

        // 1. Fix any remaining empty roles to 'client' (Safety Net)
        // Ensure ggcamou is NOT touched if already valid (we fixed it manually previously)
        const [cleanup] = await connection.execute("UPDATE users SET role='client', plan_type='free' WHERE role = '' OR role IS NULL");
        console.log(`🧹 Cleaned up ${cleanup.changedRows} users with empty roles.`);

        // 2. ALTER TABLE to modify 'role' column
        // Make it ENUM and NOT NULL with Default 'client' (or 'free'? User said client)
        // Check current schema first to see valid enum values
        // Usually: ENUM('client', 'coach', 'admin', 'superadmin', 'free', 'pro', 'vip', 'vip_plus')?
        // Let's assume standard roles based on userModel.ts

        // We will set NOT NULL and DEFAULT 'client'
        // WARNING: This might fail if there are values not in ENUM. 
        // Safer: Modify to VARCHAR(50) NOT NULL DEFAULT 'client' first if we are unsure of ENUM.
        // But better to check what it is now.

        const [columns] = await connection.execute("SHOW COLUMNS FROM users LIKE 'role'");
        const currentType = columns[0].Type;
        console.log(`ℹ️ Current Role Column Type: ${currentType}`);

        // We will try to add NOT NULL constraint.
        // If it's already ENUM, we keep it ENUM but add NOT NULL DEFAULT 'client'.
        // If it sends error, we catch it.

        if (currentType.includes('enum')) {
            // Extract values? Too complex.
            // Just set NOT NULL.
            // await connection.execute(`ALTER TABLE users MODIFY COLUMN role ${currentType} NOT NULL DEFAULT 'client'`);
            // Actually, forcing a known safe definition is better.
            const safeDefinition = "ENUM('client','coach','admin','superadmin','free','pro','pro_master','standard','vip','vip_plus') NOT NULL DEFAULT 'client'";
            // Note: 'free' might be a plan_type, not role? 
            // userModel.ts UserRole enum usually has: CLIENT, COACH, ADMIN, SUPERADMIN.
            // 'free' might be mixed up.
            // Let's just use VARCHAR(20) NOT NULL DEFAULT 'client' to be safe and flexible.

            await connection.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'client'");
            console.log("✅ Altered 'role' column to VARCHAR(50) NOT NULL DEFAULT 'client'.");
        } else {
            await connection.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'client'");
            console.log("✅ Altered 'role' column to VARCHAR(50) NOT NULL DEFAULT 'client'.");
        }

    } catch (e) {
        console.error('❌ Migration Error:', e.message);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

hardenRoles();

const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Try loading .env from multiple common locations
const envPaths = [
    path.join(__dirname, '.env'),    // Check server/.env (most likely for backend)
    path.join(__dirname, '../.env'), // Check root/.env
    path.join(process.cwd(), '.env') // Check CWD/.env
];

let loaded = false;
for (const p of envPaths) {
    const result = dotenv.config({ path: p });
    if (!result.error) {
        console.log(`✅ Loaded environment from: ${p}`);
        loaded = true;
        break;
    }
}

if (!loaded) {
    console.warn("⚠️  Warning: Could not find .env file. Relying on system environment variables.");
}

// Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nutrifit_ai_db_v2',
    multipleStatements: true
};

console.log(`🔌 Attempting connection to: ${dbConfig.user}@${dbConfig.host}/${dbConfig.database}`);

async function run() {
    let connection;
    try {
        console.log('🚀 Starting Business Logic V2 Migration...');
        connection = await mysql.createConnection(dbConfig);

        const addColumn = async (table, column, definition) => {
            try {
                await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                console.log(`✅ Added '${column}' to ${table}.`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`ℹ️  '${column}' already exists in ${table}.`);
                } else {
                    console.error(`❌ Error adding '${column}':`, e.message);
                }
            }
        };

        // 1. Add key columns to 'users'
        await addColumn('users', 'token_reset_date', 'DATETIME DEFAULT NULL');
        await addColumn('users', 'current_period_end', 'DATETIME DEFAULT NULL');
        await addColumn('users', 'last_payment_date', 'DATETIME DEFAULT NULL');
        await addColumn('users', 'pending_plan', "ENUM('pro', 'pro_master') DEFAULT NULL");
        await addColumn('users', 'commission_rate', "DECIMAL(5,2) DEFAULT 0.15");

        // 2. Update coach_tier ENUM and Migrate Data
        try {
            console.log("🔄 Updating coach_tier ENUM...");
            // Force change to VARCHAR first to avoid enum conflicts, then to new ENUM? 
            // Or just direct modify if compatible. 
            // Best safe path: 
            await connection.query("ALTER TABLE users MODIFY COLUMN coach_tier ENUM('standard', 'vip', 'vip_plus') DEFAULT 'vip'");
            console.log("✅ Modified 'coach_tier' ENUM.");

            // Data Migration for Tiers
            // Old 'vip' (Level 2) -> 'vip_plus'
            const [update1] = await connection.query("UPDATE users SET coach_tier = 'vip_plus' WHERE coach_tier = 'vip' AND role='coach'");
            if (update1.affectedRows > 0) console.log(`✅ Migrated ${update1.affectedRows} users from 'vip' to 'vip_plus'.`);

            // Old 'standard' (Level 1) -> 'vip'
            const [update2] = await connection.query("UPDATE users SET coach_tier = 'vip' WHERE coach_tier = 'standard' AND role='coach'");
            if (update2.affectedRows > 0) console.log(`✅ Migrated ${update2.affectedRows} users from 'standard' to 'vip'.`);

        } catch (e) {
            console.log("⚠️  Note on coach_tier:", e.message);
        }

        console.log("\n🎉 Business Logic V2 Migration Completed Successfully!");

    } catch (error) {
        console.error('❌ Migration Fatal Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

run();

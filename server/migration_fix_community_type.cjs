const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Try loading .env from multiple common locations
const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '../.env'),
    path.join(process.cwd(), '.env')
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
        console.log('🚀 Starting Community Type Migration...');
        connection = await mysql.createConnection(dbConfig);

        // Modify column to VARCHAR(50) to support all types (hydration, workout, question, etc.)
        // This removes the strict ENUM constraint.
        await connection.query("ALTER TABLE community_posts MODIFY COLUMN type VARCHAR(50) NOT NULL DEFAULT 'motivation'");
        console.log("✅ Modified 'type' column to VARCHAR(50).");

    } catch (error) {
        console.error('❌ Migration Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

run();

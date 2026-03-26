const path = require('path');
const dotenv = require('dotenv');

// Load env vars (try server/.env then root .env)
dotenv.config({ path: path.join(__dirname, '.env') });
if (!process.env.DB_HOST) {
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

// Require the COMPILED database config (from dist, not src)
let pool;
try {
    const db = require('./dist/config/db');
    pool = db.default || db;
} catch (e) {
    console.error("❌ Could not load database config from './dist/config/db'. Ensure you have run 'npm run build' in the server directory.");
    console.error("Error details:", e.message);
    process.exit(1);
}

async function checkMeals() {
    try {
        console.log("🔍 Checking recent meal logs...");
        const [rows] = await pool.query(`
            SELECT id, user_id, food_name, created_at, calories 
            FROM meal_logs 
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        if (rows.length === 0) {
            console.log("❌ No meals found in 'meal_logs' table.");
        } else {
            console.log(`✅ Found ${rows.length} meals. Recent entries:`);
            console.table(rows);
        }
        process.exit(0);
    } catch (error) {
        console.error("❌ Error querying DB:", error);
        process.exit(1);
    }
}

checkMeals();

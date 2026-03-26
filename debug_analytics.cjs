
const mysql = require('./server/node_modules/mysql2/promise');
require('./server/node_modules/dotenv').config({ path: './server/.env' });

async function checkData() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log("--- RECENT APPROVED SUBSCRIPTIONS ---");
        const [subs] = await connection.execute(`
            SELECT id, user_id, amount, status, updated_at, created_at 
            FROM subscription_requests 
            ORDER BY updated_at DESC LIMIT 5
        `);
        console.table(subs);

        console.log("\n--- RECENT CLIENTS ---");
        const [users] = await connection.execute(`
            SELECT id, name, email, role, created_at 
            FROM users 
            WHERE role = 'client' OR role = 'free' OR role = 'pro'
            ORDER BY created_at DESC LIMIT 10
        `);
        console.table(users);

        console.log("\n--- USER ROLES DISTRIBUTION ---");
        const [roles] = await connection.execute(`
            SELECT role, COUNT(*) as count FROM users GROUP BY role
        `);
        console.table(roles);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        if (connection) await connection.end();
    }
}

checkData();

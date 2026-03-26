require('dotenv').config({ path: './.env' });
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function testPostCreation() {
    console.log("🔍 Starting Database Post Creation Test...");
    console.log(`Connecting to Host: ${process.env.DB_HOST}`);

    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 5,
        });

        const connection = await pool.getConnection();
        console.log("✅ Connected to MySQL!");

        // 1. Get a valid user ID (Admin) to use as owner
        const [users] = await connection.execute("SELECT id FROM users WHERE role IN ('admin', 'superadmin', 'coach') LIMIT 1");
        if (users.length === 0) {
            console.error("❌ No admin/coach user found to test with.");
            process.exit(1);
        }
        const userId = users[0].id;
        console.log(`👤 Using User ID: ${userId} for test.`);

        // 2. Prepare Data (Mimic exactly what fails)
        const postId = uuidv4();
        const content = "Test Post from Debug Script 💧";
        const type = "hydration"; // This sends 'hydration' string
        const likes = 0;
        const tokens = 5;
        const status = "published";
        const coachId = null;
        const imageUrl = null;

        console.log("📝 Attempting INSERT with type='hydration'...");

        const sql = `
            INSERT INTO community_posts (id, user_id, content, type, likes, tokens_awarded, status, coach_id, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await connection.execute(sql, [
            postId, userId, content, type, likes, tokens, status, coachId, imageUrl
        ]);

        console.log("✅ SUCCESS! Post inserted successfully with type 'hydration'.");
        console.log("🎉 The database IS accepting the relaxed type.");

        // Clean up
        await connection.execute("DELETE FROM community_posts WHERE id = ?", [postId]);
        console.log("🧹 Test post deleted.");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ CRITICAL ERROR DETECTED:");
        console.error("------------------------------------------------");
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("SQL State:", error.sqlState);
        console.error("SQL Message:", error.sqlMessage);

        if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
            console.error("\n💡 ANALYSIS: Incorrect Enum Value. The 'type' column is likely still an ENUM!");
        } else if (error.code === 'ER_DATA_TOO_LONG') {
            console.error("\n💡 ANALYSIS: Data too long. Check column lengths.");
        }

        console.error("------------------------------------------------\n");
        process.exit(1);
    }
}

testPostCreation();

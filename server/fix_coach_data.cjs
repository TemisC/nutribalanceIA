const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function fixCoachData() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'nutrifit_user',
        password: process.env.DB_PASSWORD || 'NutriFit2024!',
        database: process.env.DB_NAME || 'nutrifit_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const coachId = '40b1621d-4300-402e-af80-05a6dbc0a7d3'; // Found in previous step
        console.log(`Fixing data for Coach: ${coachId}`);

        // 1. Assign some clients to this Coach (clients who don't have a coach)
        console.log("Assigning clients...");
        const [clients] = await pool.execute("SELECT id FROM users WHERE role = 'client' LIMIT 3");

        for (const client of clients) {
            await pool.execute("UPDATE users SET coach_id = ? WHERE id = ?", [coachId, client.id]);
            console.log(` - Assigned client ${client.id} to coach.`);
        }

        // 2. Assign some existing posts to this Coach (for immediate visibility)
        console.log("Assigning posts...");
        const [posts] = await pool.execute("SELECT id FROM community_posts LIMIT 5");

        for (const post of posts) {
            // Update coach_id on the post itself (if that's how we filter)
            // AND ensure the user of the post is assigned to the coach (for u.coach_id check)

            await pool.execute("UPDATE community_posts SET coach_id = ?, status = 'pending' WHERE id = ?", [coachId, post.id]);
            // Also set status to 'pending' to test moderation!
            console.log(` - Assigned post ${post.id} to coach (and set to PENDING).`);
        }

        console.log("✅ Data fixed!");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

fixCoachData();

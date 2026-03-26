const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function debugFeed() {
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
        console.log("--- 1. Finding Coach ---");
        const [coaches] = await pool.execute("SELECT id, name, email FROM users WHERE role = 'coach'");

        if (coaches.length === 0) {
            console.log("No coaches found!");
            return;
        }

        console.log("Found Coaches:", coaches);
        const coach = coaches[0];
        const coachId = coach.id;
        console.log(`Using Coach: ${coach.name} (${coachId})`);

        console.log("\n--- 2. Checking Clients of Coach ---");
        const [clients] = await pool.execute("SELECT id, name, coach_id FROM users WHERE coach_id = ?", [coachId]);
        console.log(`Found ${clients.length} clients for this coach.`);
        clients.forEach(c => console.log(` - Client: ${c.name} (${c.id})`));

        console.log("\n--- 3. Checking All Posts (Raw) ---");
        const [allPosts] = await pool.execute("SELECT id, user_id, status, content, coach_id FROM community_posts LIMIT 5");
        console.log("Sample of 5 posts in DB:", allPosts);

        console.log("\n--- 4. Simulating getCommunityPosts Query ---");
        // Emulating the query from userModel.ts
        const includePending = true; // Coach is moderator
        let statusCondition = "(p.status = 'published' OR p.status = 'pending')";

        const sql = `
            SELECT p.*, u.name as user_name, u.coach_id as user_coach_id
            FROM community_posts p
            JOIN users u ON p.user_id = u.id
            WHERE ${statusCondition} 
            AND (p.coach_id = ? OR u.coach_id = ? OR p.user_id = ?) 
            ORDER BY p.created_at DESC
        `;

        console.log("Running Query:", sql.replace(/\?/g, `'${coachId}'`));

        const [rows] = await pool.execute(sql, [coachId, coachId, coachId]);
        console.log(`\nReturned ${rows.length} posts for this coach feed.`);

        if (rows.length === 0) {
            console.log(" ! Why empty? Checking individual conditions...");

            const [p_coach_matches] = await pool.execute("SELECT count(*) as c FROM community_posts WHERE coach_id = ?", [coachId]);
            console.log(` - Posts with p.coach_id = ${coachId}: ${p_coach_matches[0].c}`);

            const [u_coach_matches] = await pool.execute(`
                SELECT count(*) as c 
                FROM community_posts p 
                JOIN users u ON p.user_id = u.id 
                WHERE u.coach_id = ?`,
                [coachId]
            );
            console.log(` - Posts by users with u.coach_id = ${coachId}: ${u_coach_matches[0].c}`);

            const [p_user_matches] = await pool.execute("SELECT count(*) as c FROM community_posts WHERE user_id = ?", [coachId]);
            console.log(` - Posts by the coach themselves (user_id = ${coachId}): ${p_user_matches[0].c}`);
        } else {
            rows.forEach(r => {
                console.log(`[${r.status}] ${r.user_name}: ${r.content.substring(0, 30)}...`);
            });
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

debugFeed();

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
        // ID verified from find_coach.cjs output
        const COACH_ID = '7da99b1c-4e21-4d0e-b42e-d047952e62ba';

        console.log(`Fixing data for Coach ID: ${COACH_ID}`);

        // 1. Assign some PENDING posts to this coach so they show up in moderation
        // We look for posts that are pending and currently have NO coach or a diff coach, 
        // OR we just force some test posts.
        // Let's force the last 5 pending posts to be for this coach.
        const [posts] = await pool.execute(
            `UPDATE community_posts 
             SET coach_id = ?, status = 'pending' 
             WHERE status = 'pending' OR type IN ('presentation', 'progress')
             ORDER BY created_at DESC LIMIT 5`,
            [COACH_ID]
        );
        console.log(`Assigned ${posts.affectedRows} pending posts to coach.`);

        // 2. Assign some Clients to this coach (just in case)
        const [users] = await pool.execute(
            `UPDATE users 
             SET coach_id = ? 
             WHERE role = 'client' AND (coach_id IS NULL OR coach_id != ?) 
             LIMIT 3`,
            [COACH_ID, COACH_ID]
        );
        console.log(`Assigned ${users.affectedRows} clients to coach.`);

        // 3. Verify
        const [check] = await pool.execute("SELECT id, content, status, coach_id FROM community_posts WHERE coach_id = ?", [COACH_ID]);
        console.table(check);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

fixCoachData();

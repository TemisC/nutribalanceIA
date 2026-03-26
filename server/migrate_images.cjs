
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrateImages() {
    let connection;
    try {
        console.log("🚀 Starting Image Migration...");

        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // Ensure uploads dir exists
        const uploadsDir = path.join(__dirname, 'public/uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log(`Created uploads directory: ${uploadsDir}`);
        }

        // 1. MIGRATE MEAL LOGS
        console.log("\n--- Processing Meal Logs ---");
        const [meals] = await connection.execute("SELECT id, image_base64 FROM meal_logs WHERE image_base64 LIKE 'data:image%'");
        console.log(`Found ${meals.length} meals with Base64 images.`);

        for (const meal of meals) {
            try {
                const matches = meal.image_base64.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const base64Data = matches[2];
                    const filename = `meal_${meal.id}_${Date.now()}.${ext}`;
                    const filePath = path.join(uploadsDir, filename);

                    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                    const publicUrl = `/uploads/${filename}`;

                    await connection.execute("UPDATE meal_logs SET image_base64 = ? WHERE id = ?", [publicUrl, meal.id]);
                    process.stdout.write(".");
                }
            } catch (err) {
                console.error(`\nFailed to migrate meal ${meal.id}:`, err.message);
            }
        }

        // 2. MIGRATE COMMUNITY POSTS
        console.log("\n\n--- Processing Community Posts ---");
        // Check if image_url has base64 (some might be mixed) OR if we need to migrate 'image_url' column content
        // Note: The controller logic seemed to use 'image_url' column.
        const [posts] = await connection.execute("SELECT id, image_url FROM community_posts WHERE image_url LIKE 'data:image%'");
        console.log(`Found ${posts.length} posts with Base64 images.`);

        for (const post of posts) {
            try {
                const matches = post.image_url.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const base64Data = matches[2];
                    const filename = `post_${post.id}_${Date.now()}.${ext}`;
                    const filePath = path.join(uploadsDir, filename);

                    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                    const publicUrl = `/uploads/${filename}`;

                    await connection.execute("UPDATE community_posts SET image_url = ? WHERE id = ?", [publicUrl, post.id]);
                    process.stdout.write(".");
                }
            } catch (err) {
                console.error(`\nFailed to migrate post ${post.id}:`, err.message);
            }
        }

        console.log("\n\n✅ Migration Complete!");

        // Optimize Tables to reclaim space
        console.log("Optimizing tables...");
        await connection.query("OPTIMIZE TABLE meal_logs");
        await connection.query("OPTIMIZE TABLE community_posts");
        console.log("✅ Tables Optimized.");

    } catch (error) {
        console.error("\n❌ Fatal Error:", error);
    } finally {
        if (connection) await connection.end();
    }
}

migrateImages();

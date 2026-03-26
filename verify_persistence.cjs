
const mysql = require('./server/node_modules/mysql2/promise');
require('./server/node_modules/dotenv').config({ path: './server/.env' });

// Simple UUID generator
const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nutrifit_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const verifyPersistence = async () => {
    // 1. Get a valid real user ID to satisfy FK constraint
    let validUserId;
    try {
        const [users] = await pool.execute('SELECT id FROM users LIMIT 1');
        if (users.length === 0) {
            console.error('❌ No users found in DB to test with. Create a user first.');
            process.exit(1);
        }
        validUserId = users[0].id;
        console.log(`ℹ️ Using existing user ID for test: ${validUserId}`);
    } catch (e) {
        console.error('Failed to get user:', e);
        process.exit(1);
    }

    const testPlanId = uuidv4();
    const mockPlan = {
        days: [{ day: 'Monday', meals: [{ name: 'JSON Persistence Test Meal', calories: 999 }] }],
        metadata: { goal: 'verify_json_architectural_decision', createdAt: Date.now() }
    };

    console.log('\n1. [Device A] Saving Plan to DB...');
    try {
        // Updated Logic to match the Fix
        const query = `
            INSERT INTO meal_plans (id, user_id, plan_data_json, status)
            VALUES (?, ?, ?, 'active')
        `;
        await pool.execute(query, [testPlanId, validUserId, JSON.stringify(mockPlan)]);
        console.log('✅ Plan saved successfully.');
    } catch (e) {
        console.error('❌ Save failed:', e);
        process.exit(1);
    }

    console.log('\n2. [Device B] Reading Plan from DB...');
    try {
        const query = `SELECT * FROM meal_plans WHERE id = ?`;
        const [rows] = await pool.execute(query, [testPlanId]);

        if (rows.length > 0) {
            const row = rows[0];
            console.log('✅ Row found.');

            // Parse logic
            const loadedData = typeof (row.plan_data_json) === 'string'
                ? JSON.parse(row.plan_data_json)
                : row.plan_data_json;

            console.log('📦 Loaded Data Content:', JSON.stringify(loadedData, null, 2));

            if (loadedData.days[0].meals[0].name === 'JSON Persistence Test Meal') {
                console.log('\n🎉 SUCCESS: The architecture perfectly supports your JSON suggestion!');
            } else {
                console.error('\n❌ Data mismatch.');
            }
        } else {
            console.error('\n❌ Plan not found in DB.');
        }

        // Cleanup
        await pool.execute('DELETE FROM meal_plans WHERE id = ?', [testPlanId]);

    } catch (e) {
        console.error('❌ Read failed:', e);
    }
    process.exit(0);
};

verifyPersistence();

import pool from './config/db';
import { RowDataPacket } from 'mysql2';

export const checkMealPlanMigrations = async () => {
    console.log('🔄 Checking Meal Plan migrations...');

    try {
        const connection = await pool.getConnection();

        try {
            // 1. Check if table exists
            const [tables] = await connection.query<RowDataPacket[]>(`SHOW TABLES LIKE 'meal_plans'`);

            if (tables.length === 0) {
                console.log('⚠️ Missing meal_plans table. Creating...');
                await connection.query(`
                    CREATE TABLE meal_plans (
                        id VARCHAR(36) PRIMARY KEY,
                        user_id VARCHAR(36) NOT NULL,
                        plan_data_json JSON,
                        status VARCHAR(20) DEFAULT 'active',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                `);
                console.log('✅ Created meal_plans table.');
            } else {
                // 2. Check columns if table exists (Fix mismatch plan_data vs plan_data_json)
                const [cols] = await connection.query<RowDataPacket[]>(`SHOW COLUMNS FROM meal_plans LIKE 'plan_data_json'`);
                if (cols.length === 0) {
                    console.log('⚠️ Missing plan_data_json column. Checking for legacy plan_data...');

                    const [legacyCols] = await connection.query<RowDataPacket[]>(`SHOW COLUMNS FROM meal_plans LIKE 'plan_data'`);
                    if (legacyCols.length > 0) {
                        console.log('⚠️ Found legacy plan_data column. Renaming to plan_data_json...');
                        // MySQL requires full definition on CHANGE
                        await connection.query(`ALTER TABLE meal_plans CHANGE plan_data plan_data_json JSON`);
                        console.log('✅ Renamed plan_data to plan_data_json.');
                    } else {
                        console.log('⚠️ No plan column found. Adding plan_data_json...');
                        await connection.query(`ALTER TABLE meal_plans ADD COLUMN plan_data_json JSON AFTER user_id`);
                        console.log('✅ Added plan_data_json column.');
                    }
                }

                // Check STATUS column
                const [statusCol] = await connection.query<RowDataPacket[]>(`SHOW COLUMNS FROM meal_plans LIKE 'status'`);
                if (statusCol.length === 0) {
                    console.log('⚠️ Missing status column. Adding...');
                    await connection.query(`ALTER TABLE meal_plans ADD COLUMN status VARCHAR(20) DEFAULT 'active'`);
                    console.log('✅ Added status column.');
                }
            }

            console.log('✅ Meal Plan migrations verified.');

        } catch (err) {
            console.error('❌ Meal Plan migration check failed:', err);
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Failed to connect for meal plan migrations:', error);
    }
};

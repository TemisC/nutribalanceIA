
import pool from './config/db';

const addColumn = async () => {
    try {
        console.log("Adding current_period_end to users table...");

        // Check if column exists logic is hard in raw SQL without describing.
        // We'll just try to add it and catch duplicate column error, or use logic.
        // Simplest: Try ADD COLUMN.

        try {
            await pool.execute("ALTER TABLE users ADD COLUMN current_period_end DATETIME NULL");
            console.log("Column added.");
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("Column already exists.");
            } else {
                throw e;
            }
        }

        console.log("Schema update complete.");
        process.exit(0);
    } catch (error) {
        console.error("Schema update failed:", error);
        process.exit(1);
    }
};

addColumn();

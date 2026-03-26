
import pool from './config/db';

const addBillingDate = async () => {
    try {
        console.log("Adding billing_date to users table...");
        try {
            await pool.execute("ALTER TABLE users ADD COLUMN billing_date DATETIME NULL");
            console.log("Column added.");
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("Column already exists.");
            } else {
                throw e;
            }
        }
        process.exit(0);
    } catch (error) {
        console.error("Schema update failed:", error);
        process.exit(1);
    }
};

addBillingDate();

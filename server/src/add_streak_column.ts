import pool from './config/db';

const addStreakColumn = async () => {
    try {
        console.log("Checking if 'streak' column exists...");
        const [rows] = await pool.execute("SHOW COLUMNS FROM users LIKE 'streak'");

        if ((rows as any[]).length === 0) {
            console.log("Adding 'streak' column...");
            await pool.execute("ALTER TABLE users ADD COLUMN streak INT DEFAULT 0");
            console.log("Column 'streak' added successfully.");
        } else {
            console.log("Column 'streak' already exists.");
        }
    } catch (error) {
        console.error("Error adding column:", error);
    } finally {
        process.exit();
    }
};

addStreakColumn();

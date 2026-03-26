import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: 'srv1621.hstgr.io',
    user: 'u238228052_admintemis',
    password: 'LOratadina..10',
    database: 'u238228052_nutriproaisaas'
};

const runMigration = async () => {
    let connection;
    console.log('DB Config Host:', dbConfig.host);
    console.log('DB Config User:', dbConfig.user);
    // console.log('DB Config Pass:', dbConfig.password ? '****' : 'EMPTY'); // Do not log password
    console.log('DB Config Name:', dbConfig.database);

    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // Add coach_tier column
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN coach_tier ENUM('standard', 'vip') DEFAULT 'standard' AFTER coach_id;
            `);
            console.log('Added coach_tier column.');
        } catch (error: any) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('coach_tier column already exists.');
            } else {
                throw error;
            }
        }

        // Add commission_rate column
        try {
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0.15 AFTER coach_tier;
            `);
            console.log('Added commission_rate column.');
        } catch (error: any) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('commission_rate column already exists.');
            } else {
                throw error;
            }
        }

        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
};

runMigration();

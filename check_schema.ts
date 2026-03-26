
import pool from './server/src/config/db';

const checkSchema = async () => {
    try {
        const [rows] = await pool.execute('DESCRIBE user_biometrics');
        console.log('Schema for user_biometrics:', rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkSchema();

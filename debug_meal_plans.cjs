
const mysql = require('./server/node_modules/mysql2/promise');
require('./server/node_modules/dotenv').config({ path: './server/.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nutrifit_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const checkMealPlans = async () => {
    try {
        console.log('Checking meal_plans table schema...');
        const [columns] = await pool.execute('DESCRIBE meal_plans');
        columns.forEach(col => console.log(`${col.Field} (${col.Type})`));

        console.log('\nChecking for existing meal plans...');
        const [rows] = await pool.execute('SELECT * FROM meal_plans');
        console.log(`Found ${rows.length} meal plans.`);
        if (rows.length > 0) {
            console.log('Sample row:', rows[0]);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error checking meal plans:', error);
        process.exit(1);
    }
};

checkMealPlans();

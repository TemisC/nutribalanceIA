const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'server/.env' });

async function check() {
    console.log(`Checking host: ${process.env.DB_HOST}`);
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    const [rows] = await connection.execute("SELECT id, email, role FROM users WHERE email='ggcamou@gmail.com'");
    console.table(rows);
    await connection.end();
}
check();

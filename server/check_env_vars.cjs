const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');

try {
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        console.log("--- .env Content ---");
        console.log(envContent);
        console.log("--------------------");
    } else {
        console.log("❌ .env file found at:", envPath);
    }
} catch (error) {
    console.error("Error reading .env:", error);
}

const axios = require('axios');

const FOOD_ANALYSIS_URL = 'https://n8n.miwebsiteonline.com/webhook/analisis_de_platos_de_comida';

async function testConnection() {
    console.log(`Testing connection to: ${FOOD_ANALYSIS_URL}`);
    try {
        const response = await axios.post(FOOD_ANALYSIS_URL, {
            image: "test_base64_string",
            prompt: "Test connection"
        });
        console.log("✅ Success! N8N responded:", response.status);
        console.log("Data:", response.data);
    } catch (error) {
        console.error("❌ Failed to connect:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }
    }
}

testConnection();

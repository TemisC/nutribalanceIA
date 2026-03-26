const axios = require('axios');

const CHAT_NUTRITION_URL = 'https://n8n.miwebsiteonline.com/webhook/f4501365-0497-4158-9abe-c4fba2ab60e1/chat';

async function testConnection() {
    console.log(`Testing connection to: ${CHAT_NUTRITION_URL}`);
    try {
        const response = await axios.post(CHAT_NUTRITION_URL, {
            message: "Hola, esto es una prueba para el nutricionista",
            history: [],
            biometrics: { weight: 80, height: 180, age: 30, goal: "muscle", activityLevel: "moderate", gender: "male" },
            sessionId: "test-session-123",
            context: {}
        });
        console.log("✅ Success! N8N responded:", response.status);
        console.log("Data:", JSON.stringify(response.data).substring(0, 500));
    } catch (error) {
        console.error("❌ Failed to connect:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }
    }
}

testConnection();

// Native fetch is available in Node 18+

async function testApiLogin() {
    console.log('🌐 Testing API Login...');
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'taniaygabriel@gmail.com', // Known existing user
                password: 'wrongpassword' // Just to check if API responds
            })
        });

        console.log(`📡 Status: ${response.status}`);
        const data = await response.json();
        console.log('📦 Response:', data);

        if (response.status === 200 || response.status === 401) {
            console.log('✅ API is ALIVE');
        } else {
            console.log('⚠️ API returned unexpected status');
        }

    } catch (error) {
        console.error('❌ API Verification Failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💀 API is likely DOWN or not running on port 5000');
        }
    }
}

testApiLogin();

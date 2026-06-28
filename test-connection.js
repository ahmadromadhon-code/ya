const axios = require('axios');
const dns = require('dns');

// Set custom DNS to bypass ISP hijacking (Internet Positif)
dns.setServers(['1.1.1.1', '8.8.8.8']);

// Test different URLs
const urls = [
    'https://nekopoi.care',
    'http://nekopoi.care',
    'https://www.nekopoi.care',
    'http://www.nekopoi.care'
];

async function testUrls() {
    for (const url of urls) {
        try {
            console.log(`Testing: ${url}`);
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            console.log(`✅ Success: ${url} - Status: ${response.status}`);
            console.log(`Response length: ${response.data.length} characters`);
            break;
        } catch (error) {
            console.log(`❌ Failed: ${url} - Error: ${error.message}`);
        }
    }
}

testUrls();

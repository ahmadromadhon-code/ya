const NekopoiScrapper = require('./NekopoiScrapper');

async function runExample() {
    console.log('🚀 Starting Nekopoi Scrapper...\n');

    try {
        // 1. Fetch Latest Release
        console.log('📋 Fetching latest releases (Page 1)...');
        const latest = await NekopoiScrapper.getLatest(1);
        console.log('✅ Latest releases fetched successfully!');
        console.log(JSON.stringify(latest.slice(0, 3), null, 2)); // Show first 3 items
        console.log(`... and ${latest.length - 3} more items.\n`);

        console.log('='.repeat(50) + '\n');

        // 2. Search for a title
        const searchKeyword = 'Gakuen';
        console.log(`🔍 Searching for: "${searchKeyword}"...`);
        const searchResults = await NekopoiScrapper.search(searchKeyword, 1);
        console.log('✅ Search results fetched successfully!');
        console.log(JSON.stringify(searchResults.slice(0, 3), null, 2)); // Show first 3 items
        console.log(`... and ${searchResults.length - 3} more items.\n`);

        console.log('='.repeat(50) + '\n');

        // 3. Fetch Page Info
        // Using the link from first search result or a fallback
        const targetUrl = searchResults[0]?.link || "https://nekopoi.care/sexfriend-gakuen-episode-1-subtitle-indonesia/";
        console.log(`📄 Fetching page info for: ${targetUrl}...`);
        const info = await NekopoiScrapper.getInfo(targetUrl);
        console.log('✅ Page info fetched successfully!');
        console.log(JSON.stringify(info, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

runExample();

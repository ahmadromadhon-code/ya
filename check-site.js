const { getInfo } = require('./NekopoiScrapper');

(async () => {
  console.log('=== Test Series Page ===');
  try {
    const info = await getInfo('https://nekopoi.care/hentai/gaki-ni-modotte-yarinaoshi/');
    console.log('Title:', info.title);
    console.log('Image:', info.image ? '✓' : 'NULL');
    console.log('Description:', info.description ? info.description.substring(0, 100) : 'EMPTY');
    console.log('Genres:', info.genres);
    console.log('Episodes:', info.episodes.length);
    info.episodes.forEach((ep, i) => {
      console.log(`  [${i+1}] ${ep.badge} | ${ep.title.substring(0, 50)} | thumb: ${ep.thumb ? '✓' : '✗'}`);
    });
  } catch(e) { console.log('❌ Error:', e.message); }

  console.log('\n=== Test Episode Page ===');
  try {
    const info = await getInfo('https://nekopoi.care/gaki-ni-modotte-yarinaoshi-episode-2-subtitle-indonesia/');
    console.log('Title:', info.title);
    console.log('Image:', info.image ? '✓' : 'NULL');
    console.log('Description:', info.description ? info.description.substring(0, 80) : 'EMPTY');
    console.log('Streams:', info.streams.length);
    console.log('Downloads:', info.downloads.length, 'groups');
    console.log('Episodes (should be 0):', info.episodes.length);
  } catch(e) { console.log('❌ Error:', e.message); }
})();

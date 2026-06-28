const express = require('express');
const dns = require('dns');
const path = require('path');
const NekopoiScrapper = require('./NekopoiScrapper');

// Set custom DNS to bypass ISP blocking (Internet Positif) in Indonesia
dns.setServers(['94.140.14.14', '94.140.14.15']);

// Override dns.lookup globally so that Axios and other HTTP modules respect dns.setServers
const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    } else if (typeof options === 'number') {
        options = { family: options };
    } else if (!options) {
        options = {};
    }

    const family = options.family || 0;
    const all = options.all || false;

    // Use original lookup for localhost and IP addresses
    if (hostname === 'localhost' || require('net').isIP(hostname)) {
        return originalLookup(hostname, options, callback);
    }

    const resolveDns = (host, fam, cb) => {
        if (fam === 6) {
            dns.resolve6(host, (err, addresses) => {
                if (err) return cb(err);
                cb(null, addresses, 6);
            });
        } else {
            dns.resolve4(host, (err, addresses) => {
                if (err) {
                    if (family === 0) {
                        return dns.resolve6(host, (err6, addresses6) => {
                            if (err6) return cb(err);
                            cb(null, addresses6, 6);
                        });
                    }
                    return cb(err);
                }
                cb(null, addresses, 4);
            });
        }
    };

    resolveDns(hostname, family, (err, addresses, resolvedFamily) => {
        if (err) {
            // Fallback to OS DNS if custom resolver fails
            return originalLookup(hostname, options, callback);
        }

        if (all) {
            const results = addresses.map(addr => ({ address: addr, family: resolvedFamily }));
            return callback(null, results);
        } else {
            return callback(null, addresses[0], resolvedFamily);
        }
    });
};

const app = express();
const PORT = process.env.PORT || 3005;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint: GET /api/latest
app.get('/api/latest', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const category = req.query.category || null; // e.g. https://nekopoi.care/category/hentai/
    try {
        const data = await NekopoiScrapper.getLatest(page, category);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint: GET /api/search
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const page = parseInt(req.query.page) || 1;
    
    if (!query) {
        return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }
    
    try {
        const data = await NekopoiScrapper.search(query, page);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint: GET /api/info
app.get('/api/info', async (req, res) => {
    const url = req.query.url;
    
    if (!url) {
        return res.status(400).json({ success: false, error: 'Query parameter "url" is required' });
    }
    
    try {
        const data = await NekopoiScrapper.getInfo(url);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint: GET /api/image-proxy
// Proxies images from nekopoi.care to bypass hotlink protection
app.get('/api/image-proxy', async (req, res) => {
    const imageUrl = req.query.url;

    if (!imageUrl) {
        return res.status(400).send('Missing url parameter');
    }

    // Only allow nekopoi.care domain for security
    try {
        const parsed = new URL(imageUrl);
        if (!parsed.hostname.endsWith('nekopoi.care')) {
            return res.status(403).send('Only nekopoi.care images are allowed');
        }
    } catch {
        return res.status(400).send('Invalid URL');
    }

    try {
        const axios = require('axios');
        const response = await axios.get(imageUrl, {
            responseType: 'stream',
            timeout: 10000,
            headers: {
                'Referer': 'https://nekopoi.care/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
            }
        });

        res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 1 day
        response.data.pipe(res);
    } catch (error) {
        res.status(500).send('Failed to fetch image');
    }
});

const os = require('os');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log(`🚀 Nekopoi Scrapper Web Client is running!`);
    console.log(`💻 Local:   http://localhost:${PORT}`);
    console.log(`📱 Network: http://${localIP}:${PORT}`);
});

module.exports = app;

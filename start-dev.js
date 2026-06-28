/**
 * start-dev.js
 * Membunuh proses yang sedang menggunakan port 3005, lalu memulai server.
 */
const { execSync, spawn } = require('child_process');
const PORT = process.env.PORT || 3005;

function killPort(port) {
    try {
        const result = execSync(`netstat -ano`, { encoding: 'utf8' });
        const lines = result.split('\n');
        const pids = new Set();

        lines.forEach(line => {
            if (line.includes(`:${port}`) && line.includes('LISTENING')) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && !isNaN(pid) && pid !== '0') {
                    pids.add(pid);
                }
            }
        });

        if (pids.size > 0) {
            console.log(`🔪 Mematikan proses di port ${port}: PID ${[...pids].join(', ')}`);
            pids.forEach(pid => {
                try {
                    execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                } catch (_) { /* sudah mati */ }
            });
            // Tunggu sebentar agar port benar-benar bebas
            const wait = Date.now() + 1000;
            while (Date.now() < wait) { /* busy wait 1s */ }
            console.log(`✅ Port ${port} sudah bebas.\n`);
        }
    } catch (e) {
        // netstat gagal, lanjut saja
    }
}

killPort(PORT);

const server = spawn('node', ['server.js'], { stdio: 'inherit', shell: false });

server.on('exit', (code) => {
    process.exit(code ?? 0);
});

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || 5000;
const CUSTOMER_API_FILE = path.join(__dirname, '..', 'customer-app', 'src', 'services', 'api.js');
const TUNNEL_URL_FILE = path.join(__dirname, 'tunnel-url.txt');

// Helper to check if server is already running on PORT
function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      resolve(true);
    });
    tester.on('error', () => {
      resolve(false);
    });
    tester.setTimeout(1500, () => {
      tester.destroy();
      resolve(false);
    });
  });
}

// Helper to update customer-app/src/services/api.js
function updateCustomerAppApi(tunnelUrl) {
  try {
    if (fs.existsSync(CUSTOMER_API_FILE)) {
      let content = fs.readFileSync(CUSTOMER_API_FILE, 'utf8');
      const regex = /export const BACKEND_TUNNEL_URL = [^;]*;/;
      const replacement = `export const BACKEND_TUNNEL_URL = '${tunnelUrl}';`;
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        fs.writeFileSync(CUSTOMER_API_FILE, content, 'utf8');
        console.log(`[Auto-Config] Updated customer-app api.js with tunnel URL: ${tunnelUrl}`);
      } else {
        console.log(`[Auto-Config] Notice: Could not find BACKEND_TUNNEL_URL constant in api.js`);
      }
    }
  } catch (err) {
    console.error(`[Auto-Config Error] Failed to update customer-app api.js:`, err.message);
  }

  try {
    fs.writeFileSync(TUNNEL_URL_FILE, tunnelUrl, 'utf8');
  } catch (err) {
    // Ignore
  }
}

async function startServer() {
  const inUse = await isPortInUse(PORT);
  if (!inUse) {
    console.log(`[Backend] Starting Express backend server on port ${PORT}...`);
    const serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    serverProcess.on('error', (err) => {
      console.error('[Backend Error]:', err);
    });
  } else {
    console.log(`[Backend] Express server already running on port ${PORT}.`);
  }
}

function startTunnel() {
  console.log('====================================================');
  console.log(' Starting Real HTTPS Tunnel for WiFi & Mobile Data ');
  console.log('====================================================');
  console.log('Initiating secure SSH reverse tunnel with TLS...');

  const ssh = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3',
    '-R', `80:localhost:${PORT}`,
    'nokey@localhost.run'
  ]);

  let tunnelFound = false;

  ssh.stdout.on('data', (data) => {
    const output = data.toString();
    // Look for https://*.lhr.life or https://*.localhost.run
    const match = output.match(/https:\/\/[a-zA-Z0-9.\-_]+\.lhr\.life/) ||
                  output.match(/https:\/\/[a-zA-Z0-9.\-_]+\.localhost\.run/);

    if (match && !tunnelFound) {
      tunnelFound = true;
      const tunnelUrl = match[0];
      
      console.log('\n====================================================');
      console.log(' 🎉 REAL HTTPS TUNNEL ACTIVE & READY! 🎉');
      console.log('====================================================');
      console.log(` Public Tunnel URL: ${tunnelUrl}`);
      console.log(` Mobile API Root:   ${tunnelUrl}/api`);
      console.log(` Health Check:      ${tunnelUrl}/api/health`);
      console.log('====================================================');
      console.log(' Works over:');
      console.log('  ✔️ 4G/5G Cellular Mobile Data');
      console.log('  ✔️ Any Wi-Fi Network / Hotspot');
      console.log('  ✔️ Real Android/iOS Devices');
      console.log('====================================================\n');

      updateCustomerAppApi(tunnelUrl);
    }
  });

  ssh.stderr.on('data', (data) => {
    const text = data.toString();
    if (!text.includes('Pseudo-terminal') && !text.includes('Warning') && !text.includes('Welcome')) {
      // debug message if needed
    }
  });

  ssh.on('close', (code) => {
    console.log(`[Tunnel] SSH process closed (code ${code}). Reconnecting in 5s...`);
    setTimeout(startTunnel, 5000);
  });

  ssh.on('error', (err) => {
    console.error(`[Tunnel Error] SSH failed:`, err.message);
    console.log('[Tunnel] Trying localtunnel fallback...');
    startLocalTunnelFallback();
  });
}

function startLocalTunnelFallback() {
  try {
    const localtunnel = require('localtunnel');
    localtunnel({ port: PORT }).then((tunnel) => {
      console.log('\n====================================================');
      console.log(` LocalTunnel Active: ${tunnel.url}`);
      console.log(` API Endpoint:       ${tunnel.url}/api`);
      console.log('====================================================\n');
      updateCustomerAppApi(tunnel.url);

      tunnel.on('close', () => {
        console.log('LocalTunnel closed. Reconnecting...');
        setTimeout(startLocalTunnelFallback, 5000);
      });
    }).catch(e => {
      console.error('LocalTunnel error:', e.message);
    });
  } catch (e) {
    console.error('LocalTunnel not available:', e.message);
  }
}

async function main() {
  await startServer();
  // Give server 1 second to bind if newly started
  setTimeout(startTunnel, 1000);
}

main();

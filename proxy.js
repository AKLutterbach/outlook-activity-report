/**
 * Simple HTTP proxy to serve both API and Add-in through one ngrok tunnel
 * API: https://ngrok-url/api/*
 * Add-in: https://ngrok-url/*
 */

const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Redirect root to taskpane.html
  if (req.url === '/') {
    res.writeHead(302, { 'Location': '/taskpane.html' });
    res.end();
    return;
  }

  // Route /api/* to API server (port 3000)
  if (req.url.startsWith('/api') || req.url.startsWith('/health') || req.url.startsWith('/auth')) {
    proxy.web(req, res, { target: 'https://localhost:3000', secure: false });
  } 
  // Route everything else to add-in server (port 3001)
  else {
    proxy.web(req, res, { target: 'https://localhost:3001', secure: false });
  }
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end('Proxy error');
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`✅ Proxy server running on http://localhost:${PORT}`);
  console.log(`   Add-in UI: http://localhost:${PORT}/`);
  console.log(`   API: http://localhost:${PORT}/api/*`);
  console.log(`\n🚀 Run: ngrok http 8080`);
});

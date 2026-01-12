const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy host.json
const hostJson = path.join(__dirname, 'host.json');
const destHostJson = path.join(distDir, 'host.json');
if (fs.existsSync(hostJson)) {
  fs.copyFileSync(hostJson, destHostJson);
  console.log('✓ host.json');
}

console.log('Function build preparation complete! (v4 programming model - no function.json needed)');

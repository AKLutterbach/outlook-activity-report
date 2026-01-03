const fs = require('fs');
const path = require('path');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy host.json
fs.copyFileSync(
  path.join(__dirname, 'host.json'),
  path.join(distDir, 'host.json')
);

// Copy package.json
fs.copyFileSync(
  path.join(__dirname, 'package.json'),
  path.join(distDir, 'package.json')
);

// Copy Functions folders (they're already in the right structure)
const functionsDir = path.join(__dirname, 'src', 'functions');
const functions = fs.readdirSync(functionsDir);

functions.forEach(funcName => {
  const funcPath = path.join(functionsDir, funcName);
  if (fs.statSync(funcPath).isDirectory()) {
    const destPath = path.join(distDir, funcName);
    fs.mkdirSync(destPath, { recursive: true });
    
    // Copy function.json
    if (fs.existsSync(path.join(funcPath, 'function.json'))) {
      fs.copyFileSync(
        path.join(funcPath, 'function.json'),
        path.join(destPath, 'function.json')
      );
    }
    
    // Copy index.ts (will be compiled by tsc)
    if (fs.existsSync(path.join(funcPath, 'index.ts'))) {
      fs.copyFileSync(
        path.join(funcPath, 'index.ts'),
        path.join(destPath, 'index.ts')
      );
    }
  }
});

// Copy shared modules that Functions need
const srcDirs = ['auth', 'db', 'utils'];
srcDirs.forEach(dir => {
  const srcPath = path.join(__dirname, 'src', dir);
  const destPath = path.join(distDir, dir);
  if (fs.existsSync(srcPath)) {
    copyRecursiveSync(srcPath, destPath);
  }
});

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(item => {
      copyRecursiveSync(path.join(src, item), path.join(dest, item));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Functions build structure created successfully');

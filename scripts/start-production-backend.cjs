const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Function to find the correct paths in production
function findBackendPath() {
  const possiblePaths = [
    path.join(__dirname, '../server'),           // Development
    path.join(process.cwd(), 'server'),          // If running from app root
    path.join(__dirname, '../../server'),        // Alternative structure
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, 'index.js'))) {
      return p;
    }
  }
  
  throw new Error('Backend path not found');
}

function startBackend() {
  try {
    const backendPath = path.join(path.dirname(process.execPath),'server');
    console.log(`🔍 Backend path found: ${backendPath}`);
    
    const backendProcess = spawn('node', ['index.js'], {
      cwd: backendPath,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    backendProcess.on('error', (err) => {
      console.error('❌ Impossible de lancer le backend Express :', err.message);
    });
    
    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });
    
    console.log('✅ Backend Express lancé sur http://localhost:3001');
    
    return backendProcess;
  } catch (error) {
    console.error('❌ Error starting backend:', error.message);
    throw error;
  }
}

// If running directly
if (require.main === module) {
  startBackend();
}

module.exports = { startBackend };
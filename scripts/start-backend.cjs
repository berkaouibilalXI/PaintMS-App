const { spawn } = require('child_process');
const path = require('path');

const backendPath = path.join(path.dirname(process.execPath), '../server');

const backendProcess = spawn('node', ['index.js'], {
  cwd: backendPath,
  stdio: 'inherit',
  shell: true,
});

backendProcess.on('error', (err) => {
  console.error('❌ Impossible de lancer le backend Express :', err.message);
});

console.log('✅ Backend Express lancé sur http://localhost:3001');
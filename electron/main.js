const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const net = require("net");
const { startServer } = require("../server/index.js");

let backendPort;
let mainWindow;

// Simple function to find available port
function findAvailablePort(startPort = 3001) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, (err) => {
      if (err) {
        server.close();
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        const port = server.address().port;
        server.close(() => {
          resolve(port);
        });
      }
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

// IPC handler for printing invoices
ipcMain.handle('print-invoice', async (event, invoiceHTML) => {
  try {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Load the HTML content
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(invoiceHTML)}`);
    
    // Wait for content to load, then print
    printWindow.webContents.once('did-finish-load', () => {
      printWindow.webContents.print({
        silent: false, // Show print dialog
        printBackground: true,
        margins: {
          marginType: 'minimum'
        },
        pageSize: 'A4'
      }, (success, errorType) => {
        if (!success) {
          console.error('Print failed:', errorType);
          dialog.showErrorBox('Erreur d\'impression', 'La facture n\'a pas pu être imprimée.');
        }
        printWindow.close();
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Print error:', error);
    dialog.showErrorBox('Erreur', 'Erreur lors de l\'impression: ' + error.message);
    return { success: false, error: error.message };
  }
});

// IPC handler for getting app info
ipcMain.handle('get-app-info', () => {
  return {
    backendPort,
    version: app.getVersion(),
    name: app.getName()
  };
});

async function createWindow() {
  // Pick a free port dynamically
  backendPort = await findAvailablePort(3001);
  
  // Start the Express server on that port
  await startServer(backendPort);
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../assets/icon.ico'), // Add this when you have an icon
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    // Development → frontend served by Vite
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // Production → load built frontend
    await mainWindow.loadFile(path.join(__dirname, "../frontend/dist/index.html"));
  }

  // Expose backendPort to the frontend
  mainWindow.webContents.executeJavaScript(
    `window.backendPort = ${backendPort};`
  );
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('http://localhost')) {
    // Ignore certificate errors for localhost in development
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});
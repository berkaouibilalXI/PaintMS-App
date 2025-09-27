const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Environment info
  backendPort: process.env.BACKEND_PORT,
  
  // Print functionality
  printInvoice: async (htmlContent) => {
    try {
      const result = await ipcRenderer.invoke('print-invoice', htmlContent);
      return result;
    } catch (error) {
      console.error('Print error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // App info
  getAppInfo: async () => {
    try {
      const info = await ipcRenderer.invoke('get-app-info');
      return info;
    } catch (error) {
      console.error('Failed to get app info:', error);
      return null;
    }
  },
  
  // Platform info
  platform: process.platform,
  isElectron: true
});
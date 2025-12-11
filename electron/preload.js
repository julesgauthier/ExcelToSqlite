/* eslint-env node */

const { contextBridge, ipcRenderer } = require("electron");

const api = {
  app: {
    ping: () => ipcRenderer.invoke("app:ping"),
  },

  db: {
    getTables: () => ipcRenderer.invoke("db:getTables"),
    getTableColumns: (tableName) =>
      ipcRenderer.invoke("db:getColumns", tableName),
    getLastRows: (tableName, limit) =>
      ipcRenderer.invoke("db:getLastRows", tableName, limit),
    getImportLogs: (limit) => ipcRenderer.invoke("db:getImportLogs", limit),
    chooseFile: () => ipcRenderer.invoke('db:chooseSqliteFile'),
    setDbFile: (filePath) => ipcRenderer.invoke('db:setDbFile', filePath),
    getDbFile: () => ipcRenderer.invoke('db:getDbFile'),
  },

  excel: {
    open: (payload) => ipcRenderer.invoke("excel:open", payload),
    previewSheet: (payload) =>
      ipcRenderer.invoke("excel:previewSheet", payload),
  },

  import: {
    excelToTable: (payload) => ipcRenderer.invoke("db:importExcelToTable", payload),
    cancel: (importId) => ipcRenderer.invoke('import:cancel', importId),
    onProgress: (cb) => {
      const handler = (event, data) => cb && cb(data);
      ipcRenderer.on('import:progress', handler);
      return () => ipcRenderer.removeListener('import:progress', handler);
    },
  },
};

contextBridge.exposeInMainWorld("api", api);

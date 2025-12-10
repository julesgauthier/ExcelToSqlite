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
  },

  excel: {
    open: (payload) => ipcRenderer.invoke("excel:open", payload),
    previewSheet: (payload) =>
      ipcRenderer.invoke("excel:previewSheet", payload),
  },

  import: {
    excelToTable: (payload) =>
      ipcRenderer.invoke("db:importExcelToTable", payload),
  },
};

contextBridge.exposeInMainWorld("api", api);

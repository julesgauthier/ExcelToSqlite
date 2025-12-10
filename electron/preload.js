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
  },

  excel: {
    open: () => ipcRenderer.invoke("excel:open"),
    previewSheet: (payload) =>
      ipcRenderer.invoke("excel:previewSheet", payload),
  },

  import: {
    excelToTable: (payload) =>
      ipcRenderer.invoke("db:importExcelToTable", payload),
  },
};

contextBridge.exposeInMainWorld("api", api);

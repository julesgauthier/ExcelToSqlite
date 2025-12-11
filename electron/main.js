/* eslint-env node */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ExcelJS = require('exceljs');
const { getDb, getTables, getColumns, getLastRows, addImportLogWithErrors, getImportLogs } = require('./db/initDb');
const { setDbFile, getDbFile } = require('./db/initDb');

const isDev = !app.isPackaged;

let mainWindow;
// Map of active import tokens for cancellation: importId -> { cancel: boolean }
const importTokens = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialise la DB au démarrage (créé data.db + table users si besoin)
  getDb();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- Utilitaire pour construire la preview d'une feuille Excel ---
function buildSheetPreview(worksheet, maxRows = 5, page = 0) {
  const headerRow = worksheet.getRow(1);
  const columns = [];

  headerRow.eachCell((cell, colNumber) => {
    const raw = cell.value;
    let name = '';

    if (typeof raw === 'string') name = raw.trim();
    else if (raw && typeof raw.text === 'string') name = raw.text.trim();
    else name = `Colonne_${colNumber}`;

    columns.push({
      index: colNumber,
      name,
    });
  });

  const sampleRows = [];

  // compute start/end rows for the page (skip header row at index 1)
  const startRow = 2 + page * maxRows;
  const endRow = startRow + maxRows - 1;

  // Count total data rows (naive but sufficient)
  const totalRows = Math.max(worksheet.rowCount - 1, 0);

  for (let rowNumber = startRow; rowNumber <= Math.min(endRow, worksheet.rowCount); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const rowData = {};

    columns.forEach((col) => {
      const cell = row.getCell(col.index);
      let value = cell.value;

      if (value && typeof value === 'object' && 'text' in value) {
        value = value.text;
      }

      rowData[col.name] = value;
    });

    sampleRows.push(rowData);
  }

  return { columns, sampleRows, totalRows, page, limit: maxRows };
}

// ---- IPC TEST ----
ipcMain.handle('app:ping', async () => {
  return 'pong depuis le process main Electron';
});

// ---- IPC DB ----
ipcMain.handle('db:getTables', async () => {
  return getTables(); // [{ name: 'users' }, ...]
});

ipcMain.handle('db:getColumns', async (event, tableName) => {
  if (!tableName) return [];
  return getColumns(tableName);
});

// ---- IPC DB: récupérer les dernières lignes d'une table ----
ipcMain.handle('db:getLastRows', async (event, tableName, limit = 20) => {
  try {
    if (!tableName) return [];
    return getLastRows(tableName, limit);
  } catch (err) {
    console.error('Erreur db:getLastRows', err);
    return { error: true, message: err.message || 'Erreur inconnue' };
  }
});

// ---- IPC EXCEL: OUVERTURE & PREVIEW (multi-feuilles, 5 lignes) ----
ipcMain.handle('excel:open', async (event, payload = {}) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choisir un fichier Excel',
    filters: [{ name: 'Fichiers Excel', extensions: ['xlsx'] }],
    properties: ['openFile'],
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = filePaths[0];

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  if (!workbook.worksheets || workbook.worksheets.length === 0) {
    return {
      canceled: false,
      error: 'NO_WORKSHEET',
      message: 'Aucune feuille trouvée dans ce fichier Excel.',
    };
  }

  // Liste des feuilles
  const sheets = workbook.worksheets.map((ws, index) => ({
    index,
    name: ws.name,
  }));

  const activeSheetIndex = 0;
  const worksheet = workbook.worksheets[activeSheetIndex];

  const previewLimit = payload.limit || 5;
  const page = payload.page || 0;
  const { columns, sampleRows, totalRows } = buildSheetPreview(worksheet, previewLimit, page);

  return {
    canceled: false,
    filePath,
    sheets,
    activeSheetIndex,
    sheetName: worksheet.name,
    columns,
    sampleRows,
    totalRows,
    page,
    limit: previewLimit,
  };
});

// Preview d'une autre feuille du même fichier
ipcMain.handle('excel:previewSheet', async (event, { filePath, sheetIndex, limit = 5, page = 0 }) => {
  if (!filePath || typeof sheetIndex !== 'number') {
    return {
      error: 'BAD_PARAMS',
      message: 'Paramètres invalides pour le preview de feuille.',
    };
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[sheetIndex];

  if (!worksheet) {
    return {
      error: 'NO_SHEET',
      message: 'Feuille introuvable à cet index.',
    };
  }

  const { columns, sampleRows, totalRows } = buildSheetPreview(worksheet, limit, page);

  return {
    sheetIndex,
    sheetName: worksheet.name,
    columns,
    sampleRows,
    totalRows,
    page,
    limit,
  };
});

// ---- IPC IMPORT EXCEL → TABLE SQLITE (avec feuille choisie) ----
ipcMain.handle('db:importExcelToTable', async (event, payload) => {
  const { tableName, filePath, mapping, sheetIndex = 0 } = payload || {};

  // create an import token so the renderer can request cancellation
  const importId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  importTokens.set(importId, { cancel: false });

  if (!tableName || !filePath || !Array.isArray(mapping) || mapping.length === 0) {
    return {
      success: false,
      message: "Paramètres d'import invalides.",
    };
  }

  const mode = payload.mode || 'stop';

  try {
    const db = getDb();

    const dbColumns = mapping.map((m) => m.dbColumn);
    const excelColumns = mapping.map((m) => m.excelColumn);

    const placeholders = dbColumns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${dbColumns.join(', ')}) VALUES (${placeholders})`;
    const insertStmt = db.prepare(sql);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[sheetIndex];

    if (!worksheet) {
      return {
        success: false,
        message: "Feuille introuvable pour l'import.",
      };
    }

    const headerRow = worksheet.getRow(1);
    const excelHeaderMap = new Map();

    headerRow.eachCell((cell, colNumber) => {
      let raw = cell.value;
      let name = '';

      if (typeof raw === 'string') name = raw.trim();
      else if (raw && typeof raw.text === 'string') name = raw.text.trim();
      else name = `Colonne_${colNumber}`;

      excelHeaderMap.set(name, colNumber);
    });

    let insertedCount = 0;
    let failedCount = 0;
    const errors = [];
    let canceled = false;

    if (mode === 'continue') {
      // insert ligne par ligne, capturer les erreurs et continuer
      const totalRows = Math.max(worksheet.rowCount - 1, 0);
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);

        const values = excelColumns.map((excelColName) => {
          const colIndex = excelHeaderMap.get(excelColName);
          if (!colIndex) return null;

          const cell = row.getCell(colIndex);
          let value = cell.value;

          if (value && typeof value === 'object' && 'text' in value) {
            value = value.text;
          }

          return value ?? null;
        });

        // Check for cancellation request
        const token = importTokens.get(importId);
        if (token && token.cancel) {
          canceled = true;
          // notify renderer that we stopped
          try {
            event.sender.send('import:progress', {
              importId,
              inserted: insertedCount,
              failed: failedCount,
              total: totalRows,
              currentRow: rowNumber,
              percent: totalRows > 0 ? Math.round((insertedCount / totalRows) * 100) : 0,
              canceled: true,
            });
          } catch {
            // ignore
          }
          break;
        }

        try {
          insertStmt.run(values);
          insertedCount += 1;
        } catch (rowErr) {
          failedCount += 1;
          errors.push({ row: rowNumber, error: rowErr.message });
        }

        // Emit progress update to renderer
        try {
          event.sender.send('import:progress', {
            importId,
            inserted: insertedCount,
            failed: failedCount,
            total: totalRows,
            currentRow: rowNumber,
            percent: totalRows > 0 ? Math.round((insertedCount / totalRows) * 100) : 0,
            canceled: false,
          });
        } catch {
          // ignore send errors
        }
      }
    } else {
      // mode 'stop' (par défaut) : transactionnel, rollback on error
      // Cancellation is not supported in transactional mode because the
      // operation is executed atomically.
      const transaction = db.transaction(() => {
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber === 1) return;

          const values = excelColumns.map((excelColName) => {
            const colIndex = excelHeaderMap.get(excelColName);
            if (!colIndex) return null;

            const cell = row.getCell(colIndex);
            let value = cell.value;

            if (value && typeof value === 'object' && 'text' in value) {
              value = value.text;
            }

            return value ?? null;
          });

          insertStmt.run(values);
          insertedCount += 1;
        });
      });

      transaction();
    }

    // Enregistrement dans import_logs (même si des erreurs se sont produites)
    try {
      const now = new Date().toISOString();
      addImportLogWithErrors({
        imported_at: now,
        table_name: tableName,
        file_path: filePath,
        sheet_name: worksheet.name,
        rows_inserted: insertedCount,
        mode: mode,
        has_errors: failedCount > 0 ? 1 : 0,
        error_details: errors.length > 0 ? errors : null,
      });
    } catch (logErr) {
      console.error("Impossible d'enregistrer le log d'import :", logErr);
    }

    // Construire la réponse
    const result = {
      success: insertedCount > 0,
      inserted: insertedCount,
      failed: failedCount,
      errors: errors,
      message: `Import terminé : ${insertedCount} insérée(s), ${failedCount} échouée(s).`,
    };

    // indicate if import was canceled (only possible in 'continue' mode)
    if (canceled) result.canceled = true;

    // Si en mode stop et qu'il y a eu une erreur, considérer comme échec
    if (mode !== 'continue' && failedCount > 0) {
      result.success = false;
      result.message = `Import échoué après erreur: ${errors[0] && errors[0].error}`;
    }

    // Attach importId so renderer can cancel or track progress
    result.importId = importId;

    // clean up token before returning
    try {
      importTokens.delete(importId);
    } catch {
      // ignore
    }

    return result;
  } catch (error) {
    console.error("Erreur lors de l'import Excel → SQLite :", error);

    // Tenter d'enregistrer le log même en cas d'erreur critique
    try {
      const now = new Date().toISOString();
      addImportLogWithErrors({
        imported_at: now,
        table_name: tableName || null,
        file_path: filePath || null,
        sheet_name: null,
        rows_inserted: 0,
        mode: payload.mode || null,
        has_errors: 1,
        error_details: [{ error: error.message }],
      });
    } catch {
      console.error("Impossible d'enregistrer le log d'import après erreur :", logErr);
    }

    return {
      success: false,
      message: "Erreur lors de l'import : " + (error.message || 'inconnue'),
    };
  } finally {
    // ensure token is cleaned up in any case
    try {
      importTokens.delete(importId);
    } catch {
      // ignore
    }
  }
});

// IPC pour récupérer l'historique des imports
ipcMain.handle('db:getImportLogs', async (event, limit = 50) => {
  try {
    return getImportLogs(limit);
  } catch (err) {
    console.error('Erreur db:getImportLogs', err);
    return { error: true, message: err.message || 'Erreur inconnue' };
  }
});

// Choose a SQLite file via dialog (used by renderer)
ipcMain.handle('db:chooseSqliteFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choisir un fichier SQLite',
    filters: [{ name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }],
    properties: ['openFile'],
  });

  if (canceled || !filePaths || filePaths.length === 0) return { canceled: true };
  return { canceled: false, filePath: filePaths[0] };
});

// Set the active DB file path at runtime
ipcMain.handle('db:setDbFile', async (event, filePath) => {
  try {
    setDbFile(filePath);
    return { success: true, filePath: getDbFile() };
  } catch (err) {
    console.error('Erreur db:setDbFile', err);
    return { success: false, message: err.message || 'Erreur inconnue' };
  }
});

ipcMain.handle('db:getDbFile', async () => {
  try {
    return { filePath: getDbFile() };
  } catch (err) {
    console.error('Erreur db:getDbFile', err);
    return { filePath: null };
  }
});

// IPC pour annuler un import en cours (uniquement applicable en mode 'continue')
ipcMain.handle('import:cancel', async (event, importId) => {
  if (!importId) return { success: false, message: 'importId manquant' };
  const token = importTokens.get(importId);
  if (!token) return { success: false, message: 'importId introuvable ou déjà terminé' };
  token.cancel = true;
  return { success: true, message: 'Annulation demandée' };
});

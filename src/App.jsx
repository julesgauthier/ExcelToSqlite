import { useState } from "react";
import AppLayout from "./components/layout/AppLayout.jsx";
import DatabasePanel from "./components/db/DatabasePanel.jsx";
import ExcelPanel from "./components/excel/ExcelPanel.jsx";
import MappingPanel from "./components/mapping/MappingPanel.jsx";
import ConfigPanel from "./components/common/ConfigPanel.jsx";
import ConnectionPanel from "./components/db/ConnectionPanel.jsx";
import ImportHistoryPanel from "./components/db/ImportHistoryPanel.jsx";

function App() {
  const hasApi = typeof window !== "undefined" && window.api;

  // État SQLite
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [columns, setColumns] = useState([]);
  const [dbError, setDbError] = useState("");
  const [lastRows, setLastRows] = useState([]);

  // État Excel
  const [excelInfo, setExcelInfo] = useState(null);
  const [excelError, setExcelError] = useState("");

  // État mapping Excel → DB
  const [mapping, setMapping] = useState({});
  const [importResult, setImportResult] = useState("");
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('app_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        return { importMode: 'stop', ...parsed };
      }
    } catch {
      // ignore
    }
    return { importMode: 'stop' };
  });

  // ---- HANDLERS SQLITE ----

  const handleLoadTables = async () => {
    setDbError("");
    setColumns([]);
    setSelectedTable(null);
    setImportResult("");

    if (!hasApi || !window.api.db || typeof window.api.db.getTables !== "function") {
      setDbError("API Electron non disponible (db.getTables).");
      return;
    }

    try {
      const result = await window.api.db.getTables();
      setTables(result || []);
    } catch (e) {
      console.error(e);
      setDbError("Erreur lors du chargement des tables.");
    }
  };

  const handleSelectTable = async (tableName) => {
    setDbError("");
    setSelectedTable(tableName);
    setColumns([]);
    setImportResult("");
    setLastRows([]);

    if (
      !hasApi ||
      !window.api.db ||
      typeof window.api.db.getTableColumns !== "function"
    ) {
      setDbError("API Electron non disponible (db.getTableColumns).");
      return;
    }

    try {
      const result = await window.api.db.getTableColumns(tableName);
      setColumns(result || []);
      // Récupère les dernières lignes (20 par défaut)
      if (window.api.db && typeof window.api.db.getLastRows === "function") {
        try {
          const rows = await window.api.db.getLastRows(tableName, 20);
          if (Array.isArray(rows)) setLastRows(rows);
        } catch (err) {
          console.error('Erreur lors de la récupération des dernières lignes', err);
        }
      }
    } catch (e) {
      console.error(e);
      setDbError("Erreur lors du chargement des colonnes.");
    }
  };

  // ---- HANDLERS EXCEL ----

  const handleOpenExcel = async () => {
    setExcelError("");
    setExcelInfo(null);
    setImportResult("");
    setMapping({});

    if (
      !hasApi ||
      !window.api.excel ||
      typeof window.api.excel.open !== "function"
    ) {
      setExcelError("API Electron non disponible (excel.open).");
      return;
    }

    try {
      const result = await window.api.excel.open();

      if (!result || result.canceled) {
        return;
      }

      if (result.error) {
        setExcelError(
          result.message || "Erreur lors de la lecture du fichier Excel."
        );
        return;
      }

      setExcelInfo(result);
    } catch (e) {
      console.error(e);
      setExcelError(
        "Erreur lors de l'ouverture ou de la lecture du fichier Excel."
      );
    }
  };

  const handleChangeSheet = async (newIndex) => {
    if (!excelInfo || !excelInfo.filePath) return;

    if (
      !hasApi ||
      !window.api.excel ||
      typeof window.api.excel.previewSheet !== "function"
    ) {
      setExcelError("API Electron non disponible (excel.previewSheet).");
      return;
    }

    try {
      const result = await window.api.excel.previewSheet({
        filePath: excelInfo.filePath,
        sheetIndex: newIndex,
        page: 0,
      });

      if (result && !result.error) {
        setExcelInfo((prev) => ({
          ...prev,
          activeSheetIndex: newIndex,
          sheetName: result.sheetName,
          columns: result.columns,
          sampleRows: result.sampleRows,
          totalRows: result.totalRows,
          page: result.page || 0,
          limit: result.limit,
        }));
      } else if (result && result.error) {
        setExcelError(result.message || "Erreur lors du changement de feuille.");
      }
    } catch (err) {
      console.error(err);
      setExcelError("Erreur lors du chargement de la feuille sélectionnée.");
    }
  };

  // ---- HANDLERS MAPPING & IMPORT ----

  const handlePreviewPage = async (newPage) => {
    if (!excelInfo || !excelInfo.filePath) return;
    if (!window.api || !window.api.excel || typeof window.api.excel.previewSheet !== 'function') return;

    try {
      const result = await window.api.excel.previewSheet({
        filePath: excelInfo.filePath,
        sheetIndex: excelInfo.activeSheetIndex ?? 0,
        page: newPage,
      });

      if (result && !result.error) {
        setExcelInfo((prev) => ({
          ...prev,
          sheetName: result.sheetName || prev.sheetName,
          columns: result.columns,
          sampleRows: result.sampleRows,
          totalRows: result.totalRows,
          page: result.page || 0,
          limit: result.limit,
        }));
      }
    } catch {
      // ignore
    }
  };

  const handleChangeMapping = (dbColumn, excelColumnName) => {
    setMapping((prev) => ({
      ...prev,
      [dbColumn]: excelColumnName,
    }));
  };

  const handleImport = async () => {
    setImportResult("");

    if (
      !hasApi ||
      !window.api.import ||
      typeof window.api.import.excelToTable !== "function"
    ) {
      setImportResult("API Electron non disponible (import.excelToTable).");
      return;
    }

    if (!selectedTable) {
      setImportResult("Aucune table SQLite sélectionnée.");
      return;
    }

    if (!excelInfo || !excelInfo.filePath) {
      setImportResult("Aucun fichier Excel chargé.");
      return;
    }

    const mappingArray =
      columns
        .filter((col) => mapping[col.name])
        .map((col) => ({
          dbColumn: col.name,
          excelColumn: mapping[col.name],
        })) || [];

    if (mappingArray.length === 0) {
      setImportResult("Aucun mapping défini, rien à importer.");
      return;
    }

    try {
      const result = await window.api.import.excelToTable({
        tableName: selectedTable,
        filePath: excelInfo.filePath,
        mapping: mappingArray,
        sheetIndex: excelInfo.activeSheetIndex ?? 0,
        mode: settings.importMode,
      });

      if (!result) {
        setImportResult("Erreur inconnue lors de l'import.");
        return;
      }

      // Message détaillé
      if (typeof result.inserted === 'number' || typeof result.failed === 'number') {
        const inserted = result.inserted || 0;
        const failed = result.failed || 0;
        let msg = `Import terminé : ${inserted} insérée(s)`;
        if (failed > 0) msg += `, ${failed} échouée(s)`;
        if (result.errors && result.errors.length > 0) {
          msg += ` — 1ère erreur: ${result.errors[0].error}`;
        }
        setImportResult(msg);
      } else {
        setImportResult(result.message || (result.success ? "Import réussi." : "Import échoué."));
      }

      // Always notify other panels to refresh (history)
      try {
        window.dispatchEvent(new Event('import:completed'));
      } catch {
        // ignore
      }

      // Refresh the selected table's last rows/columns
      if (selectedTable) {
        try {
          await handleSelectTable(selectedTable);
        } catch {
          // ignore
        }
      }
      return result;
    } catch (e) {
      console.error(e);
      setImportResult("Erreur lors de l'appel à l'import.");
      return null;
    }
  };

  const handleSettingsChange = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Preview limit setting removed — preview uses server default.

  return (
    <AppLayout>
      <p style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
        <strong>API preload disponible :</strong>{" "}
        {hasApi ? "✅ oui" : "❌ non"}
      </p>

      <div className="panels">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 320 }}>
          <ConnectionPanel onConnected={handleLoadTables} />
          <DatabasePanel
          tables={tables}
          selectedTable={selectedTable}
          columns={columns}
          dbError={dbError}
          onLoadTables={handleLoadTables}
          onSelectTable={handleSelectTable}
          lastRows={lastRows}
          />

        </div>

        <ExcelPanel
          excelInfo={excelInfo}
          excelError={excelError}
          onOpenExcel={handleOpenExcel}
          onChangeSheet={handleChangeSheet}
          onChangePage={handlePreviewPage}
        />
      </div>

      <div className="panels-bottom">
        <MappingPanel
          selectedTable={selectedTable}
          columns={columns}
          excelInfo={excelInfo}
          mapping={mapping}
          importResult={importResult}
          onChangeMapping={handleChangeMapping}
          onSetMapping={setMapping}
          onImport={handleImport}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <ConfigPanel onChangeSettings={handleSettingsChange} />
          <ImportHistoryPanel />
        </div>
      </div>
    </AppLayout>
  );
}

export default App;

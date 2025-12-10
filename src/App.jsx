import { useState } from "react";
import AppLayout from "./components/layout/AppLayout.jsx";
import DatabasePanel from "./components/db/DatabasePanel.jsx";
import ExcelPanel from "./components/excel/ExcelPanel.jsx";
import MappingPanel from "./components/mapping/MappingPanel.jsx";

function App() {
  const hasApi = typeof window !== "undefined" && window.api;

  // État SQLite
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [columns, setColumns] = useState([]);
  const [dbError, setDbError] = useState("");

  // État Excel
  const [excelInfo, setExcelInfo] = useState(null);
  const [excelError, setExcelError] = useState("");

  // État mapping Excel → DB
  const [mapping, setMapping] = useState({});
  const [importResult, setImportResult] = useState("");

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
      });

      if (result && !result.error) {
        setExcelInfo((prev) => ({
          ...prev,
          activeSheetIndex: newIndex,
          sheetName: result.sheetName,
          columns: result.columns,
          sampleRows: result.sampleRows,
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
      });

      if (!result) {
        setImportResult("Erreur inconnue lors de l'import.");
        return;
      }

      if (result.success) {
        setImportResult(result.message || "Import réussi.");
      } else {
        setImportResult(result.message || "Import échoué.");
      }
    } catch (e) {
      console.error(e);
      setImportResult("Erreur lors de l'appel à l'import.");
    }
  };

  return (
    <AppLayout>
      <p style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
        <strong>API preload disponible :</strong>{" "}
        {hasApi ? "✅ oui" : "❌ non"}
      </p>

      <div className="panels">
        <DatabasePanel
          tables={tables}
          selectedTable={selectedTable}
          columns={columns}
          dbError={dbError}
          onLoadTables={handleLoadTables}
          onSelectTable={handleSelectTable}
        />

        <ExcelPanel
          excelInfo={excelInfo}
          excelError={excelError}
          onOpenExcel={handleOpenExcel}
          onChangeSheet={handleChangeSheet}
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
          onImport={handleImport}
        />
      </div>
    </AppLayout>
  );
}

export default App;

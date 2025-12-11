import { useState, useEffect, useRef } from 'react';
import SectionCard from "../common/SectionCard.jsx";

export default function MappingPanel({
  selectedTable,
  columns,
  excelInfo,
  mapping,
  importResult,
  onChangeMapping,
  onImport,
}) {
  const canShowMapping =
    selectedTable && excelInfo && excelInfo.columns && columns.length > 0;

  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const importIdRef = useRef(null);

  useEffect(() => {
    if (!window || !window.api || !window.api.import || !window.api.import.onProgress) return;

    const unsubscribe = window.api.import.onProgress((data) => {
      if (!data) return;
      // Only update progress for our current import
      if (importIdRef.current && data.importId !== importIdRef.current) return;

      setProgress(data);
      if (data.canceled || (data.total && data.inserted >= data.total)) {
        setIsImporting(false);
        // cleanup importId
        importIdRef.current = null;
      }
    });

    return () => {
      try {
        unsubscribe && unsubscribe();
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <SectionCard title="Mapping Excel → SQLite">
      {!selectedTable && <p>Sélectionne d&apos;abord une table SQLite.</p>}
      {(!excelInfo || !excelInfo.columns) && (
        <p>Charge un fichier Excel pour définir un mapping.</p>
      )}

      {canShowMapping && (
        <>
          <p style={{ fontSize: "0.9rem" }}>
            Table cible : <strong>{selectedTable}</strong>
          </p>
          <table className="table" style={{ marginTop: "0.5rem" }}>
            <thead>
              <tr>
                <th>Colonne SQLite</th>
                <th>Colonne Excel associée</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => (
                <tr key={col.cid}>
                  <td>{col.name}</td>
                  <td>
                    <select
                      value={mapping[col.name] || ""}
                      onChange={(e) =>
                        onChangeMapping(col.name, e.target.value || "")
                      }
                      style={{ width: "100%" }}
                    >
                      <option value="">(Ignorer)</option>
                      {excelInfo.columns.map((excelCol) => (
                        <option
                          key={excelCol.index}
                          value={excelCol.name}
                        >
                          {excelCol.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
            <button
              className="btn"
              onClick={async () => {
                setIsImporting(true);
                setProgress(null);
                importIdRef.current = null;
                try {
                  const result = await onImport();
                  if (result && result.importId) importIdRef.current = result.importId;
                  // If the import finishes quickly, ensure we stop importing state
                  if (result && (result.failed !== undefined || result.inserted !== undefined)) {
                    setIsImporting(false);
                    setProgress({ imported: result.inserted || 0, failed: result.failed || 0, percent: 100 });
                  }
                } catch {
                  setIsImporting(false);
                }
              }}
            >
              Importer vers SQLite
            </button>

            {isImporting && (
              <button
                className="btn btn-danger"
                onClick={async () => {
                  if (!importIdRef.current || !window.api || !window.api.import || !window.api.import.cancel) return;
                  try {
                    await window.api.import.cancel(importIdRef.current);
                  } catch {
                    // ignore
                  }
                }}
              >
                Annuler
              </button>
            )}
          </div>

          {progress && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                Progression: {progress.inserted ?? progress.imported ?? 0} insérées · {progress.failed ?? 0} échouées · {progress.percent ?? 0}%
              </div>
              <div style={{ background: '#eee', height: 10, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, progress.percent ?? 0)}%`, height: '100%', background: '#4caf50' }} />
              </div>
            </div>
          )}

          {importResult && (
            <p
              className={
                importResult.toLowerCase().includes("erreur") ||
                importResult.toLowerCase().includes("échoué")
                  ? "message-error"
                  : "message-success"
              }
            >
              <strong>{importResult}</strong>
            </p>
          )}
        </>
      )}
    </SectionCard>
  );
}

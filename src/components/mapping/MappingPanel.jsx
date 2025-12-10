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

          <button
            className="btn"
            style={{ marginTop: "1rem" }}
            onClick={onImport}
          >
            Importer vers SQLite
          </button>

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

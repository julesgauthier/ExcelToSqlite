import SectionCard from "../common/SectionCard.jsx";

export default function ExcelPanel({
  excelInfo,
  excelError,
  onOpenExcel,
  onChangeSheet,
  onChangePage,
}) {
  return (
    <SectionCard title="Fichier Excel">
      <button className="btn btn-secondary" onClick={onOpenExcel}>
        Charger un fichier Excel (.xlsx)
      </button>

      {excelError && (
        <p className="message-error">
          <strong>{excelError}</strong>
        </p>
      )}

      {excelInfo && (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ fontSize: "0.9rem" }}>
            <strong>Fichier :</strong> {excelInfo.filePath}
          </p>

          <p style={{ fontSize: "0.9rem" }}>
            <strong>Feuille active :</strong>{" "}
            {excelInfo.sheetName || "(non définie)"}
          </p>

          {excelInfo.sheets && excelInfo.sheets.length > 1 && (
            <div style={{ marginTop: "0.5rem" }}>
              <label style={{ fontSize: "0.9rem" }}>
                <strong>Changer de feuille :</strong>{" "}
                <select
                  value={excelInfo.activeSheetIndex ?? 0}
                  onChange={(e) => onChangeSheet(Number(e.target.value))}
                >
                  {excelInfo.sheets.map((s) => (
                    <option key={s.index} value={s.index}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <h3 style={{ marginTop: "1rem" }}>Colonnes détectées</h3>
          {excelInfo.columns.length === 0 && <p>Aucune colonne trouvée.</p>}
          {excelInfo.columns.length > 0 && (
            <ul style={{ paddingLeft: "1rem", marginTop: "0.25rem" }}>
              {excelInfo.columns.map((col) => (
                <li key={col.index} style={{ fontSize: "0.9rem" }}>
                  {col.index} – <strong>{col.name}</strong>
                </li>
              ))}
            </ul>
          )}

          <h3 style={{ marginTop: "1rem" }}>
            Exemple de lignes (page {((excelInfo.page ?? 0) + 1)}
            {excelInfo.totalRows ? ` — ${excelInfo.totalRows} lignes au total` : ''})
          </h3>
          {excelInfo.sampleRows.length === 0 && (
            <p>Aucune ligne de données trouvée.</p>
          )}
          {excelInfo.sampleRows.length > 0 && (
            <div className="table-scroll" style={{ marginTop: "0.5rem" }}>
              <table className="table">
                <thead>
                  <tr>
                    {excelInfo.columns.map((col) => (
                      <th key={col.index} style={{ whiteSpace: "nowrap" }}>
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelInfo.sampleRows.map((row, idx) => (
                    <tr key={idx}>
                      {excelInfo.columns.map((col) => (
                        <td
                          key={col.index}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          {row[col.name] != null
                            ? String(row[col.name])
                            : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

            {/* Pagination controls */}
            {typeof excelInfo.totalRows === 'number' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => onChangePage && onChangePage(Math.max(0, (excelInfo.page || 0) - 1))}
                  disabled={(excelInfo.page || 0) <= 0}
                >
                  Précédent
                </button>

                <div style={{ fontSize: '0.9rem' }}>
                  Page { (excelInfo.page || 0) + 1 } / { Math.max(1, Math.ceil((excelInfo.totalRows || 0) / (excelInfo.limit || 5))) }
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={() => onChangePage && onChangePage((excelInfo.page || 0) + 1)}
                  disabled={(excelInfo.page || 0) >= Math.max(0, Math.ceil((excelInfo.totalRows || 0) / (excelInfo.limit || 5)) - 1)}
                >
                  Suivant
                </button>
              </div>
            )}
        </div>
      )}
    </SectionCard>
  );
}

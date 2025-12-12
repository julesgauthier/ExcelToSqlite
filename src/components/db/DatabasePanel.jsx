import SectionCard from "../common/SectionCard.jsx";

export default function DatabasePanel({
  tables,
  selectedTable,
  columns,
  dbError,
  onLoadTables,
  onSelectTable,
  lastRows = [],
}) {
  return (
    <SectionCard title="Base SQLite">
      <button className="btn btn-secondary" onClick={onLoadTables}>
        Charger les tables SQLite
      </button>

      {dbError && (
        <p className="message-error">
          <strong>{dbError}</strong>
        </p>
      )}

      <div style={{ marginTop: "1rem" }}>
        <h3>Tables</h3>
        {tables.length === 0 && <p>Aucune table chargée.</p>}
        <ul style={{ 
          paddingLeft: "1rem", 
          margin: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          listStyle: "none"
        }}>
          {tables.map((t) => (
            <li key={t.name}>
              <button
                onClick={() => onSelectTable(t.name)}
                className="btn btn-secondary"
                style={{
                  padding: "0.4rem 1rem",
                  borderRadius: "9999px",
                  fontSize: "0.9rem",
                  background:
                    selectedTable === t.name ? "#1e3a8a" : "#ffffff",
                  color: selectedTable === t.name ? "#ffffff" : "#000000",
                  border: selectedTable === t.name ? "none" : "1px solid #e5e7eb",
                }}
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedTable && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>
            Colonnes de {selectedTable}
          </h3>
          {columns.length === 0 && <p>Aucune colonne à afficher.</p>}
          {columns.length > 0 && (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>NOT NULL</th>
                    <th>PK</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col) => (
                    <tr key={col.cid}>
                      <td>{col.name}</td>
                      <td>{col.type}</td>
                      <td>{col.notnull ? "✅" : "—"}</td>
                      <td>{col.pk ? "✅" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedTable && lastRows.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Dernières lignes de {selectedTable}</h3>
          <div className="table-scroll">
            {lastRows.length > 5 && (
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                Affichage des 5 derniers enregistrements sur {lastRows.length} disponibles
              </div>
            )}
            <table className="table">
              <thead>
                <tr>
                  {Object.keys(lastRows[0]).map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lastRows.slice(0, 5).map((r, idx) => (
                  <tr key={idx}>
                    {Object.keys(lastRows[0]).map((k) => (
                      <td key={k}>{String(r[k] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

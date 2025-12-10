import SectionCard from "../common/SectionCard.jsx";

export default function DatabasePanel({
  tables,
  selectedTable,
  columns,
  dbError,
  onLoadTables,
  onSelectTable,
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

      <div className="columns-layout" style={{ marginTop: "1rem" }}>
        <div>
          <h3>Tables</h3>
          {tables.length === 0 && <p>Aucune table chargée.</p>}
          <ul style={{ paddingLeft: "1rem", margin: 0 }}>
            {tables.map((t) => (
              <li key={t.name} style={{ marginBottom: "0.25rem" }}>
                <button
                  onClick={() => onSelectTable(t.name)}
                  className="btn btn-secondary"
                  style={{
                    padding: "0.2rem 0.6rem",
                    borderRadius: "9999px",
                    fontSize: "0.8rem",
                    background:
                      selectedTable === t.name ? "#e5e7eb" : "#ffffff",
                  }}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>
            Colonnes{" "}
            {selectedTable ? `de ${selectedTable}` : "(sélectionne une table)"}
          </h3>
          {columns.length === 0 && <p>Aucune colonne à afficher.</p>}
          {columns.length > 0 && (
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
          )}
        </div>
      </div>
    </SectionCard>
  );
}

import SectionCard from "../common/SectionCard.jsx";
import { useEffect, useState } from "react";

export default function ImportHistoryPanel() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    setError("");
    if (!window.api || !window.api.db || typeof window.api.db.getImportLogs !== "function") {
      setError("API Electron non disponible (db.getImportLogs).");
      return;
    }

    try {
      const result = await window.api.db.getImportLogs(50);
      if (Array.isArray(result)) setLogs(result);
      else setError("Erreur lors de la récupération des logs.");
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la récupération des logs.");
    }
  };

  useEffect(() => {
    // defer first fetch to avoid synchronous setState in effect
    const t = setTimeout(() => fetchLogs(), 0);

    const onImport = () => fetchLogs();
    window.addEventListener('import:completed', onImport);

    return () => {
      clearTimeout(t);
      window.removeEventListener('import:completed', onImport);
    };
  }, []);

  return (
    <SectionCard title="Historique des imports">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div></div>
        <div>
          <button className="btn btn-secondary" onClick={fetchLogs}>
            Rafraîchir
          </button>
        </div>
      </div>

      {error && <p className="message-error"><strong>{error}</strong></p>}

      {logs.length === 0 && !error && <p style={{ fontStyle: 'italic' }}>Aucun import enregistré.</p>}

      {logs.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Table</th>
                <th>Fichier</th>
                <th>Lignes</th>
                <th>Mode</th>
                <th>Has errors</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.imported_at).toLocaleString()}</td>
                  <td>{l.table_name}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.file_path}</td>
                  <td>{l.rows_inserted}</td>
                  <td>{l.mode || '-'}</td>
                  <td>{l.has_errors ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

import React from "react";
import SectionCard from "../common/SectionCard.jsx";
import { useEffect, useState } from "react";

export default function ImportHistoryPanel() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showAllMap, setShowAllMap] = useState({});

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
                <th>Statut</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const errs = Array.isArray(l.error_details) ? l.error_details : [];
                const preview = errs.slice(0, 10);
                const showAll = !!showAllMap[l.id];

                const downloadErrorDetails = (log) => {
                  try {
                    const content = JSON.stringify(log.error_details || [], null, 2);
                    const blob = new Blob([content], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `import-${log.id}-errors.json`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  } catch (e) {
                    console.error('Erreur téléchargement détails', e);
                  }
                };

                return (
                  <React.Fragment key={l.id}>
                    <tr>
                      <td>{new Date(l.imported_at).toLocaleString()}</td>
                      <td>{l.table_name}</td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.file_path}</td>
                      <td>{l.rows_inserted}</td>
                      <td>{l.mode || '-'}</td>
                      <td title={l.has_errors ? 'Erreurs détectées' : 'Aucun problème'}>
                        {l.has_errors ? <span style={{ color: 'crimson' }}>❌</span> : <span style={{ color: 'green' }}>✅</span>}
                      </td>
                      <td>
                        {errs.length > 0 ? (
                          <>
                            <button className="btn btn-link" onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}>
                              Détails ({errs.length})
                            </button>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>

                    {expandedId === l.id && (
                      <tr key={`${l.id}-details`}>
                        <td colSpan={7} style={{ background: '#f9fafb' }}>
                          <div style={{ padding: '0.5rem', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong>Détails des erreurs</strong>
                              <div>
                                <button className="btn btn-sm btn-outline" onClick={() => downloadErrorDetails(l)} style={{ marginRight: '0.5rem' }}>
                                  Télécharger
                                </button>
                                {errs.length > 10 && (
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setShowAllMap(prev => ({ ...prev, [l.id]: !prev[l.id] }))}
                                  >
                                    {showAll ? `Masquer` : `Afficher tout (${errs.length})`}
                                  </button>
                                )}
                              </div>
                            </div>

                            <div style={{ marginTop: '0.5rem' }}>
                              {errs.length === 0 && <div>Aucune information détaillée.</div>}

                              {errs.length > 0 && (
                                <div style={{ maxHeight: showAll ? 400 : 180, overflow: 'auto', paddingRight: 8 }}>
                                  <ul style={{ marginTop: '0.5rem' }}>
                                    {(showAll ? errs : preview).map((err, i) => (
                                      <li key={i} style={{ marginBottom: '0.25rem' }}>
                                        {err && typeof err === 'object' && err.row ? `Ligne ${err.row} : ` : ''}
                                        {err && (err.error || (typeof err === 'string' ? err : JSON.stringify(err)))}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

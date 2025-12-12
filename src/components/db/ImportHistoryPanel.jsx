import React from "react";
import SectionCard from "../common/SectionCard.jsx";
import { useEffect, useState, useCallback } from "react";
import "./ImportHistoryPanel.css";

export default function ImportHistoryPanel() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showAllMap, setShowAllMap] = useState({});
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Recherche
  const [searchText, setSearchText] = useState("");

  const fetchLogs = useCallback(async (resetPage = false) => {
    setError("");
    if (!window.api || !window.api.db || typeof window.api.db.getImportLogs !== "function") {
      setError("API Electron non disponible (db.getImportLogs).");
      return;
    }

    const currentPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);

    try {
      const options = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        searchText: searchText.trim(),
      };

      const result = await window.api.db.getImportLogs(options);
      
      if (result && Array.isArray(result.data)) {
        setLogs(result.data);
        setTotal(result.total || 0);
      } else if (Array.isArray(result)) {
        // Backward compatibility
        setLogs(result);
        setTotal(result.length);
      } else {
        setError("Erreur lors de la récupération des logs.");
      }
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la récupération des logs.");
    }
  }, [page, pageSize, searchText]);

  useEffect(() => {
    // defer first fetch to avoid synchronous setState in effect
    const t = setTimeout(() => fetchLogs(), 0);

    const onImport = () => fetchLogs(true);
    window.addEventListener('import:completed', onImport);

    return () => {
      clearTimeout(t);
      window.removeEventListener('import:completed', onImport);
    };
  }, [fetchLogs]);

  useEffect(() => {
    const t = setTimeout(() => fetchLogs(), 0);
    return () => clearTimeout(t);
  }, [page, pageSize, fetchLogs]);

  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const handleSearch = () => {
    fetchLogs(true);
  };

  const handleClearSearch = () => {
    setSearchText("");
    setTimeout(() => fetchLogs(true), 0);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <SectionCard title="Historique des imports">
      {/* Barre de recherche et actions */}
      <div className="history-header">
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Rechercher par table ou fichier Excel..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          {searchText && (
            <button 
              className="btn btn-outline"
              onClick={handleClearSearch}
              title="Effacer la recherche"
            >
              ✕
            </button>
          )}
        </div>
        <button className="btn btn-secondary" onClick={() => fetchLogs()}>
          🔄 Rafraîchir
        </button>
      </div>

      {/* Stats */}
      {total > 0 && (
        <div className="history-stats">
          <span>{total} import{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}</span>
          <span>•</span>
          <span>Page {page} sur {totalPages}</span>
        </div>
      )}

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

                const formattedDate = new Date(l.imported_at).toLocaleString('fr-FR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                return (
                  <React.Fragment key={l.id}>
                    <tr>
                      <td style={{ whiteSpace: 'nowrap' }}>{formattedDate}</td>
                      <td>{l.table_name}</td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.file_path}>{l.file_path}</td>
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

      {/* Pagination */}
      {logs.length > 0 && totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm"
            onClick={() => handlePageChange(1)}
            disabled={!hasPrevPage}
          >
            ⏮️
          </button>
          <button
            className="btn btn-sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={!hasPrevPage}
          >
            ◀️ Précédent
          </button>
          
          <div className="page-info">
            <span>Page</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={page}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= totalPages) handlePageChange(val);
              }}
              className="page-input"
            />
            <span>sur {totalPages}</span>
          </div>

          <button
            className="btn btn-sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={!hasNextPage}
          >
            Suivant ▶️
          </button>
          <button
            className="btn btn-sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={!hasNextPage}
          >
            ⏭️
          </button>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="page-size-select"
          >
            <option value={10}>10 par page</option>
            <option value={20}>20 par page</option>
            <option value={50}>50 par page</option>
            <option value={100}>100 par page</option>
          </select>
        </div>
      )}
    </SectionCard>
  );
}

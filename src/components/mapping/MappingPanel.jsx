import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import SectionCard from "../common/SectionCard.jsx";
import { suggestCandidates } from '../../utils/fuzzyMatch';

// simple deterministic color picker from a key
const COLOR_PALETTE = ['#4caf50', '#ff7043', '#42a5f5', '#ab47bc', '#ffa726', '#26a69a', '#8d6e63', '#ef5350', '#29b6f6'];
function colorForKey(key) {
  if (!key) return COLOR_PALETTE[0];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[h % COLOR_PALETTE.length];
}

export default function MappingPanel({
  selectedTable,
  columns,
  excelInfo,
  mapping,
  importResult,
  onChangeMapping,
  onSetMapping,
  onImport,
}) {
  const canShowMapping =
    selectedTable && excelInfo && excelInfo.columns && columns.length > 0;

  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const importIdRef = useRef(null);
  const [suggestions, setSuggestions] = useState({});
  const [threshold, setThreshold] = useState(0.7);
  const containerRef = useRef(null);
  const excelRefs = useRef({});
  const dbRefs = useRef({});
  const [connectors, setConnectors] = useState([]);
  // autoApply flag removed: auto-apply is now automatic when columns are available
  const [hovered, setHovered] = useState(null);
  const [legendPosition, setLegendPosition] = useState('bottom'); // 'top' | 'bottom'

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

  // compute suggestions whenever excel columns or target columns change
  useEffect(() => {
    if (!excelInfo || !excelInfo.columns || !columns) {
      setSuggestions({});
      return;
    }

    const map = {};
    columns.forEach((col) => {
      const s = suggestCandidates(col.name, excelInfo.columns || []);
      map[col.name] = s;
    });
    setSuggestions(map);
    // Auto-apply behavior: when columns are available, fill unmapped DB columns
    // 1) exact canonical match by name
    // 2) fallback to top fuzzy suggestion >= threshold
    try {
      const newMapping = { ...(mapping || {}) };
      const excelByCanon = {};
      excelInfo.columns.forEach((ec) => {
        const key = canonical(ec.name);
        if (key) excelByCanon[key] = ec.name;
      });

      let changed = false;
      columns.forEach((col) => {
        if (newMapping[col.name]) return; // keep existing manual mapping

        // canonical exact match
        const k = canonical(col.name);
        if (k && excelByCanon[k]) {
          newMapping[col.name] = excelByCanon[k];
          changed = true;
          return;
        }

        // fuzzy top suggestion
        const top = (map[col.name] || [])[0];
        if (top && top.score >= threshold) {
          newMapping[col.name] = top.name;
          changed = true;
        }
      });

      if (changed) {
        if (typeof onSetMapping === 'function') onSetMapping(newMapping);
        else Object.keys(newMapping).forEach((k) => onChangeMapping(k, newMapping[k]));
      }
    } catch (e) {
      // ignore auto-apply errors
    }
  }, [excelInfo, columns]);

  

  // compute connector positions between mapped pairs
  // compute connector positions between mapped pairs
  const computeConnectors = () => {
    try {
      const cont = containerRef.current;
      if (!cont) return;

      const rect = cont.getBoundingClientRect();
      const newConnectors = [];

      columns.forEach((col) => {
        const dbCol = col.name;
        const excelName = mapping[dbCol];
        if (!excelName) return;

        const excelEl = excelRefs.current[excelName];
        const dbEl = dbRefs.current[dbCol];
        if (!excelEl || !dbEl) return;

        const eRect = excelEl.getBoundingClientRect();
        const dRect = dbEl.getBoundingClientRect();

        // compute center points relative to container
        const x1 = eRect.right - rect.left;
        const y1 = eRect.top + eRect.height / 2 - rect.top;
        const x2 = dRect.left - rect.left;
        const y2 = dRect.top + dRect.height / 2 - rect.top;

        newConnectors.push({ dbCol, excelName, x1, y1, x2, y2, color: colorForKey(dbCol + '|' + excelName) });
      });

      setConnectors(newConnectors);
    } catch (e) {
      // ignore layout errors
    }
  };

  useLayoutEffect(() => {
    // initial compute
    computeConnectors();

    // use RAF to batch rapid events
    let raf = null;

    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        computeConnectors();
        raf = null;
      });
    };

    window.addEventListener('resize', onResize);

    // also observe container size changes (e.g., flex layout changes)
    let ro = null;
    try {
      if (window.ResizeObserver && containerRef.current) {
        ro = new ResizeObserver(onResize);
        ro.observe(containerRef.current);
      }
    } catch (e) {
      // ignore
    }

    return () => {
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
      try {
        ro && ro.disconnect();
      } catch {
        // ignore
      }
    };
  }, [mapping, excelInfo, columns]);

  // canonicalize name: lowercase alnum only
  const canonical = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');

  // Manual trigger to apply auto-mapping on demand
  const handleAutoMap = () => {
    if (!excelInfo || !excelInfo.columns) return;
    const newMapping = { ...(mapping || {}) };
    const excelByCanon = {};
    excelInfo.columns.forEach((ec) => {
      const key = canonical(ec.name);
      if (key) excelByCanon[key] = ec.name;
    });

    columns.forEach((col) => {
      if (newMapping[col.name]) return; // keep existing manual mapping

      // canonical exact match
      const k = canonical(col.name);
      if (k && excelByCanon[k]) {
        newMapping[col.name] = excelByCanon[k];
        return;
      }

      // fuzzy top suggestion
      const top = (suggestions[col.name] || [])[0];
      if (top && top.score >= threshold) {
        newMapping[col.name] = top.name;
      }
    });

    if (typeof onSetMapping === 'function') onSetMapping(newMapping);
    else Object.keys(newMapping).forEach((k) => onChangeMapping(k, newMapping[k]));
  };

  const handleClearAll = () => {
    if (typeof onSetMapping === 'function') onSetMapping({});
    else {
      // clear individually
      columns.forEach((c) => onChangeMapping(c.name, ''));
    }
  };

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

          <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              {/* Legend (top) if requested */}
              {legendPosition === 'top' && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Légende</div>
                  {(connectors.length === 0) && <div style={{ fontSize: 12, color: '#666' }}>Aucun mapping</div>}
                  {connectors.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 12, height: 12, background: c.color, borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)' }} />
                      <div style={{ fontSize: 12, minWidth: 140 }}>{c.dbCol} ← <em style={{ color: '#333' }}>{c.excelName}</em></div>
                      <button className="btn btn-sm" title="Focus" onClick={() => setHovered({ type: 'db', key: c.dbCol })}>🔎</button>
                      <button className="btn btn-sm" title="Supprimer" onClick={() => onChangeMapping(c.dbCol, '')}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div ref={containerRef} style={{ position: 'relative' }}>
                {/* Left: Excel columns (draggable) */}
                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ width: '40%', border: '1px solid #eee', padding: 8, borderRadius: 6, background: '#fff' }}>
              <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}><strong>Colonnes Excel (glisser)</strong></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(excelInfo.columns || []).map((ec) => (
                  <div
                    key={ec.index}
                    ref={(el) => { if (el) excelRefs.current[ec.name] = el; }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', ec.name);
                      try { e.dataTransfer.effectAllowed = 'copy'; } catch {}
                    }}
                    onMouseEnter={() => setHovered({ type: 'excel', key: ec.name })}
                    onMouseLeave={() => setHovered(null)}
                    style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, background: '#fbfbfb', cursor: 'grab' }}
                  >
                    {ec.name}
                  </div>
                ))}
              </div>
            </div>

            {/* SVG connectors overlay */}
            <svg style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
              {connectors.map((c, i) => {
                const isHighlighted = hovered && (hovered.key === c.excelName || hovered.key === c.dbCol);
                const strokeW = isHighlighted ? 4 : 2;
                const opacity = hovered ? (isHighlighted ? 1 : 0.25) : 0.9;
                const r = isHighlighted ? 5 : 4;
                return (
                  <g key={i}>
                    <path d={`M ${c.x1} ${c.y1} C ${c.x1+40} ${c.y1} ${c.x2-40} ${c.y2} ${c.x2} ${c.y2}`} stroke={c.color || '#4caf50'} strokeWidth={strokeW} strokeOpacity={opacity} fill="none" />
                    {/* endpoints */}
                    <circle cx={c.x1} cy={c.y1} r={r} fill={c.color || '#4caf50'} opacity={opacity} />
                    <circle cx={c.x2} cy={c.y2} r={r} fill={c.color || '#4caf50'} opacity={opacity} />
                  </g>
                );
              })}
            </svg>

            {/* Right: DB columns (drop targets) */}
            <div style={{ flex: 1, border: '1px solid #eee', padding: 8, borderRadius: 6, background: '#fff' }}>
              <div style={{ fontSize: 12, color: '#333', marginBottom: 6 }}><strong>Colonnes SQLite (déposer)</strong></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {columns.map((col) => (
                  <div
                    key={col.cid}
                    ref={(el) => { if (el) dbRefs.current[col.name] = el; }}
                    onDragOver={(e) => { e.preventDefault(); try { e.dataTransfer.dropEffect = 'copy'; } catch {} }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const excelName = e.dataTransfer.getData('text/plain');
                      if (excelName) onChangeMapping(col.name, excelName);
                    }}
                    onMouseEnter={() => setHovered({ type: 'db', key: col.name })}
                    onMouseLeave={() => setHovered(null)}
                    style={{ padding: '8px', border: '1px dashed #ddd', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: mapping[col.name] ? '#f7fff7' : '#fff' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: 600 }}>{col.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{mapping[col.name] || <em>(vide)</em>}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {mapping[col.name] && (
                        <button className="btn btn-sm" onClick={() => onChangeMapping(col.name, '')}>✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
                </div>
              </div>

              {/* Legend (bottom) if requested */}
              {legendPosition === 'bottom' && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Légende</div>
                  {(connectors.length === 0) && <div style={{ fontSize: 12, color: '#666' }}>Aucun mapping</div>}
                  {connectors.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 14, height: 14, background: c.color, borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)' }} />
                      <div style={{ fontSize: 12, flex: 1 }}>{c.dbCol} ← <em style={{ color: '#333' }}>{c.excelName}</em></div>
                      <button className="btn btn-sm" title="Focus" onClick={() => setHovered({ type: 'db', key: c.dbCol })}>🔎</button>
                      <button className="btn btn-sm" title="Supprimer" onClick={() => onChangeMapping(c.dbCol, '')}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={handleAutoMap} title="Appliquer mappage automatique">Mappage auto</button>
            <button className="btn btn-danger" onClick={handleClearAll}>Supprimer tous les liens</button>
          </div>

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

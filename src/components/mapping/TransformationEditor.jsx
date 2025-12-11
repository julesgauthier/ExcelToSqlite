import { useState, useEffect } from 'react';
import './TransformationEditor.css';

export default function TransformationEditor({ 
  dbColumn,
  excelColumn,
  excelColumns = [],
  initialExpression = '',
  sampleData = [],
  onSave,
  onCancel,
}) {
  const [expression, setExpression] = useState(initialExpression);
  const [validation, setValidation] = useState({ valid: true });
  const [preview, setPreview] = useState(null);
  const [showHelper, setShowHelper] = useState(false);
  const [docs, setDocs] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Charger la documentation des fonctions
  useEffect(() => {
    const loadDocs = async () => {
      if (window.api && window.api.transform) {
        const result = await window.api.transform.getDocs();
        setDocs(result);
      }
    };
    loadDocs();
  }, []);

  // Valider en temps réel avec debounce
  useEffect(() => {
    if (!expression || !expression.trim()) {
      setValidation({ valid: true });
      setPreview(null);
      return;
    }
    
    setIsValidating(true);
    const timer = setTimeout(async () => {
      try {
        // Validation de la syntaxe
        const validationResult = await window.api.transform.validate({
          expression,
          columns: excelColumns
        });
        
        setValidation(validationResult);
        
        // Si valide, générer un preview
        if (validationResult.valid && sampleData.length > 0) {
          const previewResult = await window.api.transform.preview({
            expression,
            sampleData: sampleData.slice(0, 3)
          });
          
          if (previewResult.success) {
            setPreview(previewResult.results);
          }
        }
      } catch (err) {
        setValidation({ valid: false, error: err.message });
      } finally {
        setIsValidating(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [expression, excelColumns, sampleData]);

  const handleInsertFunction = (syntax) => {
    setExpression(prev => prev + syntax);
  };

  const handleInsertColumn = (colName) => {
    setExpression(prev => prev + `{${colName}}`);
  };

  return (
    <div className="transformation-editor-overlay" onClick={(e) => {
      if (e.target.className === 'transformation-editor-overlay') onCancel();
    }}>
      <div className="transformation-editor">
        <div className="editor-header">
          <h3>⚡ Transformation pour <strong>{dbColumn}</strong></h3>
          <button className="btn-close" onClick={onCancel} title="Fermer">✕</button>
        </div>

        <div className="editor-body">
          {/* Info sur la colonne source */}
          {excelColumn && (
            <div className="source-info">
              <span className="label">Source Excel:</span>
              <code>{excelColumn}</code>
            </div>
          )}

          {/* Zone d'édition de l'expression */}
          <div className="expression-group">
            <label>Expression de transformation</label>
            <textarea
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="Ex: AGE({date_naissance}) ou {prix_ht} * 1.20 ou UPPER({nom})"
              rows={4}
              className={!validation.valid ? 'error' : ''}
            />
            
            {/* Validation */}
            {isValidating && (
              <div className="validation-message info">
                ⏳ Validation en cours...
              </div>
            )}
            
            {!isValidating && !validation.valid && (
              <div className="validation-message error">
                ❌ {validation.error}
              </div>
            )}
            
            {!isValidating && validation.valid && expression && (
              <div className="validation-message success">
                ✅ Expression valide
              </div>
            )}
          </div>

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div className="preview-section">
              <h4>👁️ Aperçu de la transformation</h4>
              <div className="preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>→</th>
                      <th>Résultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((result, idx) => (
                      <tr key={idx} className={!result.success ? 'error-row' : ''}>
                        <td>
                          <code>{JSON.stringify(result.original[excelColumn] || result.original)}</code>
                        </td>
                        <td>→</td>
                        <td>
                          {result.success ? (
                            <strong>{JSON.stringify(result.transformed)}</strong>
                          ) : (
                            <span className="error-text">{result.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Helper toggle */}
          <button 
            className="btn btn-secondary"
            onClick={() => setShowHelper(!showHelper)}
          >
            {showHelper ? '📖 Masquer l\'aide' : '💡 Afficher l\'aide'}
          </button>

          {/* Helper panel */}
          {showHelper && docs && (
            <div className="helper-panel">
              <FunctionHelper 
                docs={docs} 
                excelColumns={excelColumns}
                onInsertFunction={handleInsertFunction}
                onInsertColumn={handleInsertColumn}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="editor-footer">
          <button 
            onClick={() => onSave(expression)}
            disabled={!validation.valid || isValidating}
            className="btn btn-primary"
          >
            Enregistrer la transformation
          </button>
          <button 
            onClick={() => {
              setExpression('');
              onSave('');
            }}
            className="btn btn-outline"
          >
            Supprimer la transformation
          </button>
          <button onClick={onCancel} className="btn btn-secondary">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

function FunctionHelper({ docs, excelColumns, onInsertFunction, onInsertColumn }) {
  const [activeTab, setActiveTab] = useState('dates');

  const tabs = [
    { id: 'dates', label: '📅 Dates', key: 'dates' },
    { id: 'text', label: '🔤 Texte', key: 'text' },
    { id: 'math', label: '🔢 Maths', key: 'math' },
    { id: 'conversion', label: '🔄 Conversion', key: 'conversion' },
    { id: 'conditions', label: '❓ Conditions', key: 'conditions' },
    { id: 'columns', label: '📊 Colonnes', key: 'columns' },
  ];

  return (
    <div className="function-helper">
      <h4>📚 Fonctions disponibles</h4>
      
      {/* Tabs */}
      <div className="helper-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="helper-content">
        {activeTab === 'columns' ? (
          <div className="column-list">
            <p>Cliquez sur une colonne pour l&apos;insérer :</p>
            {excelColumns.map(col => (
              <button
                key={col}
                className="column-chip"
                onClick={() => onInsertColumn(col)}
              >
                {col}
              </button>
            ))}
          </div>
        ) : (
          <div className="function-list">
            {docs[tabs.find(t => t.id === activeTab)?.key]?.map(fn => (
              <div key={fn.name} className="function-item">
                <div className="function-header">
                  <strong>{fn.name}</strong>
                  <button
                    className="btn-insert"
                    onClick={() => onInsertFunction(fn.syntax)}
                    title="Insérer"
                  >
                    +
                  </button>
                </div>
                <code>{fn.syntax}</code>
                <p>{fn.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Examples */}
      <div className="helper-examples">
        <h5>💡 Exemples courants</h5>
        <ul>
          <li><code>AGE({'{date_naissance}'})</code> - Calculer l&apos;âge</li>
          <li><code>{'{prix_ht}'} * 1.20</code> - Ajouter TVA 20%</li>
          <li><code>UPPER(TRIM({'{nom}'}))</code> - Nettoyer et majuscules</li>
          <li><code>CONCAT({'{prenom}'}, " ", {'{nom}'})</code> - Nom complet</li>
          <li><code>IF({'{age}'} &gt;= 18, "Majeur", "Mineur")</code> - Condition</li>
        </ul>
      </div>
    </div>
  );
}

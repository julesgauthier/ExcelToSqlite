import { useState, useEffect } from 'react';
import SectionCard from '../common/SectionCard.jsx';

export default function ConnectionPanel({ onConnected }) {
  const [currentFile, setCurrentFile] = useState(null);
  const [chosenFile, setChosenFile] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!window || !window.api || !window.api.db || !window.api.db.getDbFile) return;
      try {
        const res = await window.api.db.getDbFile();
        if (res && res.filePath && mounted) setCurrentFile(res.filePath);
      } catch {
        // ignore
      }
    })();

    return () => { mounted = false; };
  }, []);

  const handleChoose = async () => {
    if (!window || !window.api || !window.api.db || !window.api.db.chooseFile) return;
    try {
      const res = await window.api.db.chooseFile();
      if (res && !res.canceled && res.filePath) {
        setChosenFile(res.filePath);
      }
    } catch {
      // ignore
    }
  };

  const handleConnect = async () => {
    setMessage('');
    const fileToUse = chosenFile || currentFile;
    try {
      const res = await window.api.db.setDbFile(fileToUse);
      if (res && res.success) {
        setCurrentFile(res.filePath);
        setMessage('Connexion établie.');
        onConnected && onConnected();
      } else {
        setMessage(res.message || 'Échec de la connexion');
      }
    } catch {
      setMessage('Erreur lors de la connexion');
    }
  };

  const handleReset = async () => {
    try {
      const res = await window.api.db.setDbFile(null);
      if (res && res.success) {
        setChosenFile('');
        setCurrentFile(res.filePath);
        setMessage('Réinitialisé au fichier par défaut.');
        onConnected && onConnected();
      }
    } catch {
      // ignore
    }
  };

  return (
    <SectionCard title="Connexion DB">
      <p style={{ fontSize: '0.9rem' }}>
        <strong>Fichier actif :</strong> {currentFile || '(fichier par défaut)'}
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button className="btn" onClick={handleChoose}>Choisir...</button>
        <input
          type="text"
          placeholder="Ou coller un chemin de fichier SQLite"
          value={chosenFile}
          onChange={(e) => setChosenFile(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={handleConnect}>Se connecter</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button className="btn btn-secondary" onClick={handleReset}>Utiliser le fichier par défaut</button>
      </div>

      {message && <p style={{ marginTop: '0.5rem' }}><strong>{message}</strong></p>}
    </SectionCard>
  );
}

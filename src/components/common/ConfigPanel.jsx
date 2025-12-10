import SectionCard from "../common/SectionCard.jsx";
import { useState, useEffect } from "react";

export default function ConfigPanel({ onChangeSettings }) {
  const [importMode, setImportMode] = useState("stop");
  const [previewLimit, setPreviewLimit] = useState(5);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("app_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.importMode) setImportMode(parsed.importMode);
        if (parsed.previewLimit) setPreviewLimit(Number(parsed.previewLimit));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const persist = (newSettings) => {
    const merged = { importMode, previewLimit, ...newSettings };
    try {
      localStorage.setItem("app_settings", JSON.stringify(merged));
    } catch (e) {
      console.error("Impossible de sauvegarder les settings", e);
    }
    if (onChangeSettings) onChangeSettings(merged);
  };

  return (
    <SectionCard title="Configuration">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <label>
          <strong>Mode d'import :</strong>
          <select
            value={importMode}
            onChange={(e) => {
              setImportMode(e.target.value);
              persist({ importMode: e.target.value });
            }}
            style={{ marginLeft: "0.5rem" }}
          >
            <option value="stop">Stop à la première erreur</option>
            <option value="continue">Continuer et logguer</option>
          </select>
        </label>

        <label>
          <strong>Limite d'aperçu Excel :</strong>
          <select
            value={previewLimit}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPreviewLimit(v);
              persist({ previewLimit: v });
            }}
            style={{ marginLeft: "0.5rem" }}
          >
            <option value={5}>5 lignes</option>
            <option value={10}>10 lignes</option>
            <option value={20}>20 lignes</option>
          </select>
        </label>
      </div>
    </SectionCard>
  );
}

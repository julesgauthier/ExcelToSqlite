import SectionCard from "../common/SectionCard.jsx";
import { useState } from "react";

export default function ConfigPanel({ onChangeSettings }) {
  const initialSettings = (() => {
    try {
      const raw = localStorage.getItem("app_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          importMode: parsed.importMode || "stop",
          previewLimit: parsed.previewLimit ? Number(parsed.previewLimit) : 5,
        };
      }
    } catch {
      // ignore
    }
    return { importMode: "stop", previewLimit: 5 };
  })();

  const [importMode, setImportMode] = useState(initialSettings.importMode);
  const [previewLimit, setPreviewLimit] = useState(initialSettings.previewLimit);

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

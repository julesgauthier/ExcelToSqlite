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
        };
      }
    } catch {
      // ignore
    }
    return { importMode: "stop" };
  })();

  const [importMode, setImportMode] = useState(initialSettings.importMode);

  const persist = (newSettings) => {
    const merged = { importMode, ...newSettings };
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
      </div>
    </SectionCard>
  );
}

export default function AppLayout({ children }) {
  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">Excel2SQLite</h1>
        <p className="app-subtitle">
          Outil de mapping et d&apos;import de fichiers Excel vers une base SQLite
          locale.
        </p>
      </header>
      {children}
    </div>
  );
}

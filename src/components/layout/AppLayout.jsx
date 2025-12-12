import './AppLayout.css';

export default function AppLayout({ children }) {
  return (
    <div className="app-layout-with-sidebar">
      <div className="app-content">
        {children}
      </div>
    </div>
  );
}

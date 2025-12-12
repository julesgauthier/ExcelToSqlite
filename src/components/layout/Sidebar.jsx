import './Sidebar.css';
import logo from '../../assets/logo.png';

export default function Sidebar({ tabs, activeTab, onTabChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="Excel2SQLite" className="sidebar-logo" />
      </div>
      
      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="sidebar-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-version">v1.1.0</div>
      </div>
    </aside>
  );
}

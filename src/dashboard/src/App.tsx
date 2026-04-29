import { useState, useEffect } from 'react';
import { Overview } from './pages/Overview';
import { AppDetail } from './pages/AppDetail';
import { CrashDetail } from './pages/CrashDetail';
import './styles.css';

interface AppInfo {
  id: string;
  name: string;
  bundleId: string;
}

type Page = 'overview' | 'detail' | 'crashes';

export function App() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [page, setPage] = useState<Page>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/apps')
      .then((r) => r.json())
      .then((d) => {
        setApps(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selectedAppName = apps.find((a) => a.id === selectedApp)?.name || '';

  function selectApp(id: string) {
    setSelectedApp(id);
    setPage('detail');
  }

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand" onClick={() => { setSelectedApp(null); setPage('overview'); }}>
          ShipApp
          <span className="sidebar-brand-sub">Release Track</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Navigation</div>
          <button
            className={`sidebar-item ${page === 'overview' ? 'active' : ''}`}
            onClick={() => { setSelectedApp(null); setPage('overview'); }}
          >
            <span className="sidebar-item-icon">🏠</span>
            <span className="sidebar-item-text">Overview</span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Apps</div>
          {apps.map((app) => (
            <button
              key={app.id}
              className={`sidebar-item ${selectedApp === app.id ? 'active' : ''}`}
              onClick={() => selectApp(app.id)}
            >
              <span className="sidebar-item-icon">📱</span>
              <span className="sidebar-item-text">{app.name}</span>
            </button>
          ))}
        </div>

        {selectedApp && (
          <div className="sidebar-section">
            <div className="sidebar-label">Pages</div>
            <button
              className={`sidebar-item ${page === 'detail' ? 'active' : ''}`}
              onClick={() => setPage('detail')}
            >
              <span className="sidebar-item-icon">📊</span>
              <span className="sidebar-item-text">Dashboard</span>
            </button>
            <button
              className={`sidebar-item ${page === 'crashes' ? 'active' : ''}`}
              onClick={() => setPage('crashes')}
            >
              <span className="sidebar-item-icon">💥</span>
              <span className="sidebar-item-text">Crashes</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : page === 'crashes' && selectedApp ? (
          <CrashDetail appId={selectedApp} appName={selectedAppName} />
        ) : page === 'detail' && selectedApp ? (
          <AppDetail appId={selectedApp} appName={selectedAppName} />
        ) : (
          <Overview apps={apps} onSelect={selectApp} />
        )}
      </main>
    </div>
  );
}

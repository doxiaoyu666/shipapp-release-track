import { useState, useEffect } from 'react';
import { Overview } from './pages/Overview';
import { AppDetail } from './pages/AppDetail';
import './styles.css';

interface AppInfo {
  id: string;
  name: string;
  bundleId: string;
}

export function App() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
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

  return (
    <div className="app">
      <header className="header">
        <h1 onClick={() => setSelectedApp(null)} style={{ cursor: 'pointer' }}>
          📊 ShipApp Release Track
        </h1>
      </header>
      <main className="main">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : selectedApp ? (
          <AppDetail
            appId={selectedApp}
            appName={apps.find((a) => a.id === selectedApp)?.name || ''}
            onBack={() => setSelectedApp(null)}
          />
        ) : (
          <Overview apps={apps} onSelect={setSelectedApp} />
        )}
      </main>
    </div>
  );
}

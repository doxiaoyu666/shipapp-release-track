import { useState, useEffect } from 'react';

interface AppInfo {
  id: string;
  name: string;
  bundleId: string;
}

interface CrashSummary {
  totalWeight: number;
  signatureCount: number;
}

interface Props {
  apps: AppInfo[];
  onSelect: (id: string) => void;
}

export function Overview({ apps, onSelect }: Props) {
  const [crashSummaries, setCrashSummaries] = useState<Record<string, CrashSummary>>({});

  useEffect(() => {
    for (const app of apps) {
      fetch(`/api/apps/${app.id}/crashes/trend?days=7`)
        .then((r) => r.json())
        .then((d) => {
          const data = d.data || [];
          const totalWeight = data.reduce((sum: number, r: any) => sum + (r.totalWeight || 0), 0);
          const signatureCount = data.reduce((sum: number, r: any) => sum + (r.signatureCount || 0), 0);
          setCrashSummaries((prev) => ({ ...prev, [app.id]: { totalWeight, signatureCount } }));
        });
    }
  }, [apps]);

  if (apps.length === 0) {
    return (
      <div className="empty-state">
        <p>No apps tracked yet.</p>
        <p>Run: <code>shipapp-release-track collect --app YourApp</code></p>
      </div>
    );
  }

  return (
    <div>
      <div className="app-grid">
        {apps.map((app) => {
          const summary = crashSummaries[app.id];
          return (
            <div key={app.id} className="app-card" onClick={() => onSelect(app.id)}>
              <h3>{app.name}</h3>
              <div className="bundle-id">{app.bundleId}</div>
              <div className="stats">
                <div className="stat">
                  <span className="stat-label">Crash Signatures (7d)</span>
                  <span className="stat-value">{summary?.signatureCount ?? '—'}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Crash Weight (7d)</span>
                  <span className="stat-value">{summary?.totalWeight?.toFixed(1) ?? '—'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

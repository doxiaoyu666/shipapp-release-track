import { useState, useEffect } from 'react';
import { CrashChart } from '../components/CrashChart';
import { DownloadChart } from '../components/DownloadChart';

interface Props {
  appId: string;
  appName: string;
  onBack: () => void;
}

interface CrashSig {
  signatureId: string;
  build: string;
  signature: string;
  weight: number;
  collectedAt: string;
}

function weightClass(w: number): string {
  if (w >= 1) return 'weight-high';
  if (w >= 0.3) return 'weight-medium';
  return 'weight-low';
}

export function AppDetail({ appId, appName, onBack }: Props) {
  const [crashTrend, setCrashTrend] = useState<any[]>([]);
  const [downloadTrend, setDownloadTrend] = useState<any[]>([]);
  const [crashes, setCrashes] = useState<CrashSig[]>([]);

  useEffect(() => {
    fetch(`/api/apps/${appId}/crashes/trend?days=30`)
      .then((r) => r.json())
      .then((d) => setCrashTrend((d.data || []).reverse()));

    fetch(`/api/apps/${appId}/downloads/trend?days=30`)
      .then((r) => r.json())
      .then((d) => setDownloadTrend((d.data || []).reverse()));

    fetch(`/api/apps/${appId}/crashes`)
      .then((r) => r.json())
      .then((d) => setCrashes(d.data || []));
  }, [appId]);

  // Group crashes by build
  const buildGroups = new Map<string, CrashSig[]>();
  for (const c of crashes) {
    const list = buildGroups.get(c.build) || [];
    list.push(c);
    buildGroups.set(c.build, list);
  }

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Back to Overview</button>
      <div className="detail-header">
        <h2>{appName}</h2>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Crash Trend (30 days)</h3>
          <CrashChart data={crashTrend} />
        </div>
        <div className="chart-card">
          <h3>App Store Metrics (30 days)</h3>
          <DownloadChart data={downloadTrend} />
        </div>
      </div>

      <div className="chart-card">
        <h3>Crash Signatures by Build</h3>
        {crashes.length === 0 ? (
          <div className="empty-state">No crash data collected yet.</div>
        ) : (
          <>
            {Array.from(buildGroups.entries()).map(([build, sigs]) => (
              <div key={build} style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 8 }}>
                  <span className="build-badge">Build {build}</span>
                  <span style={{ marginLeft: 8, fontSize: 13, color: '#86868b' }}>
                    {sigs.length} signature{sigs.length > 1 ? 's' : ''}
                  </span>
                </div>
                <table className="crash-table">
                  <thead>
                    <tr>
                      <th>Signature</th>
                      <th>Weight</th>
                      <th>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sigs.map((c) => (
                      <tr key={c.signatureId}>
                        <td>{c.signature}</td>
                        <td className={weightClass(c.weight)}>{c.weight.toFixed(2)}</td>
                        <td>
                          {c.weight >= 1 ? '🔴 High' : c.weight >= 0.3 ? '🟡 Medium' : '🟢 Low'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

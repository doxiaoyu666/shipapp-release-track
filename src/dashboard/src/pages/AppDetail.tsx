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

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="detail-header">
        <h2>{appName}</h2>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Crash Trend (30 days)</h3>
          <CrashChart data={crashTrend} />
        </div>
        <div className="chart-card">
          <h3>Downloads (30 days)</h3>
          <DownloadChart data={downloadTrend} />
        </div>
      </div>

      <div className="chart-card">
        <h3>Crash Signatures</h3>
        {crashes.length === 0 ? (
          <div className="empty-state">No crash data collected yet.</div>
        ) : (
          <table className="crash-table">
            <thead>
              <tr>
                <th>Signature</th>
                <th>Build</th>
                <th>Weight</th>
                <th>Collected</th>
              </tr>
            </thead>
            <tbody>
              {crashes.slice(0, 20).map((c) => (
                <tr key={c.signatureId}>
                  <td>{c.signature}</td>
                  <td>{c.build}</td>
                  <td>{c.weight.toFixed(2)}</td>
                  <td>{new Date(c.collectedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

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

interface BuildSummary {
  build: string;
  totalWeight: number;
  signatureCount: number;
}

function weightClass(w: number): string {
  if (w >= 1) return 'weight-high';
  if (w >= 0.3) return 'weight-medium';
  return 'weight-low';
}

function trendArrow(current: number, previous: number | null): string {
  if (previous === null) return '';
  if (current > previous) return ` ↑ (was ${previous.toFixed(1)})`;
  if (current < previous) return ` ↓ (was ${previous.toFixed(1)})`;
  return ' → unchanged';
}

export function AppDetail({ appId, appName, onBack }: Props) {
  const [crashTrend, setCrashTrend] = useState<any[]>([]);
  const [downloadTrend, setDownloadTrend] = useState<any[]>([]);
  const [crashes, setCrashes] = useState<CrashSig[]>([]);
  const [buildSummaries, setBuildSummaries] = useState<BuildSummary[]>([]);

  useEffect(() => {
    fetch(`/api/apps/${appId}/crashes/trend?days=30`)
      .then((r) => r.json())
      .then((d) => setCrashTrend((d.data || []).reverse()));

    fetch(`/api/apps/${appId}/downloads/trend?days=30`)
      .then((r) => r.json())
      .then((d) => setDownloadTrend((d.data || []).reverse()));

    fetch(`/api/apps/${appId}/crashes`)
      .then((r) => r.json())
      .then((d) => {
        setCrashes(d.data?.signatures || []);
        setBuildSummaries(d.data?.byBuild || []);
      });
  }, [appId]);

  // Group crashes by build (already sorted DESC from API)
  const buildGroups = new Map<string, CrashSig[]>();
  for (const c of crashes) {
    const list = buildGroups.get(c.build) || [];
    list.push(c);
    buildGroups.set(c.build, list);
  }

  const buildList = Array.from(buildGroups.keys());

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Back to Overview</button>
      <div className="detail-header">
        <h2>{appName}</h2>
      </div>

      {/* Build comparison cards */}
      {buildSummaries.length > 0 && (
        <div className="charts-grid" style={{ marginBottom: 24 }}>
          {buildSummaries.slice(0, 3).map((b, i) => {
            const prevBuild = buildSummaries[i + 1] || null;
            const isLatest = i === 0;
            return (
              <div key={b.build} className="chart-card">
                <h3>
                  Build {b.build}
                  {isLatest && <span style={{ color: '#007aff', marginLeft: 8, fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>LATEST</span>}
                </h3>
                <div className="stats" style={{ marginTop: 12 }}>
                  <div className="stat">
                    <span className="stat-label">Crash Weight</span>
                    <span className="stat-value">
                      <span className={b.totalWeight >= 3 ? 'weight-high' : b.totalWeight >= 1 ? 'weight-medium' : 'weight-low'}>
                        {b.totalWeight.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 13, color: '#86868b' }}>
                        {trendArrow(b.totalWeight, prevBuild?.totalWeight ?? null)}
                      </span>
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Signatures</span>
                    <span className="stat-value">{b.signatureCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            {buildList.map((build, buildIdx) => {
              const sigs = buildGroups.get(build)!;
              const isLatest = buildIdx === 0;
              return (
                <div key={build} style={{ marginBottom: 24 }}>
                  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="build-badge">Build {build}</span>
                    {isLatest && (
                      <span style={{ background: '#007aff', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                        LATEST
                      </span>
                    )}
                    <span style={{ fontSize: 13, color: '#86868b' }}>
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
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

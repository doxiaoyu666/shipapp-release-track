import { apiRequest, fetchAll } from './asc-client';
import type { DailyMetrics } from './types';
import { createGunzip } from 'zlib';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

const STATE_DIR = path.join(process.env.HOME || '~', '.shipapp');
const ANALYTICS_STATE = path.join(STATE_DIR, 'analytics-state.json');

function loadAnalyticsState(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(ANALYTICS_STATE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveAnalyticsState(state: Record<string, string>) {
  fs.writeFileSync(ANALYTICS_STATE, JSON.stringify(state, null, 2));
}

/**
 * Try to find an existing report request ID from aso-tool state.
 */
function findExistingRequestId(appId: string): string | null {
  const possiblePaths = [
    path.join(process.env.HOME || '~', 'git/aso-tool/output/.asc_report_requests.json'),
  ];

  for (const p of possiblePaths) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (data[appId]?.ongoing) return data[appId].ongoing;
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Ensure an ongoing analytics report request exists for the app.
 */
async function ensureReportRequest(appId: string): Promise<string> {
  const state = loadAnalyticsState();

  // Check saved request
  if (state[appId]) {
    try {
      const res = await apiRequest('GET', `/analyticsReportRequests/${state[appId]}`);
      const attrs = res.data.attributes;
      if (attrs.accessType === 'ONGOING' && !attrs.stoppedDueToInactivity) {
        return state[appId];
      }
    } catch {
      // Saved request invalid, create new one
    }
  }

  // Create new ongoing request
  try {
    const res = await apiRequest('POST', '/analyticsReportRequests', {
      data: {
        type: 'analyticsReportRequests',
        attributes: { accessType: 'ONGOING' },
        relationships: {
          app: { data: { type: 'apps', id: appId } },
        },
      },
    });

    const requestId = res.data.id;
    state[appId] = requestId;
    saveAnalyticsState(state);
    return requestId;
  } catch (err: any) {
    // 409 = already exists. Try to find it from aso-tool state file.
    if (err.message?.includes('409')) {
      const fallbackId = findExistingRequestId(appId);
      if (fallbackId) {
        state[appId] = fallbackId;
        saveAnalyticsState(state);
        return fallbackId;
      }
    }
    throw err;
  }
}

/**
 * Fetch daily download/engagement metrics for an app.
 */
export async function fetchDailyMetrics(appId: string, days = 30): Promise<DailyMetrics[]> {
  const requestId = await ensureReportRequest(appId);

  // Find the engagement report
  const reports = await fetchAll(`/analyticsReportRequests/${requestId}/reports`);
  const engagementReport = reports.find((r: any) =>
    r.attributes.name?.includes('Engagement') && r.attributes.name?.includes('Detailed')
  );

  if (!engagementReport) return [];

  // Get recent instances
  const instances = await fetchAll(
    `/analyticsReports/${engagementReport.id}/instances?limit=${days}`
  );

  const results: DailyMetrics[] = [];

  for (const instance of instances.slice(0, days)) {
    const date = instance.attributes.processingDate;
    try {
      const segments = await fetchAll(
        `/analyticsReportInstances/${instance.id}/segments`
      );

      for (const segment of segments) {
        const url = segment.attributes?.url;
        if (!url) continue;

        const rows = await downloadAndParseCSV(url);
        const aggregated = aggregateByTerritory(rows, appId, date);
        results.push(...aggregated);
      }
    } catch {
      // Skip failed instances
    }
  }

  return results;
}

async function downloadAndParseCSV(url: string): Promise<string[][]> {
  const res = await fetch(url);
  if (!res.ok) return [];

  const buffer = Buffer.from(await res.arrayBuffer());

  // Try to decompress gzip
  try {
    const decompressed = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const gunzip = createGunzip();
      const stream = Readable.from(buffer);
      stream.pipe(gunzip);
      gunzip.on('data', (chunk: Buffer) => chunks.push(chunk));
      gunzip.on('end', () => resolve(Buffer.concat(chunks)));
      gunzip.on('error', reject);
    });
    return parseCSV(decompressed.toString('utf-8'));
  } catch {
    return parseCSV(buffer.toString('utf-8'));
  }
}

function parseCSV(text: string): string[][] {
  return text.split('\n').filter(Boolean).map((line) => line.split('\t'));
}

function aggregateByTerritory(
  rows: string[][],
  appId: string,
  date: string
): DailyMetrics[] {
  if (rows.length === 0) return [];

  const header = rows[0];
  const territoryIdx = header.findIndex((h) => h.toLowerCase().includes('territory'));
  const countsIdx = header.findIndex((h) => h.toLowerCase().includes('counts'));
  const eventIdx = header.findIndex((h) => h.toLowerCase().includes('event'));

  if (countsIdx === -1) return [];

  const byTerritory = new Map<string, DailyMetrics>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const territory = territoryIdx >= 0 ? row[territoryIdx] || 'UNKNOWN' : 'UNKNOWN';
    const count = parseInt(row[countsIdx] || '0', 10) || 0;
    const event = eventIdx >= 0 ? (row[eventIdx] || '').toLowerCase() : '';

    if (!byTerritory.has(territory)) {
      byTerritory.set(territory, {
        appId, date, territory, downloads: 0, pageViews: 0, impressions: 0,
      });
    }

    const m = byTerritory.get(territory)!;
    if (event.includes('download') || event.includes('install')) m.downloads += count;
    else if (event.includes('page view')) m.pageViews += count;
    else if (event.includes('impression')) m.impressions += count;
  }

  return Array.from(byTerritory.values());
}

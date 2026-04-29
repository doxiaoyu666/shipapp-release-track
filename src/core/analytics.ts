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

function findExistingRequestId(appId: string): string | null {
  const possiblePaths = [
    path.join(process.env.HOME || '~', 'git/aso-tool/output/.asc_report_requests.json'),
  ];
  for (const p of possiblePaths) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (data[appId]?.ongoing) return data[appId].ongoing;
    } catch { /* ignore */ }
  }
  return null;
}

async function ensureReportRequest(appId: string): Promise<string> {
  const state = loadAnalyticsState();
  if (state[appId]) {
    try {
      const res = await apiRequest('GET', `/analyticsReportRequests/${state[appId]}`);
      const attrs = res.data.attributes;
      if (attrs.accessType === 'ONGOING' && !attrs.stoppedDueToInactivity) {
        return state[appId];
      }
    } catch { /* invalid, create new */ }
  }

  try {
    const res = await apiRequest('POST', '/analyticsReportRequests', {
      data: {
        type: 'analyticsReportRequests',
        attributes: { accessType: 'ONGOING' },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    });
    const requestId = res.data.id;
    state[appId] = requestId;
    saveAnalyticsState(state);
    return requestId;
  } catch (err: any) {
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

function emptyMetrics(appId: string, date: string, territory: string): DailyMetrics {
  return {
    appId, date, territory,
    downloads: 0, redownloads: 0, updates: 0,
    pageViews: 0, impressions: 0,
    sessions: 0, activeDevices: 0,
    installations: 0, deletions: 0,
    proceeds: 0, units: 0,
    webImpressions: 0, webTaps: 0,
  };
}

// --- Report finding ---

let cachedReports: any[] | null = null;

async function getReports(appId: string): Promise<any[]> {
  if (cachedReports) return cachedReports;
  const requestId = await ensureReportRequest(appId);
  cachedReports = await fetchAll(`/analyticsReportRequests/${requestId}/reports`);
  return cachedReports;
}

function findReport(reports: any[], ...keywords: string[]): any | null {
  return reports.find((r: any) =>
    keywords.every(k => r.attributes.name?.includes(k))
  ) || null;
}

// --- CSV helpers ---

async function downloadAndParseCSV(url: string): Promise<string[][]> {
  const res = await fetch(url);
  if (!res.ok) return [];
  const buffer = Buffer.from(await res.arrayBuffer());
  try {
    const decompressed = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const gunzip = createGunzip();
      Readable.from(buffer).pipe(gunzip);
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

function colIndex(header: string[], ...keywords: string[]): number {
  return header.findIndex((h) => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));
}

async function fetchReportRows(report: any, days: number): Promise<{ date: string; rows: string[][] }[]> {
  if (!report) return [];
  const instances = await fetchAll(`/analyticsReports/${report.id}/instances?limit=${days}`);
  const results: { date: string; rows: string[][] }[] = [];
  for (const instance of instances.slice(0, days)) {
    const date = instance.attributes.processingDate;
    try {
      const segments = await fetchAll(`/analyticsReportInstances/${instance.id}/segments`);
      for (const segment of segments) {
        const url = segment.attributes?.url;
        if (!url) continue;
        const rows = await downloadAndParseCSV(url);
        results.push({ date, rows });
      }
    } catch { /* skip */ }
  }
  return results;
}

// --- Aggregation helpers ---

type MetricsMerger = (metrics: DailyMetrics, row: string[], header: string[]) => void;

function aggregateReport(
  reportRows: { date: string; rows: string[][] }[],
  appId: string,
  merger: MetricsMerger,
): Map<string, DailyMetrics> {
  // Each report instance's CSV covers multiple dates, and adjacent instances
  // overlap: the same CSV date appears in multiple instances with identical totals
  // but different row-level breakdowns. We must pick exactly ONE instance per
  // CSV date to avoid double-counting.
  const seenDates = new Set<string>();
  const byKey = new Map<string, DailyMetrics>();

  for (const { date: processingDate, rows } of reportRows) {
    if (rows.length === 0) continue;
    const header = rows[0];
    const dateIdx = colIndex(header, 'date');
    const tIdx = colIndex(header, 'territory');

    // Determine which CSV dates are in this batch
    const batchDates = new Set<string>();
    for (let i = 1; i < rows.length; i++) {
      const d = dateIdx >= 0 && rows[i][dateIdx] ? rows[i][dateIdx] : processingDate;
      batchDates.add(d);
    }

    // Only process dates not yet seen from a previous instance
    const newDates = new Set<string>();
    for (const d of batchDates) {
      if (!seenDates.has(d)) {
        newDates.add(d);
        seenDates.add(d);
      }
    }
    if (newDates.size === 0) continue;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const date = dateIdx >= 0 && row[dateIdx] ? row[dateIdx] : processingDate;
      if (!newDates.has(date)) continue;

      const territory = tIdx >= 0 ? row[tIdx] || 'UNKNOWN' : 'UNKNOWN';
      const key = `${date}|${territory}`;

      if (!byKey.has(key)) {
        byKey.set(key, emptyMetrics(appId, date, territory));
      }
      merger(byKey.get(key)!, row, header);
    }
  }

  return byKey;
}

// --- Main fetch function ---

export async function fetchDailyMetrics(appId: string, days = 30): Promise<DailyMetrics[]> {
  const reports = await getReports(appId);
  const merged = new Map<string, DailyMetrics>();

  function mergeInto(data: Map<string, DailyMetrics>) {
    for (const [key, m] of data) {
      const existing = merged.get(key);
      if (existing) {
        existing.downloads += m.downloads;
        existing.redownloads += m.redownloads;
        existing.updates += m.updates;
        existing.pageViews += m.pageViews;
        existing.impressions += m.impressions;
        existing.sessions += m.sessions;
        existing.activeDevices += m.activeDevices;
        existing.installations += m.installations;
        existing.deletions += m.deletions;
        existing.proceeds += m.proceeds;
        existing.units += m.units;
        existing.webImpressions += m.webImpressions;
        existing.webTaps += m.webTaps;
      } else {
        merged.set(key, { ...m });
      }
    }
  }

  // 1. Engagement (impressions, page views) — use Standard for more complete data
  const engReport = findReport(reports, 'Discovery', 'Engagement', 'Standard')
    || findReport(reports, 'Discovery', 'Engagement', 'Detailed');
  if (engReport) {
    const rows = await fetchReportRows(engReport, days);
    mergeInto(aggregateReport(rows, appId, (m, row, header) => {
      const eIdx = colIndex(header, 'event');
      const cIdx = colIndex(header, 'counts');
      if (cIdx === -1) return;
      const event = eIdx >= 0 ? (row[eIdx] || '').toLowerCase() : '';
      const count = parseInt(row[cIdx] || '0', 10) || 0;
      if (event.includes('page view')) m.pageViews += count;
      else if (event.includes('impression')) m.impressions += count;
    }));
  }

  // 2. Downloads (first-time, redownload, update)
  const dlReport = findReport(reports, 'Download', 'Detailed');
  if (dlReport) {
    const rows = await fetchReportRows(dlReport, days);
    mergeInto(aggregateReport(rows, appId, (m, row, header) => {
      const dtIdx = colIndex(header, 'download type');
      const cIdx = colIndex(header, 'counts');
      if (cIdx === -1) return;
      const dlType = dtIdx >= 0 ? (row[dtIdx] || '').toLowerCase() : '';
      const count = parseInt(row[cIdx] || '0', 10) || 0;
      if (dlType.includes('first-time')) m.downloads += count;
      else if (dlType.includes('redownload')) m.redownloads += count;
      else if (dlType.includes('update')) m.updates += count;
      else m.downloads += count;
    }));
  }

  // 3. Sessions — prefer Standard for completeness
  const sessReport = findReport(reports, 'Sessions', 'Standard')
    || findReport(reports, 'Sessions', 'Detailed');
  if (sessReport) {
    const rows = await fetchReportRows(sessReport, days);
    mergeInto(aggregateReport(rows, appId, (m, row, header) => {
      const sIdx = colIndex(header, 'sessions');
      const dIdx = colIndex(header, 'unique devices');
      if (sIdx >= 0) m.sessions += parseInt(row[sIdx] || '0', 10) || 0;
      if (dIdx >= 0) m.activeDevices += parseInt(row[dIdx] || '0', 10) || 0;
    }));
  }

  // 4. Installation and Deletion — prefer Standard for completeness
  const idReport = findReport(reports, 'Installation', 'Deletion', 'Standard')
    || findReport(reports, 'Installation', 'Deletion', 'Detailed');
  if (idReport) {
    const rows = await fetchReportRows(idReport, days);
    mergeInto(aggregateReport(rows, appId, (m, row, header) => {
      const eIdx = colIndex(header, 'event');
      const cIdx = colIndex(header, 'counts');
      if (cIdx === -1) return;
      const event = eIdx >= 0 ? (row[eIdx] || '').toLowerCase() : '';
      const count = parseInt(row[cIdx] || '0', 10) || 0;
      if (event.includes('install')) m.installations += count;
      else if (event.includes('delete')) m.deletions += count;
    }));
  }

  // 5. Purchases — prefer Standard
  const purchReport = findReport(reports, 'Purchases', 'Standard')
    || findReport(reports, 'Purchases', 'Detailed');
  if (purchReport) {
    const rows = await fetchReportRows(purchReport, days);
    mergeInto(aggregateReport(rows, appId, (m, row, header) => {
      const pIdx = colIndex(header, 'proceeds');
      const uIdx = colIndex(header, 'units');
      if (pIdx >= 0) m.proceeds += parseFloat(row[pIdx] || '0') || 0;
      if (uIdx >= 0) m.units += parseInt(row[uIdx] || '0', 10) || 0;
    }));
  }

  // 6. Web Preview Engagement — prefer Standard
  const webReport = findReport(reports, 'Web Preview', 'Standard')
    || findReport(reports, 'Web Preview', 'Detailed');
  if (webReport) {
    const rows = await fetchReportRows(webReport, days);
    mergeInto(aggregateReport(rows, appId, (m, row, header) => {
      const eIdx = colIndex(header, 'event');
      const cIdx = colIndex(header, 'counts');
      if (cIdx === -1) return;
      const event = eIdx >= 0 ? (row[eIdx] || '').toLowerCase() : '';
      const count = parseInt(row[cIdx] || '0', 10) || 0;
      if (event.includes('page view')) m.webImpressions += count;
      else if (event.includes('tap')) m.webTaps += count;
    }));
  }

  cachedReports = null;
  return Array.from(merged.values());
}

// --- Download sources ---

export interface SourceRow {
  sourceType: string;
  sourceInfo: string;
  downloadType: string;
  counts: number;
}

export async function fetchDownloadSources(appId: string, days = 30): Promise<Map<string, SourceRow[]>> {
  const reports = await getReports(appId);
  const dlReport = findReport(reports, 'Download', 'Detailed');
  if (!dlReport) return new Map();

  const rows = await fetchReportRows(dlReport, days);
  const byDate = new Map<string, SourceRow[]>();

  for (const { date: processingDate, rows: csvRows } of rows) {
    if (csvRows.length === 0) continue;
    const header = csvRows[0];
    const dateIdx = colIndex(header, 'date');
    const stIdx = colIndex(header, 'source type');
    const siIdx = colIndex(header, 'source info');
    const dtIdx = colIndex(header, 'download type');
    const cIdx = colIndex(header, 'counts');
    if (cIdx === -1) continue;

    for (let i = 1; i < csvRows.length; i++) {
      const row = csvRows[i];
      const date = dateIdx >= 0 && row[dateIdx] ? row[dateIdx] : processingDate;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push({
        sourceType: stIdx >= 0 ? row[stIdx] || 'Unknown' : 'Unknown',
        sourceInfo: siIdx >= 0 ? row[siIdx] || '' : '',
        downloadType: dtIdx >= 0 ? row[dtIdx] || '' : '',
        counts: parseInt(row[cIdx] || '0', 10) || 0,
      });
    }
  }

  cachedReports = null;
  return byDate;
}

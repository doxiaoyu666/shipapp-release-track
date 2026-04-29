import { generateToken, loadCredentials } from './auth';
import { createGunzip } from 'zlib';
import { Readable } from 'stream';
import type { DailyMetrics } from './types';

const BASE_URL = 'https://api.appstoreconnect.apple.com/v1';

interface SalesRow {
  date: string;
  appleId: string;
  units: number;
  productTypeId: string;
  developerProceeds: number;
  currency: string;
  countryCode: string;
}

function parseProductType(id: string): 'download' | 'update' | 'redownload' | 'iap' | 'other' {
  // Apple product type identifiers:
  // 1, 1F, 1T = Free/Paid app (first-time download)
  // 7, 7F, 7T = Update
  // 3, 3F, 3T = Redownload (from purchase history)
  // IA* = In-app purchase
  const upper = id.toUpperCase();
  if (upper.startsWith('IA')) return 'iap';
  if (upper === '7' || upper === '7F' || upper === '7T') return 'update';
  if (upper === '3' || upper === '3F' || upper === '3T') return 'redownload';
  if (upper === '1' || upper === '1F' || upper === '1T') return 'download';
  return 'other';
}

async function fetchSalesReport(vendorNumber: string, reportDate: string): Promise<SalesRow[]> {
  const creds = loadCredentials();
  const token = generateToken(creds);

  const params = new URLSearchParams({
    'filter[reportType]': 'SALES',
    'filter[reportSubType]': 'SUMMARY',
    'filter[frequency]': 'DAILY',
    'filter[vendorNumber]': vendorNumber,
    'filter[reportDate]': reportDate,
  });

  const url = `${BASE_URL}/salesReports?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return []; // no data for this date
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sales API [${res.status}]: ${text.slice(0, 200)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  let text: string;
  try {
    text = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const gunzip = createGunzip();
      Readable.from(buffer).pipe(gunzip);
      gunzip.on('data', (chunk: Buffer) => chunks.push(chunk));
      gunzip.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      gunzip.on('error', reject);
    });
  } catch {
    text = buffer.toString('utf-8');
  }

  const lines = text.split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split('\t');
  const dateIdx = header.findIndex(h => h.toLowerCase().includes('begin date'));
  const appleIdIdx = header.findIndex(h => h.toLowerCase().includes('apple identifier'));
  const unitsIdx = header.findIndex(h => h.toLowerCase() === 'units');
  const typeIdx = header.findIndex(h => h.toLowerCase().includes('product type identifier'));
  const proceedsIdx = header.findIndex(h => h.toLowerCase().includes('developer proceeds'));
  const currencyIdx = header.findIndex(h => h.toLowerCase().includes('currency of proceeds'));
  const countryIdx = header.findIndex(h => h.toLowerCase().includes('country code'));

  const rows: SalesRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 5) continue;

    // Parse date: MM/DD/YYYY -> YYYY-MM-DD
    const rawDate = cols[dateIdx] || '';
    const parts = rawDate.split('/');
    const date = parts.length === 3
      ? `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
      : rawDate;

    rows.push({
      date,
      appleId: cols[appleIdIdx] || '',
      units: parseInt(cols[unitsIdx] || '0', 10) || 0,
      productTypeId: cols[typeIdx] || '',
      developerProceeds: parseFloat(cols[proceedsIdx] || '0') || 0,
      currency: cols[currencyIdx] || 'USD',
      countryCode: cols[countryIdx] || '',
    });
  }

  return rows;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchSalesDailyMetrics(
  appId: string,
  vendorNumber: string,
  days: number,
): Promise<DailyMetrics[]> {
  const metricsMap = new Map<string, DailyMetrics>();

  const today = new Date();
  // Sales reports have ~2 day delay
  const startOffset = 2;

  for (let i = startOffset; i < days + startOffset; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);

    let rows: SalesRow[];
    try {
      rows = await fetchSalesReport(vendorNumber, dateStr);
    } catch (err: any) {
      if (err.message?.includes('404')) continue;
      // Silently skip dates with no data
      continue;
    }

    // Filter to target app
    const appRows = rows.filter(r => r.appleId === appId);
    if (appRows.length === 0) continue;

    for (const row of appRows) {
      const key = `${row.date}|${row.countryCode}`;
      if (!metricsMap.has(key)) {
        metricsMap.set(key, {
          appId,
          date: row.date,
          territory: row.countryCode,
          downloads: 0, redownloads: 0, updates: 0,
          pageViews: 0, impressions: 0,
          sessions: 0, activeDevices: 0,
          installations: 0, deletions: 0,
          proceeds: 0, units: 0,
          webImpressions: 0, webTaps: 0,
        });
      }

      const m = metricsMap.get(key)!;
      const type = parseProductType(row.productTypeId);

      // Sales API provides precise transaction-based data
      if (type === 'download') {
        m.downloads += row.units;
      } else if (type === 'redownload') {
        m.redownloads += row.units;
      } else if (type === 'update') {
        m.updates += row.units;
      } else if (type === 'iap') {
        m.units += row.units;
      }
      m.proceeds += row.developerProceeds;
    }
  }

  return Array.from(metricsMap.values());
}

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { AppInfo, CrashSignature, DailyMetrics, Release, CrashTrend, DownloadTrend } from './types';

const DB_DIR = path.join(process.env.HOME || '~', '.shipapp');
const DB_PATH = path.join(DB_DIR, 'release-track.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      name TEXT,
      bundle_id TEXT
    );

    CREATE TABLE IF NOT EXISTS releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT,
      version TEXT,
      build TEXT,
      released_at TEXT
    );

    CREATE TABLE IF NOT EXISTS crash_signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT,
      build TEXT,
      signature_id TEXT,
      signature TEXT,
      weight REAL,
      collected_at TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT,
      date TEXT,
      territory TEXT,
      downloads INTEGER DEFAULT 0,
      page_views INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_crash_sig ON crash_signatures(signature_id, collected_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily ON daily_metrics(app_id, date, territory);
  `);
}

// --- Apps ---

export function upsertApp(app: AppInfo) {
  const d = getDb();
  d.prepare('INSERT OR REPLACE INTO apps (id, name, bundle_id) VALUES (?, ?, ?)').run(
    app.id, app.name, app.bundleId
  );
}

export function getAllApps(): AppInfo[] {
  return getDb().prepare('SELECT id, name, bundle_id as bundleId FROM apps').all() as AppInfo[];
}

// --- Crashes ---

export function saveCrashSignatures(sigs: CrashSignature[]) {
  const d = getDb();
  const stmt = d.prepare(
    'INSERT OR REPLACE INTO crash_signatures (app_id, build, signature_id, signature, weight, collected_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const tx = d.transaction(() => {
    for (const s of sigs) {
      stmt.run(s.appId, s.build, s.signatureId, s.signature, s.weight, s.collectedAt);
    }
  });
  tx();
}

export function getCrashTrend(appId: string, days = 30): CrashTrend[] {
  return getDb().prepare(`
    SELECT date(collected_at) as date,
           SUM(weight) as totalWeight,
           COUNT(DISTINCT signature_id) as signatureCount
    FROM crash_signatures
    WHERE app_id = ?
    GROUP BY date(collected_at)
    ORDER BY date DESC
    LIMIT ?
  `).all(appId, days) as CrashTrend[];
}

export function getCrashSignatures(appId: string): CrashSignature[] {
  return getDb().prepare(`
    SELECT app_id as appId, build, signature_id as signatureId, signature, weight, collected_at as collectedAt
    FROM crash_signatures
    WHERE app_id = ?
    ORDER BY weight DESC
  `).all(appId) as CrashSignature[];
}

// --- Metrics ---

export function saveDailyMetrics(metrics: DailyMetrics[]) {
  const d = getDb();
  const stmt = d.prepare(
    'INSERT OR REPLACE INTO daily_metrics (app_id, date, territory, downloads, page_views, impressions) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const tx = d.transaction(() => {
    for (const m of metrics) {
      stmt.run(m.appId, m.date, m.territory, m.downloads, m.pageViews, m.impressions);
    }
  });
  tx();
}

export function getDownloadTrend(appId: string, days = 30): DownloadTrend[] {
  return getDb().prepare(`
    SELECT date,
           SUM(downloads) as downloads,
           SUM(page_views) as pageViews,
           SUM(impressions) as impressions
    FROM daily_metrics
    WHERE app_id = ?
    GROUP BY date
    ORDER BY date DESC
    LIMIT ?
  `).all(appId, days) as DownloadTrend[];
}

// --- Releases ---

export function saveRelease(release: Release) {
  const d = getDb();
  d.prepare(
    'INSERT INTO releases (app_id, version, build, released_at) VALUES (?, ?, ?, ?)'
  ).run(release.appId, release.version, release.build, release.releasedAt);
}

export function getReleases(appId: string): Release[] {
  return getDb().prepare(`
    SELECT app_id as appId, version, build, released_at as releasedAt
    FROM releases WHERE app_id = ? ORDER BY released_at DESC
  `).all(appId) as Release[];
}

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { AppInfo, CrashSignature, DailyMetrics, Release, CrashTrend, DownloadTrend, SourceBreakdown, CustomerReview } from './types';

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
  migrateSchema(db);
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
      redownloads INTEGER DEFAULT 0,
      updates INTEGER DEFAULT 0,
      page_views INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      sessions INTEGER DEFAULT 0,
      active_devices INTEGER DEFAULT 0,
      installations INTEGER DEFAULT 0,
      deletions INTEGER DEFAULT 0,
      proceeds REAL DEFAULT 0,
      units INTEGER DEFAULT 0,
      web_impressions INTEGER DEFAULT 0,
      web_taps INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS download_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT,
      date TEXT,
      source_type TEXT,
      source_info TEXT,
      download_type TEXT,
      counts INTEGER DEFAULT 0
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_crash_sig ON crash_signatures(signature_id, collected_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily ON daily_metrics(app_id, date, territory);
    CREATE INDEX IF NOT EXISTS idx_dl_source ON download_sources(app_id, date);

    CREATE TABLE IF NOT EXISTS customer_reviews (
      review_id TEXT PRIMARY KEY,
      app_id TEXT,
      rating INTEGER,
      title TEXT,
      body TEXT,
      reviewer_nickname TEXT,
      territory TEXT,
      created_date TEXT,
      response_body TEXT,
      response_date TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_reviews_app ON customer_reviews(app_id, created_date);
  `);
}

function migrateSchema(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(daily_metrics)").all() as any[];
  const colNames = new Set(cols.map((c: any) => c.name));
  const migrations: [string, string][] = [
    ['redownloads', 'INTEGER DEFAULT 0'],
    ['updates', 'INTEGER DEFAULT 0'],
    ['sessions', 'INTEGER DEFAULT 0'],
    ['active_devices', 'INTEGER DEFAULT 0'],
    ['installations', 'INTEGER DEFAULT 0'],
    ['deletions', 'INTEGER DEFAULT 0'],
    ['proceeds', 'REAL DEFAULT 0'],
    ['units', 'INTEGER DEFAULT 0'],
    ['web_impressions', 'INTEGER DEFAULT 0'],
    ['web_taps', 'INTEGER DEFAULT 0'],
  ];
  for (const [col, type] of migrations) {
    if (!colNames.has(col)) {
      db.exec(`ALTER TABLE daily_metrics ADD COLUMN ${col} ${type}`);
    }
  }
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
    ORDER BY build DESC, weight DESC
  `).all(appId) as CrashSignature[];
}

/**
 * Get crash summary per build (newest first).
 */
export function getCrashByBuild(appId: string): { build: string; totalWeight: number; signatureCount: number }[] {
  return getDb().prepare(`
    SELECT build,
           SUM(weight) as totalWeight,
           COUNT(DISTINCT signature_id) as signatureCount
    FROM crash_signatures
    WHERE app_id = ?
    GROUP BY build
    ORDER BY build DESC
  `).all(appId) as any[];
}

// --- Metrics ---

export function saveDailyMetrics(metrics: DailyMetrics[]) {
  const d = getDb();
  // Upsert: downloads/redownloads/updates use last-write-wins (Sales overwrites Analytics).
  // Other fields use MAX to merge supplementary metrics.
  const stmt = d.prepare(
    `INSERT INTO daily_metrics
     (app_id, date, territory, downloads, redownloads, updates, page_views, impressions,
      sessions, active_devices, installations, deletions, proceeds, units, web_impressions, web_taps)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(app_id, date, territory) DO UPDATE SET
       downloads = CASE WHEN excluded.downloads > 0 THEN excluded.downloads ELSE downloads END,
       redownloads = CASE WHEN excluded.redownloads > 0 THEN excluded.redownloads ELSE redownloads END,
       updates = CASE WHEN excluded.updates > 0 THEN excluded.updates ELSE updates END,
       page_views = MAX(page_views, excluded.page_views),
       impressions = MAX(impressions, excluded.impressions),
       sessions = MAX(sessions, excluded.sessions),
       active_devices = MAX(active_devices, excluded.active_devices),
       installations = MAX(installations, excluded.installations),
       deletions = MAX(deletions, excluded.deletions),
       proceeds = CASE WHEN excluded.proceeds > 0 THEN excluded.proceeds ELSE proceeds END,
       units = CASE WHEN excluded.units > 0 THEN excluded.units ELSE units END,
       web_impressions = MAX(web_impressions, excluded.web_impressions),
       web_taps = MAX(web_taps, excluded.web_taps)`
  );
  const tx = d.transaction(() => {
    for (const m of metrics) {
      stmt.run(m.appId, m.date, m.territory, m.downloads, m.redownloads, m.updates,
        m.pageViews, m.impressions, m.sessions, m.activeDevices, m.installations,
        m.deletions, m.proceeds, m.units, m.webImpressions, m.webTaps);
    }
  });
  tx();
}

export function getDownloadTrend(appId: string, days = 30): DownloadTrend[] {
  return getDb().prepare(`
    SELECT date,
           SUM(downloads) as downloads,
           SUM(redownloads) as redownloads,
           SUM(updates) as updates,
           SUM(page_views) as pageViews,
           SUM(impressions) as impressions,
           SUM(sessions) as sessions,
           SUM(active_devices) as activeDevices,
           SUM(installations) as installations,
           SUM(deletions) as deletions,
           SUM(proceeds) as proceeds,
           SUM(units) as units,
           SUM(web_impressions) as webImpressions,
           SUM(web_taps) as webTaps
    FROM daily_metrics
    WHERE app_id = ?
    GROUP BY date
    ORDER BY date DESC
    LIMIT ?
  `).all(appId, days) as DownloadTrend[];
}

export function getSourceBreakdown(appId: string, days = 30): SourceBreakdown[] {
  return getDb().prepare(`
    SELECT date, source_type as sourceType, download_type as downloadType, SUM(counts) as counts
    FROM download_sources
    WHERE app_id = ?
    GROUP BY date, source_type, download_type
    ORDER BY date DESC
    LIMIT ?
  `).all(appId, days * 10) as SourceBreakdown[];
}

export function saveDownloadSources(appId: string, date: string, sources: { sourceType: string; sourceInfo: string; downloadType: string; counts: number }[]) {
  const d = getDb();
  d.prepare('DELETE FROM download_sources WHERE app_id = ? AND date = ?').run(appId, date);
  const stmt = d.prepare(
    'INSERT INTO download_sources (app_id, date, source_type, source_info, download_type, counts) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const tx = d.transaction(() => {
    for (const s of sources) {
      stmt.run(appId, date, s.sourceType, s.sourceInfo, s.downloadType, s.counts);
    }
  });
  tx();
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

// --- Reviews ---

export function saveReviews(reviews: CustomerReview[]) {
  const d = getDb();
  const stmt = d.prepare(
    `INSERT OR REPLACE INTO customer_reviews
     (review_id, app_id, rating, title, body, reviewer_nickname, territory, created_date, response_body, response_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = d.transaction(() => {
    for (const r of reviews) {
      stmt.run(r.reviewId, r.appId, r.rating, r.title, r.body,
        r.reviewerNickname, r.territory, r.createdDate, r.responseBody, r.responseDate);
    }
  });
  tx();
}

export function getReviews(appId: string, limit = 100): CustomerReview[] {
  return getDb().prepare(`
    SELECT review_id as reviewId, app_id as appId, rating, title, body,
           reviewer_nickname as reviewerNickname, territory, created_date as createdDate,
           response_body as responseBody, response_date as responseDate
    FROM customer_reviews
    WHERE app_id = ?
    ORDER BY created_date DESC
    LIMIT ?
  `).all(appId, limit) as CustomerReview[];
}

export function getReviewStats(appId: string): { rating: number; count: number }[] {
  return getDb().prepare(`
    SELECT rating, COUNT(*) as count
    FROM customer_reviews
    WHERE app_id = ?
    GROUP BY rating
    ORDER BY rating DESC
  `).all(appId) as { rating: number; count: number }[];
}

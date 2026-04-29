import {
  getAllApps,
  getCrashSignatures,
  getCrashTrend,
  getCrashByBuild,
  getDownloadTrend,
  getReleases,
  getSourceBreakdown,
  getReviews,
  getReviewStats,
} from '../core/db';

export async function handleApiRequest(
  method: string,
  pathname: string,
  params: URLSearchParams
): Promise<any> {
  // GET /api/apps
  if (pathname === '/api/apps') {
    return { success: true, data: getAllApps() };
  }

  // GET /api/apps/:id/crashes
  const crashMatch = pathname.match(/^\/api\/apps\/([^/]+)\/crashes$/);
  if (crashMatch) {
    const appId = crashMatch[1];
    return {
      success: true,
      data: {
        signatures: getCrashSignatures(appId),
        byBuild: getCrashByBuild(appId),
      },
    };
  }

  // GET /api/apps/:id/crashes/trend
  const crashTrendMatch = pathname.match(/^\/api\/apps\/([^/]+)\/crashes\/trend$/);
  if (crashTrendMatch) {
    const days = parseInt(params.get('days') || '30', 10);
    return { success: true, data: getCrashTrend(crashTrendMatch[1], days) };
  }

  // GET /api/apps/:id/downloads/trend — full metrics trend
  const dlTrendMatch = pathname.match(/^\/api\/apps\/([^/]+)\/downloads\/trend$/);
  if (dlTrendMatch) {
    const days = parseInt(params.get('days') || '30', 10);
    return { success: true, data: getDownloadTrend(dlTrendMatch[1], days) };
  }

  // GET /api/apps/:id/sources — download source breakdown
  const sourcesMatch = pathname.match(/^\/api\/apps\/([^/]+)\/sources$/);
  if (sourcesMatch) {
    const days = parseInt(params.get('days') || '30', 10);
    const raw = getSourceBreakdown(sourcesMatch[1], days);
    // Aggregate by sourceType for pie chart
    const bySource: Record<string, number> = {};
    for (const r of raw) {
      const key = r.sourceType || 'Unknown';
      bySource[key] = (bySource[key] || 0) + r.counts;
    }
    return {
      success: true,
      data: {
        bySource: Object.entries(bySource).map(([name, value]) => ({ name, value })),
        detailed: raw,
      },
    };
  }

  // GET /api/apps/:id/reviews
  const reviewsMatch = pathname.match(/^\/api\/apps\/([^/]+)\/reviews$/);
  if (reviewsMatch) {
    const limit = parseInt(params.get('limit') || '100', 10);
    const reviews = getReviews(reviewsMatch[1], limit);
    const stats = getReviewStats(reviewsMatch[1]);
    return { success: true, data: { reviews, stats } };
  }

  // GET /api/apps/:id/releases
  const releasesMatch = pathname.match(/^\/api\/apps\/([^/]+)\/releases$/);
  if (releasesMatch) {
    return { success: true, data: getReleases(releasesMatch[1]) };
  }

  return { success: false, error: 'Not found' };
}

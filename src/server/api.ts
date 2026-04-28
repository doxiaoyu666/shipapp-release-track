import {
  getAllApps,
  getCrashSignatures,
  getCrashTrend,
  getCrashByBuild,
  getDownloadTrend,
  getReleases,
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

  // GET /api/apps/:id/downloads/trend
  const dlTrendMatch = pathname.match(/^\/api\/apps\/([^/]+)\/downloads\/trend$/);
  if (dlTrendMatch) {
    const days = parseInt(params.get('days') || '30', 10);
    return { success: true, data: getDownloadTrend(dlTrendMatch[1], days) };
  }

  // GET /api/apps/:id/releases
  const releasesMatch = pathname.match(/^\/api\/apps\/([^/]+)\/releases$/);
  if (releasesMatch) {
    return { success: true, data: getReleases(releasesMatch[1]) };
  }

  return { success: false, error: 'Not found' };
}

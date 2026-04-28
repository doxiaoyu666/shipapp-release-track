import { fetchAll, apiRequest } from './asc-client';
import type { AppInfo, CrashSignature } from './types';

/**
 * Find app by name (fuzzy match).
 */
export async function findApp(name: string): Promise<AppInfo> {
  const apps = await fetchAll('/apps');
  const app = apps.find((a: any) =>
    a.attributes.name.toLowerCase().includes(name.toLowerCase())
  );
  if (!app) {
    throw new Error(`App not found: "${name}". Available: ${apps.map((a: any) => a.attributes.name).join(', ')}`);
  }
  return {
    id: app.id,
    name: app.attributes.name,
    bundleId: app.attributes.bundleId,
  };
}

/**
 * Fetch crash signatures from recent builds.
 */
export async function fetchCrashSignatures(appId: string, buildLimit = 5): Promise<CrashSignature[]> {
  const buildsData = await fetchAll(
    `/builds?filter[app]=${appId}&sort=-uploadedDate&limit=${buildLimit}`
  );

  const results: CrashSignature[] = [];
  const now = new Date().toISOString();

  for (const build of buildsData) {
    const buildVersion = build.attributes.version;
    try {
      const sigs = await fetchAll(`/builds/${build.id}/diagnosticSignatures?limit=50`);
      for (const sig of sigs) {
        results.push({
          signatureId: sig.id,
          appId,
          build: buildVersion,
          signature: sig.attributes.signature || 'Unknown',
          weight: sig.attributes.weight || 0,
          collectedAt: now,
        });
      }
    } catch {
      // Build may not have diagnostic data available yet
    }
  }

  return results;
}

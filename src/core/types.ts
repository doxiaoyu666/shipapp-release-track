export interface ShipAppCredentials {
  keyId: string;
  issuerId: string;
  privateKeyPath: string;
}

export interface AppInfo {
  id: string;
  name: string;
  bundleId: string;
}

export interface CrashSignature {
  signatureId: string;
  appId: string;
  build: string;
  signature: string;
  weight: number;
  collectedAt: string;
}

export interface DailyMetrics {
  appId: string;
  date: string;
  territory: string;
  downloads: number;
  pageViews: number;
  impressions: number;
}

export interface Release {
  appId: string;
  version: string;
  build: string;
  releasedAt: string;
}

export interface CrashTrend {
  date: string;
  totalWeight: number;
  signatureCount: number;
}

export interface DownloadTrend {
  date: string;
  downloads: number;
  pageViews: number;
  impressions: number;
}

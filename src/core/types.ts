export interface ShipAppCredentials {
  keyId: string;
  issuerId: string;
  privateKeyPath: string;
  vendorNumber?: string;
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
  redownloads: number;
  updates: number;
  pageViews: number;
  impressions: number;
  sessions: number;
  activeDevices: number;
  installations: number;
  deletions: number;
  proceeds: number;
  units: number;
  webImpressions: number;
  webTaps: number;
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
  redownloads: number;
  updates: number;
  pageViews: number;
  impressions: number;
  sessions: number;
  activeDevices: number;
  installations: number;
  deletions: number;
  proceeds: number;
  units: number;
  webImpressions: number;
  webTaps: number;
}

export interface SourceBreakdown {
  date: string;
  sourceType: string;
  downloadType: string;
  counts: number;
}

export interface CustomerReview {
  reviewId: string;
  appId: string;
  rating: number;
  title: string;
  body: string;
  reviewerNickname: string;
  territory: string;
  createdDate: string;
  responseBody: string | null;
  responseDate: string | null;
}

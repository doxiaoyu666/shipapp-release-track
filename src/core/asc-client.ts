import { generateToken, loadCredentials } from './auth';
import type { ShipAppCredentials } from './types';

const BASE_URL = 'https://api.appstoreconnect.apple.com/v1';

let cachedCredentials: ShipAppCredentials | null = null;

function getCredentials(): ShipAppCredentials {
  if (!cachedCredentials) {
    cachedCredentials = loadCredentials();
  }
  return cachedCredentials;
}

export async function apiRequest(
  method: string,
  urlPath: string,
  body: any = null
): Promise<any> {
  const token = generateToken(getCredentials());
  const url = urlPath.startsWith('http') ? urlPath : `${BASE_URL}${urlPath}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`API error [${res.status}] ${url}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

export async function fetchAll(urlPath: string): Promise<any[]> {
  let all: any[] = [];
  let nextUrl: string | null = urlPath;

  while (nextUrl) {
    const data = await apiRequest('GET', nextUrl);
    all = all.concat(data.data || []);
    nextUrl = data.links?.next || null;
  }

  return all;
}

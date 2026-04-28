import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import type { ShipAppCredentials } from './types';

const CONFIG_DIR = path.join(process.env.HOME || '~', '.shipapp');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.json');

export function hasCredentials(): boolean {
  return fs.existsSync(CREDENTIALS_FILE);
}

export function loadCredentials(): ShipAppCredentials {
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    throw new Error(
      'No credentials found. Run "shipapp-metadata init" to configure ASC API credentials.'
    );
  }
  return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'));
}

export function generateToken(credentials: ShipAppCredentials): string {
  const keyPath = path.isAbsolute(credentials.privateKeyPath)
    ? credentials.privateKeyPath
    : path.resolve(credentials.privateKeyPath);

  if (!fs.existsSync(keyPath)) {
    throw new Error(`Private key not found: ${keyPath}`);
  }

  const privateKey = fs.readFileSync(keyPath, 'utf-8');
  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    { iss: credentials.issuerId, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' },
    privateKey,
    { algorithm: 'ES256', header: { alg: 'ES256', kid: credentials.keyId, typ: 'JWT' } }
  );
}

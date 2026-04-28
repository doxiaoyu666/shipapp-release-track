import http from 'http';
import { handleApiRequest } from './api';
import fs from 'fs';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export function createServer(port: number): http.Server {
  const dashboardDir = path.join(__dirname, 'dashboard-public');

  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
      try {
        const result = await handleApiRequest(req.method || 'GET', url.pathname, url.searchParams);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Static files
    let filePath = path.join(dashboardDir, url.pathname === '/' ? 'index.html' : url.pathname);

    // Prevent directory traversal
    if (filePath.includes('..')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // SPA fallback
    if (!fs.existsSync(filePath)) {
      filePath = path.join(dashboardDir, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Dashboard not built. Run: npm run build:dashboard');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, max-age=0',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { findApp, fetchCrashSignatures } from '../core/crash';
import { upsertApp, saveCrashSignatures, getCrashTrend, getCrashSignatures, getDownloadTrend, getAllApps } from '../core/db';

const server = new McpServer({
  name: '@shipapp/release-track',
  version: '0.1.0',
});

server.tool(
  'release_track_collect',
  'Collect crash and download data for an app',
  { app: z.string().describe('App name (fuzzy match)') },
  async ({ app: appName }) => {
    const app = await findApp(appName);
    upsertApp(app);
    const crashes = await fetchCrashSignatures(app.id);
    saveCrashSignatures(crashes);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ app: app.name, crashSignatures: crashes.length }, null, 2) }],
    };
  }
);

server.tool(
  'release_track_status',
  'Get crash and download trends for an app',
  { app: z.string().describe('App name (fuzzy match)'), days: z.number().optional().describe('Number of days') },
  async ({ app: appName, days }) => {
    const app = await findApp(appName);
    const crashTrend = getCrashTrend(app.id, days || 7);
    const downloadTrend = getDownloadTrend(app.id, days || 7);
    const crashes = getCrashSignatures(app.id).slice(0, 10);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ app: app.name, crashTrend, downloadTrend, topCrashes: crashes }, null, 2) }],
    };
  }
);

server.tool(
  'release_track_apps',
  'List all tracked apps',
  {},
  async () => {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(getAllApps(), null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

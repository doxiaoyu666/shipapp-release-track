import type { CommandModule } from 'yargs';
import ora from 'ora';
import { findApp, fetchCrashSignatures } from '../core/crash';
import { fetchDailyMetrics, fetchDownloadSources } from '../core/analytics';
import { fetchSalesDailyMetrics } from '../core/sales';
import { loadCredentials } from '../core/auth';
import { upsertApp, saveCrashSignatures, saveDailyMetrics, saveDownloadSources, saveReviews } from '../core/db';
import { fetchCustomerReviews } from '../core/reviews';

interface CollectArgs {
  app?: string;
  days?: number;
}

export const collectCommand: CommandModule<{}, CollectArgs> = {
  command: 'collect',
  describe: 'Collect crash and download data from App Store Connect',
  builder: {
    app: { type: 'string', describe: 'App name to search for (fuzzy match)' },
    days: { type: 'number', describe: 'Number of days to collect', default: 90 },
  },
  handler: async (argv) => {
    const spinner = ora('Finding app...').start();

    try {
      const appName = argv.app || 'fotime';
      const app = await findApp(appName);
      upsertApp(app);
      spinner.succeed(`Found: ${app.name} (${app.bundleId})`);

      // Collect crashes
      spinner.start('Fetching crash signatures...');
      const crashes = await fetchCrashSignatures(app.id);
      saveCrashSignatures(crashes);
      spinner.succeed(`Crashes: ${crashes.length} signatures`);

      const collectDays = argv.days || 90;
      const creds = loadCredentials();

      // Collect analytics first (engagement, sessions, installs — supplementary metrics)
      spinner.start('Fetching analytics (engagement, sessions, retention)...');
      try {
        const metrics = await fetchDailyMetrics(app.id, collectDays);
        saveDailyMetrics(metrics);
        spinner.succeed(`Analytics: ${metrics.length} data points`);
      } catch (err: any) {
        spinner.warn(`Analytics: ${err.message}`);
      }

      // Collect precise downloads/revenue from Sales API (overwrites Analytics downloads)
      if (creds.vendorNumber) {
        spinner.start('Fetching sales data (precise downloads & revenue)...');
        try {
          const salesMetrics = await fetchSalesDailyMetrics(app.id, creds.vendorNumber, collectDays);
          if (salesMetrics.length > 0) {
            saveDailyMetrics(salesMetrics);
            spinner.succeed(`Sales: ${salesMetrics.length} data points (precise)`);
          } else {
            spinner.info('Sales: no data found');
          }
        } catch (err: any) {
          spinner.warn(`Sales: ${err.message}`);
        }
      }

      // Collect download sources
      spinner.start('Fetching download sources...');
      try {
        const sources = await fetchDownloadSources(app.id, collectDays);
        for (const [date, rows] of sources) {
          saveDownloadSources(app.id, date, rows);
        }
        spinner.succeed(`Sources: ${sources.size} days`);
      } catch (err: any) {
        spinner.warn(`Sources: ${err.message}`);
      }

      // Collect customer reviews
      spinner.start('Fetching customer reviews...');
      try {
        const reviews = await fetchCustomerReviews(app.id);
        saveReviews(reviews);
        spinner.succeed(`Reviews: ${reviews.length} reviews`);
      } catch (err: any) {
        spinner.warn(`Reviews: ${err.message}`);
      }

      if (!creds.vendorNumber) {
        console.log('\n💡 Tip: Add "vendorNumber" to ~/.shipapp/credentials.json for precise download & revenue data.');
        console.log('   Find it in App Store Connect → Sales and Trends → top right corner.');
      }

      console.log('\n✅ Data collected. Run "shipapp-release-track serve" to view dashboard.');
    } catch (err: any) {
      spinner.fail(err.message);
      process.exit(1);
    }
  },
};

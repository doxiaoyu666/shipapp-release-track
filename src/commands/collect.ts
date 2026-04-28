import type { CommandModule } from 'yargs';
import ora from 'ora';
import { findApp, fetchCrashSignatures } from '../core/crash';
import { fetchDailyMetrics } from '../core/analytics';
import { upsertApp, saveCrashSignatures, saveDailyMetrics } from '../core/db';

interface CollectArgs {
  app?: string;
}

export const collectCommand: CommandModule<{}, CollectArgs> = {
  command: 'collect',
  describe: 'Collect crash and download data from App Store Connect',
  builder: {
    app: { type: 'string', describe: 'App name to search for (fuzzy match)' },
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

      // Collect downloads
      spinner.start('Fetching download metrics (this may take a while)...');
      try {
        const metrics = await fetchDailyMetrics(app.id, 30);
        saveDailyMetrics(metrics);
        spinner.succeed(`Metrics: ${metrics.length} data points`);
      } catch (err: any) {
        spinner.warn(`Metrics: ${err.message}`);
      }

      console.log('\n✅ Data collected. Run "shipapp-release-track serve" to view dashboard.');
    } catch (err: any) {
      spinner.fail(err.message);
      process.exit(1);
    }
  },
};

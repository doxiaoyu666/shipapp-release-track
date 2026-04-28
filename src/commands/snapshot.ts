import type { CommandModule } from 'yargs';
import ora from 'ora';
import { findApp } from '../core/crash';
import { upsertApp, saveRelease } from '../core/db';

interface SnapshotArgs {
  app: string;
  version: string;
  build?: string;
}

export const snapshotCommand: CommandModule<{}, SnapshotArgs> = {
  command: 'snapshot',
  describe: 'Record a release baseline',
  builder: {
    app: { type: 'string', demandOption: true, describe: 'App name' },
    version: { type: 'string', demandOption: true, describe: 'Version number' },
    build: { type: 'string', describe: 'Build number' },
  },
  handler: async (argv) => {
    const spinner = ora('Recording release baseline...').start();

    try {
      const app = await findApp(argv.app);
      upsertApp(app);

      saveRelease({
        appId: app.id,
        version: argv.version,
        build: argv.build || '',
        releasedAt: new Date().toISOString(),
      });

      spinner.succeed(`Release recorded: ${app.name} v${argv.version}`);
    } catch (err: any) {
      spinner.fail(err.message);
      process.exit(1);
    }
  },
};

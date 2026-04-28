import type { CommandModule } from 'yargs';
import { createServer } from '../server/index';
import open from 'open';

interface ServeArgs {
  port: number;
}

export const serveCommand: CommandModule<{}, ServeArgs> = {
  command: 'serve',
  describe: 'Start the release tracking dashboard',
  builder: {
    port: { type: 'number', default: 3457, describe: 'Port number' },
  },
  handler: (argv) => {
    const server = createServer(argv.port);
    server.listen(argv.port, () => {
      const url = `http://localhost:${argv.port}`;
      console.log(`\n🚀 Dashboard running at ${url}\n`);
      open(url);
    });
  },
};

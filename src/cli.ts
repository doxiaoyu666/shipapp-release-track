#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { collectCommand } from './commands/collect';
import { serveCommand } from './commands/serve';
import { snapshotCommand } from './commands/snapshot';

yargs(hideBin(process.argv))
  .scriptName('shipapp-release-track')
  .usage('$0 <command> [options]')
  .command(collectCommand)
  .command(serveCommand)
  .command(snapshotCommand)
  .demandCommand(1, 'Please specify a command')
  .strict()
  .help()
  .parse();

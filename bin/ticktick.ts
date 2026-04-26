#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { registerInitCommand } from '../src/commands/init.js';
import { registerTaskCommand, registerTasksCommand } from '../src/commands/tasks.js';
import { registerCreateCommand } from '../src/commands/create.js';
import { registerCompleteCommand } from '../src/commands/complete.js';
import { registerDeleteCommand } from '../src/commands/delete.js';
import { registerProjectCommand, registerProjectsCommand } from '../src/commands/projects.js';
import { formatError } from '../src/utils/error.js';

const __filename = fileURLToPath(import.meta.url);
let pkgDir = dirname(__filename);
while (!existsSync(join(pkgDir, 'package.json'))) {
  const parent = dirname(pkgDir);
  if (parent === pkgDir) break;
  pkgDir = parent;
}
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('ticktick')
  .description('CLI для TickTick — для людей и AI-агентов')
  .version(pkg.version);

registerInitCommand(program);
registerTasksCommand(program);
registerTaskCommand(program);
registerCreateCommand(program);
registerCompleteCommand(program);
registerDeleteCommand(program);
registerProjectsCommand(program);
registerProjectCommand(program);

program.hook('postAction', () => {});

// Global error handler
const originalParse = program.parseAsync.bind(program);
program.parseAsync = async (argv?: string[]) => {
  try {
    return await originalParse(argv);
  } catch (error) {
    const isJson = process.argv.includes('--json');
    process.stderr.write(formatError(error, false) + '\n');
    if (isJson) {
      process.stdout.write(formatError(error, true) + '\n');
    }
    process.exit(error instanceof Error && 'exitCode' in error ? (error as any).exitCode : 1);
  }
};

program.parseAsync();

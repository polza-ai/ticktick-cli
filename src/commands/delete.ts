import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError, notFoundError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';

export function registerDeleteCommand(program: Command): void {
  program
    .command('delete <taskId>')
    .description('Удалить задачу')
    .option('--project <id>', 'ID проекта')
    .option('-y, --yes', 'Не спрашивать подтверждение')
    .option('--json', 'Вывод в JSON')
    .action(async (taskId, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        let projectId = opts.project;

        if (!projectId) {
          const found = await client.findTaskById(taskId);
          if (!found) {
            throw notFoundError('Задача', taskId);
          }
          projectId = found.task.projectId;
        } else {
          // Pre-flight: API возвращает 200 на delete несуществующей задачи
          await client.getTask(projectId, taskId);
        }

        if (!opts.yes && !opts.json) {
          const { createInterface } = await import('node:readline/promises');
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          const answer = await rl.question(`Удалить задачу ${taskId}? (y/N): `);
          rl.close();
          if (answer.toLowerCase() !== 'y') {
            console.log('Отменено.');
            return;
          }
        }

        await client.deleteTask(projectId, taskId);

        if (opts.json) {
          process.stdout.write(jsonOutput({ taskId, deleted: true }) + '\n');
        } else {
          console.log(chalk.red(`\n✗ Задача ${taskId} удалена.\n`));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

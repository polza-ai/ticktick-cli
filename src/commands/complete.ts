import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError, notFoundError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';

export function registerCompleteCommand(program: Command): void {
  program
    .command('complete <taskId>')
    .description('Завершить задачу')
    .option('--project <id>', 'ID проекта')
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
          // Pre-flight: API возвращает 200 на complete несуществующей задачи — проверим явно
          await client.getTask(projectId, taskId);
        }

        await client.completeTask(projectId, taskId);

        if (opts.json) {
          process.stdout.write(jsonOutput({ taskId, status: 'completed' }) + '\n');
        } else {
          console.log(chalk.green(`\n✓ Задача ${taskId} завершена.\n`));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

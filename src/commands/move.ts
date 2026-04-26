import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError, notFoundError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';

export function registerMoveCommand(program: Command): void {
  program
    .command('move <taskId>')
    .description('Переместить задачу в другой проект')
    .requiredOption('--to <projectId>', 'ID целевого проекта')
    .option('--from <projectId>', 'ID исходного проекта (если не указан — найдём автоматически)')
    .option('--json', 'Вывод в JSON')
    .action(async (taskId, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const spinner = opts.json ? null : ora('Перемещение задачи...').start();

        let fromProjectId: string = opts.from;
        if (!fromProjectId) {
          const found = await client.findTaskById(taskId);
          if (!found) {
            spinner?.stop();
            throw notFoundError('Задача', taskId);
          }
          fromProjectId = found.task.projectId;
        } else {
          // Pre-flight: API возвращает 200 на move несуществующей задачи
          await client.getTask(fromProjectId, taskId);
        }

        const result = await client.moveTasks([{
          fromProjectId,
          toProjectId: opts.to,
          taskId,
        }]);

        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(result) + '\n');
        } else {
          console.log(chalk.green(`\n→ Задача ${taskId} перемещена в проект ${opts.to}.\n`));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

import { Command } from 'commander';
import ora from 'ora';
import { loadConfig, createClient, resolveProjectId } from '../config/config.js';
import { handleApiError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { formatTaskList } from '../formatters/table.js';
import type { CompletedTasksParams } from '../client/types.js';

export function registerCompletedCommand(program: Command): void {
  program
    .command('completed')
    .description('Список завершённых задач')
    .option('--project <ids...>', 'Фильтр по проектам (один или несколько ID)')
    .option('--from <date>', 'Начало диапазона (YYYY-MM-DD или ISO)')
    .option('--to <date>', 'Конец диапазона (YYYY-MM-DD или ISO)')
    .option('-l, --limit <n>', 'Лимит задач', '100')
    .option('--json', 'Вывод в JSON')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const spinner = opts.json ? null : ora('Загрузка завершённых задач...').start();

        const params: CompletedTasksParams = {};
        if (opts.project?.length) {
          params.projectIds = (opts.project as string[]).map(
            (id) => resolveProjectId(id, config) ?? id,
          );
        }
        if (opts.from) params.startDate = opts.from;
        if (opts.to) params.endDate = opts.to;

        let tasks = await client.getCompletedTasks(params);

        const limit = parseInt(opts.limit, 10);
        tasks = tasks.slice(0, limit);

        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(tasks) + '\n');
        } else {
          // fetch projects for nice display (best effort)
          let projects;
          try {
            projects = await client.getProjects();
          } catch { /* ignore */ }
          console.log(formatTaskList(tasks, projects));
          console.log(`\nВсего: ${tasks.length} завершённых задач`);
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

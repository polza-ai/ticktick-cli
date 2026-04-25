import { Command } from 'commander';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { formatTaskDetail } from '../formatters/table.js';

export function registerUpdateCommand(program: Command): void {
  program
    .command('update <taskId>')
    .description('Обновить задачу')
    .option('-t, --title <text>', 'Новое название')
    .option('--content <text>', 'Новое описание')
    .option('--project <id>', 'ID проекта (обязателен или определяется автоматически)')
    .option('-p, --priority <n>', 'Приоритет (0, 1, 3, 5)')
    .option('--due <date>', 'Дедлайн (YYYY-MM-DD)')
    .option('--tag <tags...>', 'Теги')
    .option('--json', 'Вывод в JSON')
    .action(async (taskId, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        // Find project ID
        let projectId = opts.project;
        if (!projectId) {
          const found = await client.findTaskById(taskId);
          if (!found) {
            console.error('Задача не найдена. Укажите --project <id>.');
            process.exit(3);
          }
          projectId = found.projectId;
        }

        const params: Record<string, unknown> = {};
        if (opts.title) params.title = opts.title;
        if (opts.content) params.content = opts.content;
        if (opts.priority !== undefined) params.priority = parseInt(opts.priority, 10);
        if (opts.due) params.dueDate = opts.due;
        if (opts.tag) params.tags = opts.tag;

        if (Object.keys(params).length === 0) {
          console.error('Укажите хотя бы одно поле для обновления.');
          process.exit(4);
        }

        const task = await client.updateTask(projectId, taskId, params);

        if (opts.json) {
          process.stdout.write(jsonOutput(task) + '\n');
        } else {
          console.log(formatTaskDetail(task));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

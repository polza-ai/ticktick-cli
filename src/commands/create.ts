import { Command } from 'commander';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { formatTaskDetail } from '../formatters/table.js';
import { parsePriority, normalizeDueDate } from '../utils/validate.js';

export function registerCreateCommand(program: Command): void {
  program
    .command('create')
    .description('Создать задачу')
    .requiredOption('-t, --title <text>', 'Название задачи')
    .option('--content <text>', 'Описание')
    .option('--project <id>', 'ID проекта')
    .option('-p, --priority <n>', 'Приоритет (0=нет, 1=низкий, 3=средний, 5=высокий)')
    .option('--due <date>', 'Дедлайн (YYYY-MM-DD)')
    .option('--tag <tags...>', 'Теги')
    .option('--json', 'Вывод в JSON')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const projectId = opts.project ?? config.defaultProject;

        const client = await createClient(config);
        const priority = parsePriority(opts.priority) ?? config.defaultPriority;
        const dueDate = normalizeDueDate(opts.due);
        const task = await client.createTask({
          title: opts.title,
          content: opts.content,
          projectId,
          priority,
          dueDate,
          tags: opts.tag ?? config.defaultTags,
        });

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

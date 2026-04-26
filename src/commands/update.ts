import { Command } from 'commander';
import ora from 'ora';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError, notFoundError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { formatTaskDetail } from '../formatters/table.js';
import { parsePriority, normalizeDueDate } from '../utils/validate.js';
import type { UpdateTaskParams } from '../client/types.js';

export function registerUpdateCommand(program: Command): void {
  program
    .command('update <taskId>')
    .description('Изменить задачу')
    .option('--project <id>', 'ID проекта (если не указан — найдём автоматически)')
    .option('-t, --title <text>', 'Новое название')
    .option('--content <text>', 'Описание')
    .option('--desc <text>', 'Краткое описание (для чек-листа)')
    .option('-p, --priority <n>', 'Приоритет (0, 1, 3, 5)')
    .option('--due <date>', 'Дедлайн (YYYY-MM-DD или ISO)')
    .option('--start <date>', 'Дата начала (YYYY-MM-DD или ISO)')
    .option('--all-day', 'Без времени (весь день)')
    .option('--timezone <tz>', 'Часовой пояс (например, Europe/Moscow)')
    .option('--repeat <rrule>', 'Правило повторения (RRULE)')
    .option('--json', 'Вывод в JSON')
    .action(async (taskId, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const spinner = opts.json ? null : ora('Обновление задачи...').start();

        let projectId: string = opts.project;
        if (!projectId) {
          const found = await client.findTaskById(taskId);
          if (!found) {
            spinner?.stop();
            throw notFoundError('Задача', taskId);
          }
          projectId = found.task.projectId;
        }

        const params: UpdateTaskParams = { id: taskId, projectId };
        if (opts.title !== undefined) params.title = opts.title;
        if (opts.content !== undefined) params.content = opts.content;
        if (opts.desc !== undefined) params.desc = opts.desc;
        const priority = parsePriority(opts.priority);
        if (priority !== undefined) params.priority = priority;
        const due = normalizeDueDate(opts.due);
        if (due !== undefined) params.dueDate = due;
        const start = normalizeDueDate(opts.start);
        if (start !== undefined) params.startDate = start;
        if (opts.allDay) params.isAllDay = true;
        if (opts.timezone !== undefined) params.timeZone = opts.timezone;
        if (opts.repeat !== undefined) params.repeatFlag = opts.repeat;

        const task = await client.updateTask(taskId, params);

        spinner?.stop();

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

import { Command } from 'commander';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError, validationError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { formatTaskDetail } from '../formatters/table.js';
import {
  parsePriority,
  normalizeDueDate,
  parseDuration,
  addMinutesToIso,
  nowIso,
} from '../utils/validate.js';
import type { CreateTaskParams } from '../client/types.js';

export function registerCreateCommand(program: Command): void {
  program
    .command('create')
    .description('Создать задачу')
    .requiredOption('-t, --title <text>', 'Название задачи')
    .option('--content <text>', 'Описание')
    .option('--project <id>', 'ID проекта')
    .option('-p, --priority <n>', 'Приоритет (0=нет, 1=низкий, 3=средний, 5=высокий)')
    .option('--due <date>', 'Дедлайн (YYYY-MM-DD или ISO 8601)')
    .option('--start <date>', 'Дата начала (YYYY-MM-DD или ISO 8601)')
    .option('--duration <dur>', 'Длительность: 30m, 1h, 1h30m, 1.5h, 90 (минуты). Считает dueDate от --start (или now)')
    .option('--all-day', 'Без времени (весь день)')
    .option('--timezone <tz>', 'Часовой пояс (например, Europe/Moscow)')
    .option('--repeat <rrule>', 'Правило повторения (RRULE)')
    .option('--tag <tags...>', 'Теги')
    .option('--json', 'Вывод в JSON')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const projectId = opts.project ?? config.defaultProject;

        const client = await createClient(config);
        const priority = parsePriority(opts.priority) ?? config.defaultPriority;

        let startDate = normalizeDueDate(opts.start);
        let dueDate = normalizeDueDate(opts.due);
        const duration = parseDuration(opts.duration);

        if (duration !== undefined) {
          if (dueDate !== undefined) {
            throw validationError('Используйте --duration ИЛИ --due, но не оба сразу.');
          }
          if (startDate === undefined) {
            startDate = nowIso();
          }
          dueDate = addMinutesToIso(startDate, duration);
        }

        const params: CreateTaskParams = {
          title: opts.title,
          content: opts.content,
          projectId,
          priority,
          startDate,
          dueDate,
          tags: opts.tag ?? config.defaultTags,
        };
        if (opts.allDay) params.isAllDay = true;
        if (opts.timezone !== undefined) params.timeZone = opts.timezone;
        if (opts.repeat !== undefined) params.repeatFlag = opts.repeat;

        const task = await client.createTask(params);

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

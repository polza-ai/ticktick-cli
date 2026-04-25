import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { formatChecklist } from '../formatters/table.js';

export function registerChecklistCommand(program: Command): void {
  program
    .command('checklist <taskId> [action] [text]')
    .description('Подзадачи (show, add <text>, check <number>)')
    .option('--project <id>', 'ID проекта')
    .option('--json', 'Вывод в JSON')
    .action(async (taskId, action, text, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        // Find task
        let task;
        let projectId = opts.project;

        if (projectId) {
          task = await client.getTask(projectId, taskId);
        } else {
          const found = await client.findTaskById(taskId);
          if (!found) {
            console.error('Задача не найдена. Укажите --project <id>.');
            process.exit(3);
          }
          task = found.task;
          projectId = found.projectId;
        }

        const items = task.items ?? [];

        if (!action || action === 'show') {
          if (opts.json) {
            process.stdout.write(jsonOutput(items) + '\n');
          } else {
            console.log('');
            console.log(chalk.bold(`Подзадачи: ${task.title}`));
            console.log('');
            console.log(formatChecklist(items));
            console.log('');
          }
          return;
        }

        if (action === 'add') {
          if (!text) {
            console.error('Укажите текст: ticktick checklist <taskId> add <text>');
            process.exit(4);
          }

          const newItems = [...items.map(i => ({ ...i })), { id: '', title: text, status: 0, sortOrder: items.length }];
          const updated = await client.updateTask(projectId, taskId, { items: newItems });

          if (opts.json) {
            process.stdout.write(jsonOutput(updated.items) + '\n');
          } else {
            console.log(chalk.green(`\n✓ Подзадача "${text}" добавлена.\n`));
            console.log(formatChecklist(updated.items ?? []));
            console.log('');
          }
          return;
        }

        if (action === 'check') {
          const idx = parseInt(text, 10) - 1;
          if (isNaN(idx) || idx < 0 || idx >= items.length) {
            console.error(`Неверный номер. Доступны: 1-${items.length}`);
            process.exit(4);
          }

          const updatedItems = items.map((item, i) => {
            if (i === idx) {
              return { ...item, status: item.status === 1 ? 0 : 1 };
            }
            return item;
          });

          const updated = await client.updateTask(projectId, taskId, { items: updatedItems });

          if (opts.json) {
            process.stdout.write(jsonOutput(updated.items) + '\n');
          } else {
            const toggled = updatedItems[idx];
            const state = toggled.status === 1 ? 'отмечена' : 'снята отметка';
            console.log(chalk.green(`\n✓ Подзадача ${idx + 1} ${state}.\n`));
            console.log(formatChecklist(updated.items ?? []));
            console.log('');
          }
          return;
        }

        console.error(`Неизвестное действие: ${action}. Доступны: show, add, check`);
        process.exit(4);
      } catch (error) {
        handleApiError(error);
      }
    });
}

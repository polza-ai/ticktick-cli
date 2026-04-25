import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { formatTagList } from '../formatters/table.js';

export function registerTagsCommand(program: Command): void {
  program
    .command('tags [action] [args...]')
    .description('Управление тегами (list, create <name> [color], rename <old> <new>, delete <name>)')
    .option('--json', 'Вывод в JSON')
    .action(async (action, args, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        if (!action || action === 'list') {
          const spinner = opts.json ? null : ora('Загрузка тегов...').start();
          const tags = await client.getAllTags();
          spinner?.stop();

          if (opts.json) {
            process.stdout.write(jsonOutput(tags) + '\n');
          } else {
            console.log(formatTagList(tags));
          }
          return;
        }

        if (action === 'create') {
          const name = args[0];
          const color = args[1];
          if (!name) {
            console.error('Укажите имя тега: ticktick tags create <name> [color]');
            process.exit(4);
          }
          await client.batchCreateTags([{ name, color }]);

          if (opts.json) {
            process.stdout.write(jsonOutput({ name, color, created: true }) + '\n');
          } else {
            console.log(chalk.green(`\n✓ Тег "${name}" создан.\n`));
          }
          return;
        }

        if (action === 'rename') {
          const oldName = args[0];
          const newName = args[1];
          if (!oldName || !newName) {
            console.error('Укажите: ticktick tags rename <old> <new>');
            process.exit(4);
          }
          await client.updateTag(oldName, { name: newName });

          if (opts.json) {
            process.stdout.write(jsonOutput({ oldName, newName, renamed: true }) + '\n');
          } else {
            console.log(chalk.green(`\n✓ Тег "${oldName}" переименован в "${newName}".\n`));
          }
          return;
        }

        if (action === 'delete') {
          const name = args[0];
          if (!name) {
            console.error('Укажите: ticktick tags delete <name>');
            process.exit(4);
          }
          await client.deleteTag(name);

          if (opts.json) {
            process.stdout.write(jsonOutput({ name, deleted: true }) + '\n');
          } else {
            console.log(chalk.red(`\n✗ Тег "${name}" удалён.\n`));
          }
          return;
        }

        console.error(`Неизвестное действие: ${action}. Доступны: list, create, rename, delete`);
        process.exit(4);
      } catch (error) {
        handleApiError(error);
      }
    });
}

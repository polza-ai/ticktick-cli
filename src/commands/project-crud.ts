import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { formatProjectDetail } from '../formatters/table.js';
import type { CreateProjectParams, UpdateProjectParams } from '../client/types.js';

type ViewMode = 'list' | 'kanban' | 'timeline';
type ProjectKind = 'TASK' | 'NOTE';

function parseViewMode(value: string | undefined): ViewMode | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (v === 'list' || v === 'kanban' || v === 'timeline') return v;
  throw new Error(`Невалидный viewMode: ${value}. Используйте list, kanban или timeline.`);
}

function parseKind(value: string | undefined): ProjectKind | undefined {
  if (!value) return undefined;
  const v = value.toUpperCase();
  if (v === 'TASK' || v === 'NOTE') return v;
  throw new Error(`Невалидный kind: ${value}. Используйте TASK или NOTE.`);
}

export function registerProjectCreateCommand(program: Command): void {
  program
    .command('project-create')
    .description('Создать проект')
    .requiredOption('-n, --name <text>', 'Название проекта')
    .option('--color <hex>', 'Цвет (например, #F18181)')
    .option('--view <mode>', 'Режим: list, kanban, timeline')
    .option('--kind <kind>', 'Тип: TASK, NOTE', 'TASK')
    .option('--json', 'Вывод в JSON')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const params: CreateProjectParams = { name: opts.name };
        if (opts.color) params.color = opts.color;
        const view = parseViewMode(opts.view);
        if (view) params.viewMode = view;
        const kind = parseKind(opts.kind);
        if (kind) params.kind = kind;

        const spinner = opts.json ? null : ora('Создание проекта...').start();
        const project = await client.createProject(params);
        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(project) + '\n');
        } else {
          console.log(formatProjectDetail(project, []));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

export function registerProjectUpdateCommand(program: Command): void {
  program
    .command('project-update <projectId>')
    .description('Изменить проект')
    .option('-n, --name <text>', 'Новое название')
    .option('--color <hex>', 'Цвет')
    .option('--view <mode>', 'Режим: list, kanban, timeline')
    .option('--kind <kind>', 'Тип: TASK, NOTE')
    .option('--json', 'Вывод в JSON')
    .action(async (projectId, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const params: UpdateProjectParams = {};
        if (opts.name !== undefined) params.name = opts.name;
        if (opts.color !== undefined) params.color = opts.color;
        const view = parseViewMode(opts.view);
        if (view) params.viewMode = view;
        const kind = parseKind(opts.kind);
        if (kind) params.kind = kind;

        const spinner = opts.json ? null : ora('Обновление проекта...').start();
        const project = await client.updateProject(projectId, params);
        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(project) + '\n');
        } else {
          console.log(formatProjectDetail(project, []));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

export function registerProjectDeleteCommand(program: Command): void {
  program
    .command('project-delete <projectId>')
    .description('Удалить проект')
    .option('-y, --yes', 'Не спрашивать подтверждение')
    .option('--json', 'Вывод в JSON')
    .action(async (projectId, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        if (!opts.yes && !opts.json) {
          const { createInterface } = await import('node:readline/promises');
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          const answer = await rl.question(`Удалить проект ${projectId}? Все его задачи будут удалены. (y/N): `);
          rl.close();
          if (answer.toLowerCase() !== 'y') {
            console.log('Отменено.');
            return;
          }
        }

        await client.deleteProject(projectId);

        if (opts.json) {
          process.stdout.write(jsonOutput({ projectId, deleted: true }) + '\n');
        } else {
          console.log(chalk.red(`\n✗ Проект ${projectId} удалён.\n`));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

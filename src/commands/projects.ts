import { Command } from 'commander';
import ora from 'ora';
import { loadConfig, createClient, resolveProjectId } from '../config/config.js';
import { handleApiError, inboxListingUnavailable } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { formatProjectList, formatProjectDetail } from '../formatters/table.js';

export function registerProjectsCommand(program: Command): void {
  program
    .command('projects')
    .description('Список проектов')
    .option('--json', 'Вывод в JSON')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const spinner = opts.json ? null : ora('Загрузка проектов...').start();
        const apiProjects = await client.getProjects();
        const projects = config.inboxId
          ? [
              { id: config.inboxId, name: 'Inbox', kind: 'INBOX', viewMode: 'list' },
              ...apiProjects,
            ]
          : apiProjects;
        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(projects) + '\n');
        } else {
          console.log(formatProjectList(projects));
          console.log(`\nВсего: ${projects.length} проектов`);
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

export function registerProjectCommand(program: Command): void {
  program
    .command('project <id>')
    .description('Детали проекта с задачами')
    .option('--json', 'Вывод в JSON')
    .action(async (projectId, opts) => {
      try {
        const config = await loadConfig();
        const resolvedId = resolveProjectId(projectId, config) ?? projectId;

        if (resolvedId === config.inboxId) {
          throw inboxListingUnavailable();
        }

        const client = await createClient(config);

        const spinner = opts.json ? null : ora('Загрузка проекта...').start();
        const data = await client.getProjectData(resolvedId);
        spinner?.stop();

        const tasks = data.tasks ?? [];

        if (opts.json) {
          process.stdout.write(jsonOutput(data) + '\n');
        } else {
          console.log(formatProjectDetail(data.project, tasks));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

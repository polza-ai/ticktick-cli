import { Command } from 'commander';
import ora from 'ora';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { formatTaskList, formatTaskDetail } from '../formatters/table.js';

export function registerTasksCommand(program: Command): void {
  program
    .command('tasks')
    .description('Список задач')
    .option('--project <id>', 'Фильтр по проекту (ID)')
    .option('--priority <n>', 'Фильтр по приоритету (0, 1, 3, 5)')
    .option('--tag <tag>', 'Фильтр по тегу')
    .option('--completed', 'Показать завершённые')
    .option('-l, --limit <n>', 'Лимит задач', '50')
    .option('--sort <field>', 'Сортировка (priority, dueDate, title)', 'priority')
    .option('--json', 'Вывод в JSON')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const spinner = opts.json ? null : ora('Загрузка задач...').start();

        let tasks;
        let projects;

        if (opts.project) {
          const data = await client.getProjectData(opts.project);
          tasks = data.tasks ?? [];
          projects = [data.project];
        } else {
          const batch = await client.batchCheck();
          tasks = batch.syncTaskBean?.update ?? [];
          projects = batch.projectProfiles ?? [];
        }

        // Filter by status
        if (!opts.completed) {
          tasks = tasks.filter(t => t.status !== 2);
        }

        // Filter by priority
        if (opts.priority !== undefined) {
          const p = parseInt(opts.priority, 10);
          tasks = tasks.filter(t => t.priority === p);
        }

        // Filter by tag
        if (opts.tag) {
          tasks = tasks.filter(t => t.tags?.includes(opts.tag));
        }

        // Sort
        if (opts.sort === 'priority') {
          tasks.sort((a, b) => b.priority - a.priority);
        } else if (opts.sort === 'dueDate') {
          tasks.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
          });
        } else if (opts.sort === 'title') {
          tasks.sort((a, b) => a.title.localeCompare(b.title));
        }

        // Limit
        const limit = parseInt(opts.limit, 10);
        tasks = tasks.slice(0, limit);

        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(tasks) + '\n');
        } else {
          console.log(formatTaskList(tasks, projects));
          console.log(`\nВсего: ${tasks.length} задач`);
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

export function registerTaskCommand(program: Command): void {
  program
    .command('task <id>')
    .description('Детали задачи')
    .option('--project <id>', 'ID проекта')
    .option('--json', 'Вывод в JSON')
    .action(async (taskId, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const spinner = opts.json ? null : ora('Загрузка задачи...').start();

        let task;
        let projectName: string | undefined;

        if (opts.project) {
          task = await client.getTask(opts.project, taskId);
          try {
            const projects = await client.getProjects();
            projectName = projects.find(p => p.id === opts.project)?.name;
          } catch { /* ignore */ }
        } else {
          const found = await client.findTaskById(taskId);
          if (!found) {
            spinner?.stop();
            console.error('Задача не найдена. Попробуйте указать --project <id>.');
            process.exit(3);
          }
          task = found.task;
          try {
            const projects = await client.getProjects();
            projectName = projects.find(p => p.id === task!.projectId)?.name;
          } catch { /* ignore */ }
        }

        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(task) + '\n');
        } else {
          console.log(formatTaskDetail(task, projectName));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

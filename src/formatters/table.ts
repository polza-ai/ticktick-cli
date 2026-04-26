import Table from 'cli-table3';
import chalk from 'chalk';
import dayjs from 'dayjs';
import type { Task, SubTask, Project } from '../client/types.js';

function fmtDate(iso?: string): string {
  if (!iso) return '';
  return dayjs(iso).format('DD.MM.YYYY HH:mm');
}

function fmtDateShort(iso?: string): string {
  if (!iso) return '';
  return dayjs(iso).format('DD.MM.YYYY');
}

const priorityLabels: Record<number, string> = {
  0: 'нет',
  1: 'низкий',
  3: 'средний',
  5: 'высокий',
};

const priorityColors: Record<number, (s: string) => string> = {
  5: chalk.red.bold,
  3: chalk.yellow,
  1: chalk.cyan,
  0: chalk.gray,
};

function colorPriority(priority: number): string {
  const label = priorityLabels[priority] ?? `${priority}`;
  const colorFn = priorityColors[priority] ?? chalk.white;
  return colorFn(label);
}

function statusLabel(status: number): string {
  return status === 2 ? chalk.green('✓ готово') : chalk.white('○ активна');
}

export function formatTaskList(tasks: Task[], projects?: Project[]): string {
  if (tasks.length === 0) return chalk.gray('Задачи не найдены.');

  const projectMap = new Map(projects?.map(p => [p.id, p.name]) ?? []);

  const table = new Table({
    head: [
      chalk.bold('Приоритет'),
      chalk.bold('Статус'),
      chalk.bold('Проект'),
      chalk.bold('Название'),
      chalk.bold('Дедлайн'),
    ],
    colWidths: [12, 12, 16, 42, 14],
    wordWrap: true,
  });

  for (const task of tasks) {
    table.push([
      colorPriority(task.priority),
      statusLabel(task.status),
      projectMap.get(task.projectId) ?? chalk.gray('—'),
      task.title,
      fmtDateShort(task.dueDate),
    ]);
  }

  return table.toString();
}

export function formatTaskDetail(task: Task, projectName?: string): string {
  const lines: string[] = [
    '',
    `${chalk.bold(task.title)}`,
    '',
    `  Статус:      ${statusLabel(task.status)}`,
    `  Приоритет:   ${colorPriority(task.priority)}`,
    `  Проект:      ${projectName ?? task.projectId}`,
    `  ID:          ${chalk.gray(task.id)}`,
  ];

  if (task.tags?.length) {
    lines.push(`  Теги:        ${task.tags.join(', ')}`);
  }
  if (task.dueDate) {
    lines.push(`  Дедлайн:     ${fmtDate(task.dueDate)}`);
  }
  if (task.startDate) {
    lines.push(`  Начало:      ${fmtDate(task.startDate)}`);
  }
  if (task.items?.length) {
    const done = task.items.filter(i => i.status !== 0).length;
    lines.push(`  Подзадачи:   ${done}/${task.items.length}`);
  }
  if (task.createdTime) {
    lines.push(`  Создана:     ${fmtDate(task.createdTime)}`);
  }
  if (task.modifiedTime) {
    lines.push(`  Обновлена:   ${fmtDate(task.modifiedTime)}`);
  }

  if (task.content) {
    lines.push('');
    lines.push(chalk.bold('  Описание:'));
    const desc = task.content.length > 500
      ? task.content.slice(0, 500) + '...'
      : task.content;
    lines.push('  ' + desc.split('\n').join('\n  '));
  }

  if (task.items?.length) {
    lines.push('');
    lines.push(chalk.bold('  Подзадачи:'));
    lines.push(formatChecklist(task.items));
  }

  lines.push('');
  return lines.join('\n');
}

export function formatProjectList(projects: Project[]): string {
  if (projects.length === 0) return chalk.gray('Проекты не найдены.');

  const table = new Table({
    head: [
      chalk.bold('Название'),
      chalk.bold('ID'),
      chalk.bold('Вид'),
    ],
    colWidths: [30, 30, 12],
    wordWrap: true,
  });

  for (const p of projects) {
    table.push([
      p.name,
      chalk.gray(p.id),
      p.viewMode ?? '—',
    ]);
  }

  return table.toString();
}

export function formatProjectDetail(project: Project, tasks: Task[]): string {
  const lines: string[] = [
    '',
    chalk.bold(project.name),
    '',
    `  ID:    ${chalk.gray(project.id)}`,
    `  Вид:   ${project.viewMode ?? '—'}`,
  ];

  if (project.color) {
    lines.push(`  Цвет:  ${project.color}`);
  }

  if (tasks.length > 0) {
    lines.push('');
    lines.push(chalk.bold(`  Задачи (${tasks.length}):`));
    lines.push('');
    lines.push(formatTaskList(tasks));
  } else {
    lines.push('');
    lines.push(chalk.gray('  Задач нет.'));
  }

  lines.push('');
  return lines.join('\n');
}

function formatChecklist(items: SubTask[]): string {
  if (items.length === 0) return chalk.gray('  Подзадач нет.');
  return items.map((item, i) => {
    const icon = item.status === 1 ? chalk.green('✓') : chalk.gray('○');
    const text = item.status === 1 ? chalk.strikethrough(item.title) : item.title;
    return `  ${icon} ${i + 1}. ${text}`;
  }).join('\n');
}

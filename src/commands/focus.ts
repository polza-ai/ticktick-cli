import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import dayjs from 'dayjs';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import type { Focus, FocusType } from '../client/types.js';

function parseFocusType(value: string | undefined): FocusType {
  if (value === undefined) return 0;
  const v = value.toLowerCase();
  if (v === 'pomodoro' || v === '0') return 0;
  if (v === 'timing' || v === '1') return 1;
  throw new Error(`Невалидный type: ${value}. Используйте pomodoro или timing.`);
}

function fmtDuration(seconds?: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}с`;
  if (s === 0) return `${m}м`;
  return `${m}м ${s}с`;
}

function formatFocusList(focuses: Focus[]): string {
  if (focuses.length === 0) return chalk.gray('Сессий не найдено.');

  const table = new Table({
    head: [
      chalk.bold('Тип'),
      chalk.bold('Начало'),
      chalk.bold('Длительность'),
      chalk.bold('Заметка'),
      chalk.bold('ID'),
    ],
    colWidths: [10, 20, 14, 30, 30],
    wordWrap: true,
  });

  for (const f of focuses) {
    table.push([
      f.type === 0 ? 'Pomodoro' : 'Timing',
      f.startTime ? dayjs(f.startTime).format('DD.MM.YYYY HH:mm') : '—',
      fmtDuration(f.duration),
      f.note ?? '',
      chalk.gray(f.id),
    ]);
  }

  return table.toString();
}

export function registerFocusesCommand(program: Command): void {
  program
    .command('focuses')
    .description('Список фокус-сессий за период')
    .requiredOption('--from <date>', 'Начало диапазона (ISO, например 2026-04-01T00:00:00+0000)')
    .requiredOption('--to <date>', 'Конец диапазона (ISO)')
    .option('--type <t>', 'Тип: pomodoro (0) или timing (1)', 'pomodoro')
    .option('--json', 'Вывод в JSON')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const type = parseFocusType(opts.type);

        const spinner = opts.json ? null : ora('Загрузка фокус-сессий...').start();
        const focuses = await client.getFocuses(opts.from, opts.to, type);
        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(focuses) + '\n');
        } else {
          console.log(formatFocusList(focuses));
          console.log(`\nВсего: ${focuses.length} сессий`);
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

export function registerFocusCommand(program: Command): void {
  program
    .command('focus <focusId>')
    .description('Детали фокус-сессии')
    .option('--type <t>', 'Тип: pomodoro (0) или timing (1)', 'pomodoro')
    .option('--json', 'Вывод в JSON')
    .action(async (focusId, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const type = parseFocusType(opts.type);

        const spinner = opts.json ? null : ora('Загрузка сессии...').start();
        const focus = await client.getFocus(focusId, type);
        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(focus) + '\n');
        } else {
          console.log('');
          console.log(chalk.bold(`Фокус-сессия ${focus.id}`));
          console.log('');
          console.log(`  Тип:           ${focus.type === 0 ? 'Pomodoro' : 'Timing'}`);
          if (focus.startTime) console.log(`  Начало:        ${dayjs(focus.startTime).format('DD.MM.YYYY HH:mm:ss')}`);
          if (focus.endTime) console.log(`  Конец:         ${dayjs(focus.endTime).format('DD.MM.YYYY HH:mm:ss')}`);
          console.log(`  Длительность:  ${fmtDuration(focus.duration)}`);
          if (focus.taskId) console.log(`  Task ID:       ${chalk.gray(focus.taskId)}`);
          if (focus.note) console.log(`  Заметка:       ${focus.note}`);
          if (focus.status !== undefined) console.log(`  Статус:        ${focus.status}`);
          console.log('');
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

export function registerFocusDeleteCommand(program: Command): void {
  program
    .command('focus-delete <focusId>')
    .description('Удалить фокус-сессию')
    .option('--type <t>', 'Тип: pomodoro (0) или timing (1)', 'pomodoro')
    .option('-y, --yes', 'Не спрашивать подтверждение')
    .option('--json', 'Вывод в JSON')
    .action(async (focusId, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const type = parseFocusType(opts.type);

        if (!opts.yes && !opts.json) {
          const { createInterface } = await import('node:readline/promises');
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          const answer = await rl.question(`Удалить фокус-сессию ${focusId}? (y/N): `);
          rl.close();
          if (answer.toLowerCase() !== 'y') {
            console.log('Отменено.');
            return;
          }
        }

        const result = await client.deleteFocus(focusId, type);

        if (opts.json) {
          process.stdout.write(jsonOutput(result) + '\n');
        } else {
          console.log(chalk.red(`\n✗ Сессия ${focusId} удалена.\n`));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

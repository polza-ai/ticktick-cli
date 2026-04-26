import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import dayjs from 'dayjs';
import { loadConfig, createClient } from '../config/config.js';
import { handleApiError } from '../utils/error.js';
import { jsonOutput } from '../formatters/json.js';
import { parseStamp } from '../utils/validate.js';
import type {
  Habit, HabitCheckin, CreateHabitParams, UpdateHabitParams, HabitCheckinInput,
} from '../client/types.js';

function formatHabitList(habits: Habit[]): string {
  if (habits.length === 0) return chalk.gray('Привычек не найдено.');

  const table = new Table({
    head: [
      chalk.bold('Название'),
      chalk.bold('Чек-инов'),
      chalk.bold('Цель'),
      chalk.bold('Повтор'),
      chalk.bold('ID'),
    ],
    colWidths: [25, 12, 14, 30, 28],
    wordWrap: true,
  });

  for (const h of habits) {
    const goal = h.goal !== undefined ? `${h.goal}${h.unit ? ' ' + h.unit : ''}` : '—';
    table.push([
      h.name,
      `${h.totalCheckIns ?? 0}`,
      goal,
      h.repeatRule ?? '—',
      chalk.gray(h.id),
    ]);
  }

  return table.toString();
}

function formatHabitDetail(h: Habit): string {
  const lines: string[] = [
    '',
    chalk.bold(h.name),
    '',
    `  ID:           ${chalk.gray(h.id)}`,
  ];
  if (h.totalCheckIns !== undefined) lines.push(`  Чек-инов:     ${h.totalCheckIns}`);
  if (h.completedCycles !== undefined) lines.push(`  Циклов:       ${h.completedCycles}`);
  if (h.goal !== undefined) lines.push(`  Цель:         ${h.goal}${h.unit ? ' ' + h.unit : ''}`);
  if (h.step !== undefined) lines.push(`  Шаг:          ${h.step}`);
  if (h.type) lines.push(`  Тип:          ${h.type}`);
  if (h.repeatRule) lines.push(`  Повтор:       ${h.repeatRule}`);
  if (h.color) lines.push(`  Цвет:         ${h.color}`);
  if (h.encouragement) lines.push(`  Девиз:        ${h.encouragement}`);
  if (h.createdTime) lines.push(`  Создана:      ${h.createdTime}`);
  if (h.modifiedTime) lines.push(`  Обновлена:    ${h.modifiedTime}`);
  lines.push('');
  return lines.join('\n');
}

export function registerHabitsCommand(program: Command): void {
  program
    .command('habits')
    .description('Список привычек')
    .option('--json', 'Вывод в JSON')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const spinner = opts.json ? null : ora('Загрузка привычек...').start();
        const habits = await client.getHabits();
        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(habits) + '\n');
        } else {
          console.log(formatHabitList(habits));
          console.log(`\nВсего: ${habits.length} привычек`);
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

export function registerHabitCommand(program: Command): void {
  program
    .command('habit <habitId>')
    .description('Детали привычки')
    .option('--json', 'Вывод в JSON')
    .action(async (habitId, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const spinner = opts.json ? null : ora('Загрузка привычки...').start();
        const habit = await client.getHabit(habitId);
        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(habit) + '\n');
        } else {
          console.log(formatHabitDetail(habit));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

function todayStamp(): number {
  return parseInt(dayjs().format('YYYYMMDD'), 10);
}

export function registerHabitCreateCommand(program: Command): void {
  program
    .command('habit-create')
    .description('Создать привычку')
    .requiredOption('-n, --name <text>', 'Название привычки (до 1000 символов)')
    .option('--icon <res>', 'Ресурс иконки (например habit_reading)')
    .option('--color <hex>', 'Цвет (например #4D8CF5)')
    .option('--type <type>', 'Тип: Boolean, Real (для целевых значений)')
    .option('--goal <n>', 'Цель (число)', parseFloat)
    .option('--step <n>', 'Шаг (число)', parseFloat)
    .option('--unit <unit>', 'Единица (например Count, Page)')
    .option('--repeat <rrule>', 'RRULE (например RRULE:FREQ=DAILY;INTERVAL=1)')
    .option('--record', 'Включить запись значений (recordEnable)')
    .option('--target-days <n>', 'Целевое количество дней', (v) => parseInt(v, 10))
    .option('--target-start <stamp>', 'Дата старта цели (YYYYMMDD)')
    .option('--encouragement <text>', 'Мотивирующая фраза')
    .option('--json', 'Вывод в JSON')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const params: CreateHabitParams = { name: opts.name };
        if (opts.icon !== undefined) params.iconRes = opts.icon;
        if (opts.color !== undefined) params.color = opts.color;
        if (opts.type !== undefined) params.type = opts.type;
        if (opts.goal !== undefined) params.goal = opts.goal;
        if (opts.step !== undefined) params.step = opts.step;
        if (opts.unit !== undefined) params.unit = opts.unit;
        if (opts.repeat !== undefined) params.repeatRule = opts.repeat;
        if (opts.record) params.recordEnable = true;
        if (opts.targetDays !== undefined) params.targetDays = opts.targetDays;
        const targetStart = parseStamp(opts.targetStart);
        if (targetStart !== undefined) params.targetStartDate = targetStart;
        if (opts.encouragement !== undefined) params.encouragement = opts.encouragement;

        const spinner = opts.json ? null : ora('Создание привычки...').start();
        const habit = await client.createHabit(params);
        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(habit) + '\n');
        } else {
          console.log(formatHabitDetail(habit));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

export function registerHabitUpdateCommand(program: Command): void {
  program
    .command('habit-update <habitId>')
    .description('Изменить привычку')
    .option('-n, --name <text>', 'Новое название')
    .option('--icon <res>', 'Ресурс иконки')
    .option('--color <hex>', 'Цвет')
    .option('--type <type>', 'Тип')
    .option('--goal <n>', 'Цель', parseFloat)
    .option('--step <n>', 'Шаг', parseFloat)
    .option('--unit <unit>', 'Единица')
    .option('--repeat <rrule>', 'RRULE')
    .option('--status <n>', 'Статус (число)', (v) => parseInt(v, 10))
    .option('--target-days <n>', 'Целевое количество дней', (v) => parseInt(v, 10))
    .option('--target-start <stamp>', 'Дата старта цели (YYYYMMDD)')
    .option('--encouragement <text>', 'Мотивирующая фраза')
    .option('--json', 'Вывод в JSON')
    .action(async (habitId, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const params: UpdateHabitParams = {};
        if (opts.name !== undefined) params.name = opts.name;
        if (opts.icon !== undefined) params.iconRes = opts.icon;
        if (opts.color !== undefined) params.color = opts.color;
        if (opts.type !== undefined) params.type = opts.type;
        if (opts.goal !== undefined) params.goal = opts.goal;
        if (opts.step !== undefined) params.step = opts.step;
        if (opts.unit !== undefined) params.unit = opts.unit;
        if (opts.repeat !== undefined) params.repeatRule = opts.repeat;
        if (opts.status !== undefined) params.status = opts.status;
        if (opts.targetDays !== undefined) params.targetDays = opts.targetDays;
        const targetStart = parseStamp(opts.targetStart);
        if (targetStart !== undefined) params.targetStartDate = targetStart;
        if (opts.encouragement !== undefined) params.encouragement = opts.encouragement;

        const spinner = opts.json ? null : ora('Обновление привычки...').start();
        const habit = await client.updateHabit(habitId, params);
        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(habit) + '\n');
        } else {
          console.log(formatHabitDetail(habit));
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

export function registerHabitCheckinCommand(program: Command): void {
  program
    .command('habit-checkin <habitId>')
    .description('Отметить выполнение привычки (создать или обновить запись)')
    .option('--stamp <stamp>', 'Дата (YYYYMMDD), по умолчанию сегодня')
    .option('--value <n>', 'Значение (по умолчанию 1.0)', parseFloat)
    .option('--goal <n>', 'Цель (по умолчанию 1.0)', parseFloat)
    .option('--status <n>', 'Статус', (v) => parseInt(v, 10))
    .option('--time <iso>', 'Время чек-ина (ISO)')
    .option('--json', 'Вывод в JSON')
    .action(async (habitId, opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const stamp = parseStamp(opts.stamp) ?? todayStamp();
        const input: HabitCheckinInput = { stamp };
        if (opts.value !== undefined) input.value = opts.value;
        if (opts.goal !== undefined) input.goal = opts.goal;
        if (opts.status !== undefined) input.status = opts.status;
        if (opts.time !== undefined) input.time = opts.time;

        const spinner = opts.json ? null : ora('Чек-ин...').start();
        const result = await client.checkinHabit(habitId, input);
        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(result) + '\n');
        } else {
          console.log(chalk.green(`\n✓ Чек-ин ${stamp} для привычки ${habitId} сохранён.\n`));
          if (result.checkins?.length) {
            console.log(formatCheckins([result]));
          }
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

function formatCheckins(items: HabitCheckin[]): string {
  const rows: { habitId: string; stamp: number; value: string; status: string }[] = [];
  for (const r of items) {
    for (const c of r.checkins ?? []) {
      const v = c.value ?? 1;
      const g = c.goal ?? 1;
      rows.push({
        habitId: r.habitId,
        stamp: c.stamp,
        value: `${v}/${g}`,
        status: c.status !== undefined ? `${c.status}` : '—',
      });
    }
  }
  if (rows.length === 0) return chalk.gray('Чек-инов нет.');

  const table = new Table({
    head: [chalk.bold('Habit ID'), chalk.bold('Дата'), chalk.bold('Value/Goal'), chalk.bold('Статус')],
    colWidths: [28, 12, 14, 10],
    wordWrap: true,
  });
  for (const r of rows) {
    table.push([chalk.gray(r.habitId), `${r.stamp}`, r.value, r.status]);
  }
  return table.toString();
}

export function registerHabitCheckinsCommand(program: Command): void {
  program
    .command('habit-checkins')
    .description('Чек-ины привычек за период')
    .requiredOption('--habits <ids...>', 'ID привычек (через пробел)')
    .requiredOption('--from <stamp>', 'Начало диапазона (YYYYMMDD)')
    .requiredOption('--to <stamp>', 'Конец диапазона (YYYYMMDD)')
    .option('--json', 'Вывод в JSON')
    .action(async (opts) => {
      try {
        const config = await loadConfig();
        const client = await createClient(config);

        const from = parseStamp(opts.from)!;
        const to = parseStamp(opts.to)!;
        const ids: string[] = Array.isArray(opts.habits) ? opts.habits : [opts.habits];

        const spinner = opts.json ? null : ora('Загрузка чек-инов...').start();
        const result = await client.getHabitCheckins(ids, from, to);
        spinner?.stop();

        if (opts.json) {
          process.stdout.write(jsonOutput(result) + '\n');
        } else {
          console.log(formatCheckins(result));
          const total = result.reduce((acc, r) => acc + (r.checkins?.length ?? 0), 0);
          console.log(`\nВсего: ${total} чек-инов`);
        }
      } catch (error) {
        handleApiError(error);
      }
    });
}

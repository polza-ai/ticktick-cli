import dayjs from 'dayjs';
import { validationError } from './error.js';

const ALLOWED_PRIORITIES = new Set([0, 1, 3, 5]);
const API_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ssZZ';

export function parsePriority(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || !ALLOWED_PRIORITIES.has(n)) {
    throw validationError(`Невалидный priority: ${value}. Допустимые значения: 0, 1, 3, 5.`);
  }
  return n;
}

export function normalizeDueDate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;

  // YYYY-MM-DD — без времени, считаем 00:00 UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00+0000`;
  }

  // Иначе — ISO 8601 (с временем и/или offset). Без offset трактуется как локальное время.
  const d = dayjs(value);
  if (!d.isValid()) {
    throw validationError(`Невалидная дата: ${value}. Ожидается YYYY-MM-DD или ISO 8601.`);
  }
  return d.format(API_DATE_FORMAT);
}

export function addMinutesToIso(iso: string, minutes: number): string {
  return dayjs(iso).add(minutes, 'minute').format(API_DATE_FORMAT);
}

export function nowIso(): string {
  return dayjs().format(API_DATE_FORMAT);
}

// "30m" | "1h" | "1h30m" | "1.5h" | "90" (минуты) → число минут.
export function parseDuration(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  const m = trimmed.match(/^(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m)?$/);
  if (!m || (!m[1] && !m[2])) {
    throw validationError(
      `Невалидная длительность: ${value}. Примеры: 30m, 1h, 1h30m, 1.5h, 90.`,
    );
  }

  const hours = m[1] ? parseFloat(m[1]) : 0;
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const total = Math.round(hours * 60 + minutes);
  if (total <= 0) {
    throw validationError(`Длительность должна быть положительной: ${value}.`);
  }
  return total;
}

export function parseStamp(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d{8}$/.test(value)) {
    throw validationError(`Невалидный stamp: ${value}. Формат: YYYYMMDD (например 20260426).`);
  }
  return parseInt(value, 10);
}

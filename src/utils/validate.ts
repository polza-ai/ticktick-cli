import { validationError } from './error.js';

const ALLOWED_PRIORITIES = new Set([0, 1, 3, 5]);

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

  // YYYY-MM-DD → 00:00 UTC ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) {
      throw validationError(`Невалидная дата: ${value}. Ожидается YYYY-MM-DD или ISO 8601.`);
    }
    return `${value}T00:00:00+0000`;
  }

  // ISO 8601 — пропускаем как есть, но валидируем что Date парсится
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw validationError(`Невалидная дата: ${value}. Ожидается YYYY-MM-DD или ISO 8601.`);
  }
  return value;
}

export function parseStamp(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d{8}$/.test(value)) {
    throw validationError(`Невалидный stamp: ${value}. Формат: YYYYMMDD (например 20260426).`);
  }
  return parseInt(value, 10);
}

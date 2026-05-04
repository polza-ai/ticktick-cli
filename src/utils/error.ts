import { AxiosError } from 'axios';

export class TickTickCliError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode: number = 1
  ) {
    super(message);
    this.name = 'TickTickCliError';
  }
}

export function notFoundError(resource: string, id: string): TickTickCliError {
  return new TickTickCliError(`${resource} ${id} не найден(а).`, 'NOT_FOUND', 3);
}

export function validationError(message: string): TickTickCliError {
  return new TickTickCliError(message, 'VALIDATION_ERROR', 4);
}

export function inboxListingUnavailable(): TickTickCliError {
  return new TickTickCliError(
    'Получить список задач Inbox через TickTick OpenAPI невозможно — этот эндпоинт недоступен по Bearer-токену. Используйте "ticktick task <id>" для прямого доступа к Inbox-задаче.',
    'INBOX_LISTING_UNAVAILABLE',
    5,
  );
}

export function handleApiError(error: unknown): never {
  if (error instanceof TickTickCliError) throw error;

  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const body = error.response?.data as Record<string, unknown> | undefined;
    const apiMessage = (body?.message as string) ?? (body?.error_description as string) ?? '';

    switch (status) {
      case 401:
        throw new TickTickCliError(
          'Неверный токен авторизации. Запустите "ticktick init" для настройки.',
          'AUTH_ERROR', 2
        );
      case 403:
        throw new TickTickCliError(
          `Нет доступа. ${apiMessage}`,
          'FORBIDDEN', 2
        );
      case 404:
        throw new TickTickCliError(
          `Не найдено. ${apiMessage}`,
          'NOT_FOUND', 3
        );
      case 422:
        throw new TickTickCliError(
          `Невалидный запрос: ${apiMessage}`,
          'VALIDATION_ERROR', 4
        );
      case 429:
        throw new TickTickCliError(
          'Превышен лимит запросов. Подождите и попробуйте снова.',
          'RATE_LIMIT', 1
        );
      default:
        throw new TickTickCliError(
          `Ошибка API (${status}): ${apiMessage || error.message}`,
          'API_ERROR', 1
        );
    }
  }

  if (error instanceof Error) {
    throw new TickTickCliError(error.message, 'UNKNOWN', 1);
  }

  throw new TickTickCliError(String(error), 'UNKNOWN', 1);
}

export function formatError(error: unknown, json: boolean): string {
  if (error instanceof TickTickCliError) {
    if (json) {
      return JSON.stringify({ ok: false, error: { code: error.code, message: error.message } });
    }
    return error.message;
  }
  if (json) {
    return JSON.stringify({ ok: false, error: { code: 'UNKNOWN', message: String(error) } });
  }
  return String(error);
}

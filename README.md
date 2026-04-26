<h1 align="center">ticktick</h1>

<p align="center">
  CLI для TickTick — для людей и AI-агентов
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@polza-ai/ticktick-cli"><img src="https://img.shields.io/npm/v/@polza-ai/ticktick-cli?color=blue" alt="npm version"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="node version">
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript&logoColor=white" alt="TypeScript">
  <a href="https://github.com/polza-ai/ticktick-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="license"></a>
</p>

---

- **Для людей** — цветные таблицы, спиннеры, интерактивная настройка
- **Для AI-агентов** — `--json` на каждой команде, стабильный формат `{ ok, data }`
- **Встроенная авторизация** — OAuth-приложение встроено, `ticktick init` и всё работает

## Быстрый старт

```bash
npm i -g @polza-ai/ticktick-cli

ticktick init                          # открывает браузер, нажали «Разрешить» — готово
ticktick tasks                         # все задачи
ticktick create -t "Купить молоко"     # создать задачу
ticktick complete <id>                 # завершить задачу
```

## Команды

| Команда | Описание | Пример |
|---------|----------|--------|
| `init` | Настроить подключение (OAuth 2.0) | `ticktick init` |
| `tasks` | Список задач с фильтрами | `ticktick tasks --priority 5` |
| `task` | Детали задачи | `ticktick task <id>` |
| `create` | Создать задачу | `ticktick create -t "Баг" --priority 5` |
| `update` | Изменить задачу | `ticktick update <id> -t "..." -p 5` |
| `complete` | Завершить задачу | `ticktick complete <id>` |
| `delete` | Удалить задачу | `ticktick delete <id>` |
| `move` | Переместить задачу в другой проект | `ticktick move <id> --to <projectId>` |
| `completed` | Список завершённых задач | `ticktick completed --from 2026-01-01` |
| `projects` | Список проектов | `ticktick projects` |
| `project` | Проект с задачами | `ticktick project <id>` |
| `project-create` | Создать проект | `ticktick project-create -n "Работа"` |
| `project-update` | Изменить проект | `ticktick project-update <id> -n "..."` |
| `project-delete` | Удалить проект | `ticktick project-delete <id>` |
| `focuses` | Список фокус-сессий | `ticktick focuses --from ... --to ...` |
| `focus` | Детали фокус-сессии | `ticktick focus <id>` |
| `focus-delete` | Удалить фокус-сессию | `ticktick focus-delete <id>` |
| `habits` | Список привычек | `ticktick habits` |
| `habit` | Детали привычки | `ticktick habit <id>` |
| `habit-create` | Создать привычку | `ticktick habit-create -n "Read" --type Boolean --repeat "RRULE:FREQ=DAILY;INTERVAL=1"` |
| `habit-update` | Изменить привычку | `ticktick habit-update <id> -n "..." --goal 2` |
| `habit-checkin` | Чек-ин привычки | `ticktick habit-checkin <id>` |
| `habit-checkins` | Чек-ины за период | `ticktick habit-checkins --habits <id> --from 20260101 --to 20260501` |

> Все команды поддерживают `--json` для машинного вывода.

## Настройка

```bash
ticktick init
```

CLI откроет браузер — нажмите «Разрешить», и всё готово. OAuth-приложение встроено, ничего регистрировать не нужно.

> Если хотите использовать своё приложение: `ticktick init --custom-app`

## Интеграция с AI-агентами

`ticktick` спроектирован как инструмент для AI-агентов: данные идут в stdout (JSON/таблица), логи и спиннеры — в stderr. Флаг `--json` возвращает стабильный конверт:

```json
{ "ok": true,  "data": { "id": "abc123", "title": "..." } }
{ "ok": false, "error": { "code": "NOT_FOUND", "message": "Не найдено" } }
```

## Конфигурация

### Глобальный конфиг

`~/.ticktick-cli/config.json` — создаётся через `ticktick init`. Токен обновляется автоматически через refresh_token.

### Проектный конфиг

`.ticktick.json` — переопределяет настройки для конкретного проекта:

```json
{
  "defaultProject": "<project-id>",
  "defaultTags": ["work"],
  "defaultPriority": 3
}
```

<details>
<summary><strong>Полный справочник команд</strong></summary>

### init

```
ticktick init [--custom-app] [--project]
```

| Флаг | Описание |
|------|----------|
| `--custom-app` | Использовать своё OAuth-приложение (вместо встроенного) |
| `--project` | Создать `.ticktick.json` в текущей директории |

### tasks

```
ticktick tasks [опции]
```

| Флаг | Описание |
|------|----------|
| `--project <id>` | Фильтр по проекту |
| `--priority <n>` | Фильтр по приоритету (0, 1, 3, 5) |
| `--tag <tag>` | Фильтр по тегу |
| `--completed` | Включить завершённые задачи |
| `-l, --limit <n>` | Максимум задач (по умолчанию: 50) |
| `--sort <field>` | Сортировка: `priority`, `dueDate`, `title` |
| `--json` | JSON-вывод |

### task

```
ticktick task <id> [--project <id>] [--json]
```

Выводит полную информацию: название, описание, статус, приоритет, проект, теги, подзадачи, даты.

### create

```
ticktick create -t "Название" [опции]
```

| Флаг | Описание |
|------|----------|
| `-t, --title <text>` | Название задачи **(обязательно)** |
| `--content <text>` | Описание |
| `--project <id>` | Проект |
| `-p, --priority <n>` | Приоритет: `0` (нет), `1` (низкий), `3` (средний), `5` (высокий) |
| `--due <date>` | Дедлайн (YYYY-MM-DD) |
| `--tag <tags...>` | Теги |
| `--json` | JSON-вывод |

### update

```
ticktick update <taskId> [опции]
```

| Флаг | Описание |
|------|----------|
| `--project <id>` | ID проекта (если не указан — найдётся автоматически) |
| `-t, --title <text>` | Новое название |
| `--content <text>` | Описание |
| `-p, --priority <n>` | Приоритет (0, 1, 3, 5) |
| `--due <date>` | Дедлайн |
| `--start <date>` | Дата начала |
| `--all-day` | Без времени |
| `--timezone <tz>` | Часовой пояс |
| `--repeat <rrule>` | Правило повторения |
| `--json` | JSON-вывод |

### move

```
ticktick move <taskId> --to <projectId> [--from <projectId>] [--json]
```

### completed

```
ticktick completed [--project <ids...>] [--from <date>] [--to <date>] [-l <n>] [--json]
```

### project-create / project-update / project-delete

```
ticktick project-create -n "Название" [--color #F18181] [--view list|kanban|timeline] [--kind TASK|NOTE]
ticktick project-update <id> [-n ...] [--color ...] [--view ...] [--kind ...]
ticktick project-delete <id> [-y]
```

### focuses / focus / focus-delete

```
ticktick focuses --from <ISO> --to <ISO> [--type pomodoro|timing] [--json]
ticktick focus <focusId> [--type pomodoro|timing] [--json]
ticktick focus-delete <focusId> [--type pomodoro|timing] [-y]
```

> Диапазон не больше 30 дней. Если больше — сервер автоматически сдвигает `from`.

### habits / habit / habit-create / habit-update

```
ticktick habits [--json]
ticktick habit <habitId> [--json]

ticktick habit-create -n "Read" [--icon habit_reading] [--color #4D8CF5] \
  [--type Boolean] [--goal 1] [--step 1] [--unit Count] \
  [--repeat "RRULE:FREQ=DAILY;INTERVAL=1"] [--record] \
  [--target-days N] [--target-start YYYYMMDD] [--encouragement "..."]

ticktick habit-update <habitId> [-n ...] [--goal ...] [--repeat ...] \
  [--status <n>] [--target-days N] [--target-start YYYYMMDD]
```

> DELETE для привычек в API нет — для архивации используйте `habit-update <id> --status 1`.

### habit-checkin / habit-checkins

```
ticktick habit-checkin <habitId> [--stamp YYYYMMDD] [--value 1.0] [--goal 1.0] [--status <n>] [--time ISO]
ticktick habit-checkins --habits <id1> <id2> ... --from YYYYMMDD --to YYYYMMDD [--json]
```

> Без `--stamp` чек-ин делается на сегодня.

### complete

```
ticktick complete <taskId> [--project <id>] [--json]
```

### delete

```
ticktick delete <taskId> [--project <id>] [-y] [--json]
```

| Флаг | Описание |
|------|----------|
| `--project <id>` | ID проекта |
| `-y, --yes` | Без подтверждения |
| `--json` | JSON-вывод |

### projects

```
ticktick projects [--json]
```

### project

```
ticktick project <id> [--json]
```

Показывает проект и все его задачи.

</details>

<details>
<summary><strong>Разработка</strong></summary>

```bash
git clone https://github.com/polza-ai/ticktick-cli.git
cd ticktick-cli
npm install

npm run dev -- tasks           # запуск через tsx
npm run build                  # компиляция в dist/
npm run typecheck              # проверка типов
```

</details>

## API

CLI покрывает 100% [официального TickTick Open API](https://developer.ticktick.com/docs#/openapi): задачи (CRUD, перемещение, фильтр, завершённые), проекты (CRUD), фокус-сессии (read/delete), привычки (CRUD без delete) и чек-ины.

## Требования

- **Node.js** 20+
- **Аккаунт TickTick**

## Лицензия

[MIT](./LICENSE)

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
| `complete` | Завершить задачу | `ticktick complete <id>` |
| `delete` | Удалить задачу | `ticktick delete <id>` |
| `projects` | Список проектов | `ticktick projects` |
| `project` | Проект с задачами | `ticktick project <id>` |

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

CLI использует [официальный TickTick Open API](https://developer.ticktick.com/docs#/openapi) (6 эндпоинтов: проекты, задачи, создание, завершение, удаление).

## Требования

- **Node.js** 20+
- **Аккаунт TickTick**

## Лицензия

[MIT](./LICENSE)

# План полного тестирования ticktick-cli

Ручной/полу-автоматический e2e-чеклист по всем 22 командам CLI. Запускается на живом TickTick-аккаунте через `npm run dev -- <cmd>` или из `dist/` после `npm run build`.

> Условности: `$P` — id тестового проекта, `$T` — id задачи, `$H` — id привычки, `$F` — id фокус-сессии. Подставляются из вывода предыдущих шагов.

## 0. Pre-flight

```bash
npm install
npm run typecheck         # должен пройти молча
npm run build             # dist/ собрался
node dist/bin/ticktick.js --version
node dist/bin/ticktick.js --help    # 22 команды + init + help
```

Проверь, что хелп каждой команды печатается:

```bash
for cmd in init tasks task create update complete delete move completed \
           projects project project-create project-update project-delete \
           focuses focus focus-delete habits habit habit-create habit-update \
           habit-checkin habit-checkins; do
  echo "=== $cmd ===" && npm run dev -- $cmd --help 2>&1 | tail -n +3
done
```

Ожидание: ни одна команда не падает; описание + флаги читаемы.

## 1. Setup / OAuth

### 1.1 Свежий init (встроенное приложение)

```bash
mv ~/.ticktick-cli/config.json ~/.ticktick-cli/config.json.bak  # бэкап
npm run dev -- init
```

- Открывается браузер, после «Разрешить» — успех.
- `~/.ticktick-cli/config.json` создан, содержит `clientId`, `clientSecret`, `accessToken`, `refreshToken`, `tokenExpiresAt`.

### 1.2 Свой OAuth-app

```bash
npm run dev -- init --custom-app
```

- Спрашивает Client ID / Secret.
- Падает с понятной ошибкой, если оставить пустым.

### 1.3 Конфиг проекта

```bash
cd /tmp && mkdir tt-test && cd tt-test
npm run dev --prefix /Users/ilya/code/ticktick-cli -- init --project
ls -la .ticktick.json
cat .ticktick.json
```

- Создан `.ticktick.json` с `defaultProject` (если выбрали).

### 1.4 Auto-refresh токена

```bash
# в config.json вручную сломать accessToken (заменить хвост)
jq '.accessToken = "broken_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"' \
   ~/.ticktick-cli/config.json > /tmp/c.json && mv /tmp/c.json ~/.ticktick-cli/config.json
npm run dev -- projects --json | head -5
```

Ожидание: первый 401 → авто-refresh через `refreshToken` → запрос успешен; в `config.json` обновился `accessToken`.

### 1.5 Команда без конфига

```bash
mv ~/.ticktick-cli/config.json /tmp/c.bak
npm run dev -- projects 2>&1
mv /tmp/c.bak ~/.ticktick-cli/config.json
```

Ожидание: stderr — «Конфигурация не найдена. Запустите "ticktick init"...», exit 1.

## 2. Read-only smoke (безопасно)

### 2.1 Projects

```bash
npm run dev -- projects                      # таблица
npm run dev -- projects --json | jq '.ok'    # true
npm run dev -- projects --json | jq '.data[0] | keys'
```

Поля: `id, name, color?, viewMode?, kind, groupId?, sortOrder?, permission?, closed?` (boolean).

### 2.2 Project by id

```bash
P=$(npm run dev -- projects --json | jq -r '.data[0].id')
npm run dev -- project "$P"
npm run dev -- project "$P" --json | jq '.data | {projectId: .project.id, taskCount: (.tasks // [] | length), columns: (.columns // [] | length)}'
```

### 2.3 Tasks (агрегированный список)

```bash
npm run dev -- tasks
npm run dev -- tasks --priority 5
npm run dev -- tasks --priority 0
npm run dev -- tasks --sort dueDate
npm run dev -- tasks --sort title
npm run dev -- tasks --completed --limit 10
npm run dev -- tasks --project "$P" --json | jq '.data | length'
npm run dev -- tasks --tag несуществующий-тег --json | jq '.data | length'  # 0
```

### 2.4 Task by id

```bash
T=$(npm run dev -- tasks --json | jq -r '.data[0].id')
TP=$(npm run dev -- tasks --json | jq -r '.data[0].projectId')
npm run dev -- task "$T" --project "$TP"          # быстро (прямой GET)
npm run dev -- task "$T"                          # медленнее, перебор
npm run dev -- task "$T" --project "$TP" --json | jq '.data.id'
```

### 2.5 Completed tasks

```bash
npm run dev -- completed --from 2026-01-01T00:00:00+0000 --to 2026-04-26T23:59:59+0000 --limit 5
npm run dev -- completed --json | jq '.data | length'                       # без фильтров
npm run dev -- completed --project "$P" --from 2026-01-01T00:00:00+0000 --to 2026-04-26T23:59:59+0000 --json | jq '.data[0]'
```

### 2.6 Focuses

```bash
npm run dev -- focuses --from 2026-04-01T00:00:00+0000 --to 2026-04-26T00:00:00+0000 --type pomodoro
npm run dev -- focuses --from 2026-04-01T00:00:00+0000 --to 2026-04-26T00:00:00+0000 --type timing --json | jq '.data | length'
# >30 дней — сервер сам подрежет from
npm run dev -- focuses --from 2025-01-01T00:00:00+0000 --to 2026-04-26T00:00:00+0000 --type pomodoro --json | jq '.data | length'
```

Если есть запись:
```bash
F=$(npm run dev -- focuses --from 2026-04-01T00:00:00+0000 --to 2026-04-26T00:00:00+0000 --type pomodoro --json | jq -r '.data[0].id // empty')
[ -n "$F" ] && npm run dev -- focus "$F" --type pomodoro
```

### 2.7 Habits

```bash
npm run dev -- habits
npm run dev -- habits --json | jq '.data | length'
H=$(npm run dev -- habits --json | jq -r '.data[0].id // empty')
[ -n "$H" ] && npm run dev -- habit "$H"
```

## 3. Write-цикл (с гарантированной очисткой)

Все мутации делаем в одноразовом тестовом проекте, который удаляем в конце.

### 3.1 Project CRUD

```bash
# create
P=$(npm run dev -- project-create -n "ticktick-cli e2e" --color "#FF5733" --view list --kind TASK --json | jq -r '.data.id')
echo "Created project: $P"

# read
npm run dev -- project "$P" --json | jq '.data.project.name'   # "ticktick-cli e2e"

# update
npm run dev -- project-update "$P" -n "ticktick-cli e2e (renamed)" --color "#33FF57" --view kanban --json \
  | jq '.data | {name, color, viewMode}'

# Невалидные значения — внятная ошибка
npm run dev -- project-update "$P" --view xxx 2>&1 | grep -i 'view\|невалид' && echo OK
npm run dev -- project-update "$P" --kind WRONG 2>&1 | grep -i 'kind\|невалид' && echo OK
```

### 3.2 Task CRUD

```bash
# create — минимум
T1=$(npm run dev -- create -t "smoke task 1" --project "$P" --json | jq -r '.data.id')

# create — со всеми флагами
T2=$(npm run dev -- create -t "smoke task 2" --project "$P" \
       --content "описание" -p 5 --due "2026-12-31" --tag work urgent --json | jq -r '.data.id')

# read
npm run dev -- task "$T1" --project "$P" --json | jq '.data | {title, status, priority}'
npm run dev -- task "$T2" --project "$P" --json | jq '.data | {tags, priority, dueDate}'

# update — несколько полей
npm run dev -- update "$T1" --project "$P" -t "smoke task 1 (upd)" -p 3 --content "новое описание" --json \
  | jq '.data | {title, priority, content}'

# update без --project — авто-резолв через findTaskById
npm run dev -- update "$T2" --content "auto-resolve test" --json | jq '.data.content'

# move в другой проект
P2=$(npm run dev -- project-create -n "ticktick-cli e2e #2" --json | jq -r '.data.id')
npm run dev -- move "$T2" --to "$P2" --json | jq '.data[0]'   # {id, etag}
npm run dev -- task "$T2" --project "$P2" --json | jq '.data.projectId'   # == $P2
# move обратно
npm run dev -- move "$T2" --from "$P2" --to "$P" --json

# complete
npm run dev -- complete "$T2" --project "$P" --json | jq
npm run dev -- task "$T2" --project "$P" --json | jq '.data.status'    # 2

# проверка: completed/filter возвращают её
npm run dev -- completed --project "$P" --from 2026-04-25T00:00:00+0000 --to 2026-04-30T00:00:00+0000 --json \
  | jq --arg id "$T2" '.data | map(select(.id == $id)) | length'    # >= 1

# delete (без подтверждения)
npm run dev -- delete "$T1" --project "$P" -y --json | jq '.data.deleted'   # true
npm run dev -- delete "$T2" --project "$P" -y --json | jq '.data.deleted'

# 404 после удаления
npm run dev -- task "$T1" --project "$P" 2>&1 | grep -iE '404|не найден' && echo OK
```

### 3.3 Habit CRUD

```bash
# create
H=$(npm run dev -- habit-create -n "e2e habit" --type Boolean --goal 1 --step 1 --unit Count \
       --repeat "RRULE:FREQ=DAILY;INTERVAL=1" --json | jq -r '.data.id')

# read
npm run dev -- habit "$H" --json | jq '.data | {name, repeatRule, type}'

# update
npm run dev -- habit-update "$H" -n "e2e habit (upd)" --goal 2 --json | jq '.data | {name, goal}'

# checkin (на сегодня)
npm run dev -- habit-checkin "$H" --json | jq '.data.checkins[0]'

# checkin на конкретную дату
npm run dev -- habit-checkin "$H" --stamp 20260425 --value 1 --goal 1 --json | jq '.data.checkins[0]'

# дубль — должен апдейтнуть, не сломаться
npm run dev -- habit-checkin "$H" --stamp 20260425 --value 1 --goal 1 --json | jq '.ok'

# checkins за период
npm run dev -- habit-checkins --habits "$H" --from 20260101 --to 20260501 --json | jq '.data[0].checkins | length'

# несколько habit ids одной командой (variadic)
H2=$(npm run dev -- habit-create -n "e2e habit 2" --type Boolean --goal 1 --json | jq -r '.data.id')
npm run dev -- habit-checkin "$H2" --json
npm run dev -- habit-checkins --habits "$H" "$H2" --from 20260101 --to 20260501 --json \
  | jq '.data | length'   # 2

# архивация (DELETE в API нет)
npm run dev -- habit-update "$H" --status 1 --json | jq '.data.status'    # 1
npm run dev -- habit-update "$H2" --status 1 --json
```

### 3.4 Cleanup

```bash
npm run dev -- project-delete "$P" -y --json | jq '.data.deleted'    # true
npm run dev -- project-delete "$P2" -y --json | jq '.data.deleted'

# проверка: проекта больше нет
npm run dev -- project "$P" 2>&1 | grep -iE '404|не найден' && echo OK
```

> Привычки `$H`, `$H2` остаются в архиве — DELETE habit нет в API. При желании удалить вручную через приложение TickTick.

## 4. Edge cases / errors

### 4.1 Невалидные параметры

```bash
# плохая дата
npm run dev -- create -t "x" --project "$P" --due "не-дата" 2>&1
# плохой priority (число вне 0/1/3/5 — API скорее всего скушает, но проверь поведение)
npm run dev -- create -t "x" --project "$P" -p 99 --json
# плохой stamp
npm run dev -- habit-checkin "$H" --stamp 2026-04-26 2>&1 | grep -iE 'stamp|формат' && echo OK
npm run dev -- habit-checkin "$H" --stamp abcd 2>&1 | grep -i 'stamp' && echo OK
# focus без --type — должен дефолтнуть в pomodoro
npm run dev -- focuses --from 2026-04-01T00:00:00+0000 --to 2026-04-02T00:00:00+0000 --json | jq '.ok'
# focus с мусорным type
npm run dev -- focuses --from 2026-04-01T00:00:00+0000 --to 2026-04-02T00:00:00+0000 --type qqq 2>&1 | grep -i 'type' && echo OK
```

### 4.2 Несуществующие ID

```bash
npm run dev -- task aaaaaaaaaaaaaaaaaaaaaaaa --project "$P" 2>&1 | grep -iE '404|не найден' && echo OK
npm run dev -- task aaaaaaaaaaaaaaaaaaaaaaaa 2>&1                                            # auto-resolve
npm run dev -- complete aaaaaaaaaaaaaaaaaaaaaaaa --project "$P" 2>&1
npm run dev -- delete aaaaaaaaaaaaaaaaaaaaaaaa --project "$P" -y 2>&1
npm run dev -- move aaaaaaaaaaaaaaaaaaaaaaaa --to "$P" 2>&1
npm run dev -- project aaaaaaaaaaaaaaaaaaaaaaaa 2>&1
npm run dev -- habit aaaaaaaaaaaaaaaaaaaaaaaa 2>&1
npm run dev -- focus aaaaaaaaaaaaaaaaaaaaaaaa 2>&1
```

Ожидание: stderr с понятным сообщением, exit code 3 для NOT_FOUND.

### 4.3 Auth errors

```bash
# невалидный токен
jq '.accessToken = "deadbeef"' ~/.ticktick-cli/config.json > /tmp/c.json
mv /tmp/c.json ~/.ticktick-cli/config.json
# refresh всё равно сработает; чтобы поймать настоящий 401, сломать оба:
jq '.refreshToken = "deadbeef"' ~/.ticktick-cli/config.json > /tmp/c.json
mv /tmp/c.json ~/.ticktick-cli/config.json
npm run dev -- projects --json 2>&1
# восстановить из бэкапа!
```

Ожидание: stderr «Неверный токен авторизации», exit 2; в JSON-режиме — `{ok:false, error:{code:"AUTH_ERROR", message:...}}`.

### 4.4 Confirm prompts

```bash
# delete без -y и без --json — должен спросить
echo "n" | npm run dev -- delete "$T1" --project "$P"          # отменено
echo "y" | npm run dev -- delete "$T1" --project "$P"          # удалено
# project-delete без -y
echo "n" | npm run dev -- project-delete "$P"
# focus-delete без -y
echo "n" | npm run dev -- focus-delete fakeid --type pomodoro

# с --json — пропускает подтверждение (проверь, что не просит)
echo "" | timeout 5 npm run dev -- delete "$T1" --project "$P" --json 2>&1
```

## 5. JSON envelope (machine output)

Для каждой команды убедиться, что `--json` даёт стабильный конверт.

```bash
# success: {ok:true, data:...}
for cmd in 'projects' 'tasks --limit 1' 'habits' \
           "completed --from 2026-04-25T00:00:00+0000 --to 2026-04-26T23:59:59+0000 --limit 1"; do
  echo "=== $cmd ==="
  npm run dev -- $cmd --json | jq -e '.ok == true and (has("data"))' > /dev/null && echo OK || echo FAIL
done

# error: {ok:false, error:{code, message}}
npm run dev -- task aaaaaaaaaaaaaaaaaaaaaaaa --project aaaa --json 2>&1 \
  | jq -e '.ok == false and .error.code != null and .error.message != null' > /dev/null && echo OK
```

Также:
- `--json` подавляет спиннеры (визуально проверить, что нет `⠋ Загрузка...` в stderr).
- Текст ошибки идёт в stderr, JSON-конверт — в stdout.

```bash
npm run dev -- task aaaaaaaaaaaaaaaaaaaaaaaa --project aaaa --json 1>/tmp/out 2>/tmp/err
jq '.ok' /tmp/out      # false
cat /tmp/err           # человекочитаемая ошибка
```

## 6. Exit codes

| Код | Случай | Команда |
|-----|--------|---------|
| 0 | Успех | `ticktick projects` |
| 1 | Generic / no config / rate limit | `ticktick projects` без конфига |
| 2 | AUTH_ERROR / FORBIDDEN | сломанные токены |
| 3 | NOT_FOUND | `ticktick task <fake-id>` |
| 4 | VALIDATION_ERROR (422) | редкий, требует специально кривого payload |

```bash
npm run dev -- projects; echo "exit=$?"                # 0
mv ~/.ticktick-cli/config.json /tmp/b
npm run dev -- projects 2>/dev/null; echo "exit=$?"    # 1
mv /tmp/b ~/.ticktick-cli/config.json
npm run dev -- task fake --project fake 2>/dev/null; echo "exit=$?"   # 3
```

## 7. Lib API (SDK импорт)

```bash
cd /tmp && mkdir sdk-test && cd sdk-test
npm init -y && npm install /Users/ilya/code/ticktick-cli
cat > test.mjs <<'EOF'
import { loadConfig, createClient } from '@polza-ai/ticktick-cli';
const cfg = await loadConfig();
const c = await createClient(cfg);
console.log('projects:', (await c.getProjects()).length);
EOF
node test.mjs
```

Все экспортируемые типы должны быть доступны при `import type`.

## 8. Регрессии

Перед релизом прогнать минимум:

```bash
npm run typecheck && npm run build
node dist/bin/ticktick.js projects --json | jq '.ok'              # true
node dist/bin/ticktick.js tasks --limit 5 --json | jq '.data | length'
node dist/bin/ticktick.js habits --json | jq '.ok'
```

## Чеклист перед публикацией

- [ ] `npm run typecheck` зелёный
- [ ] `npm run build` создал `dist/` без ошибок
- [ ] `node dist/bin/ticktick.js --help` показывает все 22 команды
- [ ] Прогнаны секции 2 (read-only) и 3 (write-цикл с cleanup)
- [ ] Прогнаны 4.2 (404) и 5 (JSON envelope)
- [ ] README актуален (новые команды описаны)
- [ ] Версия в `package.json` поднята

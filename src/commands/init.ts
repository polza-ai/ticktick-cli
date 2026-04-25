import { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import open from 'open';
import { saveGlobalConfig, saveProjectConfig, GLOBAL_CONFIG_PATH } from '../config/config.js';
import type { GlobalConfig } from '../config/config.schema.js';
import { buildAuthUrl, exchangeCode, waitForAuthCode } from '../config/auth.js';
import { TickTickClient } from '../client/ticktick-client.js';

async function prompt(rl: ReturnType<typeof createInterface>, question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  const answer = await rl.question(`${question}${suffix}: `);
  return answer.trim() || defaultValue || '';
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Настроить подключение к TickTick')
    .option('--project', 'Создать также конфиг проекта (.ticktick.json)')
    .action(async (opts) => {
      const rl = createInterface({ input: stdin, output: stdout });

      try {
        console.log('');
        console.log('🔧 Настройка TickTick CLI');
        console.log('─'.repeat(40));

        // Step 1: Client credentials
        console.log('');
        console.log('Шаг 1. Приложение OAuth');
        console.log('');
        console.log('  Зарегистрируйте приложение на https://developer.ticktick.com/manage');
        console.log('  Redirect URL: http://localhost:18321/callback');
        console.log('');

        const clientId = await prompt(rl, 'Client ID');
        if (!clientId) {
          console.error('\n❌ Client ID обязателен.\n');
          process.exit(1);
        }

        const clientSecret = await prompt(rl, 'Client Secret');
        if (!clientSecret) {
          console.error('\n❌ Client Secret обязателен.\n');
          process.exit(1);
        }

        // Step 2: OAuth flow
        console.log('');
        console.log('Шаг 2. Авторизация');
        console.log('');
        console.log('  Открываю браузер для авторизации...');
        console.log('');

        const authUrl = buildAuthUrl(clientId);

        // Start waiting for callback before opening browser
        const codePromise = waitForAuthCode();
        await open(authUrl);

        console.log('  Ожидаю авторизацию в браузере...');
        console.log(`  (или откройте вручную: ${authUrl})`);
        console.log('');

        let code: string;
        try {
          code = await codePromise;
        } catch {
          console.log('  Не удалось получить код через браузер.');
          code = await prompt(rl, 'Вставьте код авторизации вручную');
          if (!code) {
            console.error('\n❌ Код авторизации обязателен.\n');
            process.exit(1);
          }
        }

        // Step 3: Exchange code for token
        console.log('Шаг 3. Получение токена...');
        console.log('');

        const tokenResp = await exchangeCode(clientId, clientSecret, code);

        // Step 4: Verify
        console.log('Шаг 4. Проверка подключения...');
        console.log('');

        const client = new TickTickClient({ accessToken: tokenResp.access_token });

        let defaultProject = '';

        try {
          const user = await client.getUserProfile();
          console.log(`  ✅ Подключено! Вы: ${user.username}`);
          console.log('');

          const projects = await client.getProjects();

          if (projects.length > 0) {
            console.log('  Доступные проекты:');
            console.log('');
            projects.forEach((p, i) => {
              console.log(`  ${i + 1}. ${p.name}`);
            });
            console.log('');

            const projectChoice = await prompt(rl, 'Выберите проект по умолчанию (номер, Enter — пропустить)', '');

            if (projectChoice) {
              const idx = parseInt(projectChoice, 10) - 1;
              if (idx >= 0 && idx < projects.length) {
                defaultProject = projects[idx].id;
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log('  ⚠️  Не удалось получить данные пользователя.');
          console.log(`     ${msg}`);
          console.log('');
        }

        // Save
        const expiresAt = tokenResp.expires_in
          ? new Date(Date.now() + tokenResp.expires_in * 1000).toISOString()
          : undefined;

        const config: GlobalConfig = {
          clientId,
          clientSecret,
          accessToken: tokenResp.access_token,
          ...(tokenResp.refresh_token && { refreshToken: tokenResp.refresh_token }),
          ...(expiresAt && { tokenExpiresAt: expiresAt }),
          ...(defaultProject && { defaultProject }),
          apiBaseUrl: 'https://api.ticktick.com/open/v1',
        };

        await saveGlobalConfig(config);

        console.log('');
        console.log(`✅ Конфигурация сохранена в ${GLOBAL_CONFIG_PATH}`);

        // Optional: project config
        if (opts.project) {
          console.log('');
          console.log('Настройка проекта (.ticktick.json)');
          console.log('─'.repeat(40));

          await saveProjectConfig({
            ...(defaultProject && { defaultProject }),
          });
          console.log('✅ Конфиг проекта сохранён в .ticktick.json');
        }

        console.log('');
        console.log('🎉 Готово! Попробуйте:');
        console.log('');
        console.log('  ticktick tasks       — список задач');
        console.log('  ticktick projects    — список проектов');
        console.log('  ticktick create -t "Название задачи"');
        console.log('');
      } finally {
        rl.close();
      }
    });
}

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { globalConfigSchema, projectConfigSchema, type GlobalConfig, type ProjectConfig, type ResolvedConfig } from './config.schema.js';
import { TickTickClient } from '../client/ticktick-client.js';

export const GLOBAL_CONFIG_DIR = join(homedir(), '.ticktick-cli');
export const GLOBAL_CONFIG_PATH = join(GLOBAL_CONFIG_DIR, 'config.json');
export const PROJECT_CONFIG_NAME = '.ticktick.json';

async function readJsonFile(path: string): Promise<unknown> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function findProjectConfig(startDir: string = process.cwd()): string | null {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, PROJECT_CONFIG_NAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function loadGlobalConfig(): Promise<GlobalConfig | null> {
  const raw = await readJsonFile(GLOBAL_CONFIG_PATH);
  if (!raw) return null;
  return globalConfigSchema.parse(raw);
}

export async function loadProjectConfig(): Promise<ProjectConfig | null> {
  const path = findProjectConfig();
  if (!path) return null;
  const raw = await readJsonFile(path);
  if (!raw) return null;
  return projectConfigSchema.parse(raw);
}

export async function loadConfig(): Promise<ResolvedConfig> {
  const global = await loadGlobalConfig();
  if (!global) {
    throw new Error('Конфигурация не найдена. Запустите "ticktick init" для настройки.');
  }

  const project = await loadProjectConfig();

  return {
    clientId: global.clientId,
    clientSecret: global.clientSecret,
    accessToken: global.accessToken,
    refreshToken: global.refreshToken,
    tokenExpiresAt: global.tokenExpiresAt,
    apiBaseUrl: global.apiBaseUrl,
    defaultProject: project?.defaultProject ?? global.defaultProject,
    defaultTags: project?.defaultTags,
    defaultPriority: project?.defaultPriority,
  };
}

export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
  if (!existsSync(GLOBAL_CONFIG_DIR)) {
    await mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
  }
  await writeFile(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function saveProjectConfig(config: ProjectConfig, dir: string = process.cwd()): Promise<void> {
  const path = join(dir, PROJECT_CONFIG_NAME);
  await writeFile(path, JSON.stringify(config, null, 2), 'utf-8');
}

export async function createClient(config?: ResolvedConfig): Promise<TickTickClient> {
  const resolved = config ?? await loadConfig();
  return new TickTickClient({
    accessToken: resolved.accessToken,
    apiBaseUrl: resolved.apiBaseUrl,
    clientId: resolved.clientId,
    clientSecret: resolved.clientSecret,
    refreshToken: resolved.refreshToken,
    onTokenRefresh: async (accessToken, refreshToken) => {
      try {
        const global = await loadGlobalConfig();
        if (global) {
          global.accessToken = accessToken;
          if (refreshToken) global.refreshToken = refreshToken;
          await saveGlobalConfig(global);
        }
      } catch { /* best effort */ }
    },
  });
}

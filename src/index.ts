export { TickTickClient, type TickTickClientConfig } from './client/ticktick-client.js';
export type { Task, SubTask, Project, Tag, UserProfile, ProjectData, BatchCheckResponse, CreateTaskParams, UpdateTaskParams } from './client/types.js';
export { loadConfig, loadGlobalConfig, loadProjectConfig, saveGlobalConfig, saveProjectConfig, createClient } from './config/config.js';
export type { GlobalConfig, ProjectConfig, ResolvedConfig } from './config/config.schema.js';
export { TickTickCliError, handleApiError, formatError } from './utils/error.js';

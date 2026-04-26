export { TickTickClient, type TickTickClientConfig } from './client/ticktick-client.js';
export type {
  Task, SubTask, SubTaskInput, Project, Column, ProjectData,
  CreateTaskParams, UpdateTaskParams,
  MoveTaskOperation, MoveTaskResult,
  CompletedTasksParams, FilterTasksParams,
  CreateProjectParams, UpdateProjectParams,
  Focus, FocusType, PomodoroTaskBrief,
  Habit, CreateHabitParams, UpdateHabitParams,
  HabitCheckin, HabitCheckinData, HabitCheckinInput,
} from './client/types.js';
export { loadConfig, loadGlobalConfig, loadProjectConfig, saveGlobalConfig, saveProjectConfig, createClient } from './config/config.js';
export type { GlobalConfig, ProjectConfig, ResolvedConfig } from './config/config.schema.js';
export { TickTickCliError, handleApiError, formatError } from './utils/error.js';

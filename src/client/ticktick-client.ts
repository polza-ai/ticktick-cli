import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type {
  Task, Project, ProjectData, CreateTaskParams, UpdateTaskParams,
  MoveTaskOperation, MoveTaskResult, CompletedTasksParams, FilterTasksParams,
  CreateProjectParams, UpdateProjectParams,
  Focus, FocusType,
  Habit, CreateHabitParams, UpdateHabitParams,
  HabitCheckin, HabitCheckinInput,
} from './types.js';
import { notFoundError } from '../utils/error.js';

// TickTick Open API часто отвечает 200 + пустым телом для несуществующих ID.
// Считаем ресурс отсутствующим, если в теле нет id (или вообще нет тела).
function assertResource<T extends { id?: string }>(
  data: T | null | undefined | string,
  resource: string,
  id: string,
): T {
  if (!data || typeof data === 'string' || !data.id) {
    throw notFoundError(resource, id);
  }
  return data;
}

export interface TickTickClientConfig {
  accessToken: string;
  apiBaseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  onTokenRefresh?: (accessToken: string, refreshToken?: string) => void;
}

export class TickTickClient {
  private http: AxiosInstance;
  private config: TickTickClientConfig;

  constructor(config: TickTickClientConfig) {
    this.config = config;
    this.http = axios.create({
      baseURL: config.apiBaseUrl ?? 'https://api.ticktick.com/open/v1',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Rate limit retry
    this.http.interceptors.response.use(undefined, async (error: AxiosError) => {
      if (error.response?.status === 429 && error.config) {
        const retryAfter = parseInt(error.response.headers['retry-after'] as string ?? '2', 10);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        return this.http.request(error.config);
      }
      // Auto-refresh on 401
      if (error.response?.status === 401 && error.config && this.config.refreshToken && this.config.clientId && this.config.clientSecret) {
        try {
          const { refreshAccessToken } = await import('../config/auth.js');
          const tokenResp = await refreshAccessToken(this.config.clientId, this.config.clientSecret, this.config.refreshToken);
          this.config.accessToken = tokenResp.access_token;
          if (tokenResp.refresh_token) this.config.refreshToken = tokenResp.refresh_token;
          this.http.defaults.headers['Authorization'] = `Bearer ${tokenResp.access_token}`;
          error.config.headers['Authorization'] = `Bearer ${tokenResp.access_token}`;
          this.config.onTokenRefresh?.(tokenResp.access_token, tokenResp.refresh_token);
          return this.http.request(error.config);
        } catch {
          // refresh failed, throw original error
        }
      }
      throw error;
    });
  }

  // ===== Projects =====

  async getProjects(): Promise<Project[]> {
    const { data } = await this.http.get<Project[]>('/project');
    return data;
  }

  async getProject(projectId: string): Promise<Project> {
    const { data } = await this.http.get<Project>(`/project/${projectId}`);
    return assertResource(data, 'Проект', projectId);
  }

  async getProjectData(projectId: string): Promise<ProjectData> {
    const { data } = await this.http.get<ProjectData>(`/project/${projectId}/data`);
    if (!data?.project?.id) {
      throw notFoundError('Проект', projectId);
    }
    return data;
  }

  async createProject(params: CreateProjectParams): Promise<Project> {
    const { data } = await this.http.post<Project>('/project', params);
    return data;
  }

  async updateProject(projectId: string, params: UpdateProjectParams): Promise<Project> {
    const { data } = await this.http.post<Project>(`/project/${projectId}`, params);
    return data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.http.delete(`/project/${projectId}`);
  }

  // ===== Tasks =====

  async getTask(projectId: string, taskId: string): Promise<Task> {
    const { data } = await this.http.get<Task>(`/project/${projectId}/task/${taskId}`);
    return assertResource(data, 'Задача', taskId);
  }

  async createTask(params: CreateTaskParams): Promise<Task> {
    const { data } = await this.http.post<Task>('/task', params);
    return data;
  }

  async updateTask(taskId: string, params: UpdateTaskParams): Promise<Task> {
    const { data } = await this.http.post<Task>(`/task/${taskId}`, params);
    return data;
  }

  async completeTask(projectId: string, taskId: string): Promise<void> {
    await this.http.post(`/project/${projectId}/task/${taskId}/complete`);
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await this.http.delete(`/project/${projectId}/task/${taskId}`);
  }

  async moveTasks(operations: MoveTaskOperation[]): Promise<MoveTaskResult[]> {
    const { data } = await this.http.post<MoveTaskResult[]>('/task/move', operations);
    return data;
  }

  async getCompletedTasks(params: CompletedTasksParams = {}): Promise<Task[]> {
    const { data } = await this.http.post<Task[]>('/task/completed', params);
    return data;
  }

  async filterTasks(params: FilterTasksParams = {}): Promise<Task[]> {
    const { data } = await this.http.post<Task[]>('/task/filter', params);
    return data;
  }

  // ===== Focus =====

  async getFocus(focusId: string, type: FocusType): Promise<Focus> {
    const { data } = await this.http.get<Focus>(`/focus/${focusId}`, { params: { type } });
    return assertResource(data, 'Фокус-сессия', focusId);
  }

  async getFocuses(from: string, to: string, type: FocusType): Promise<Focus[]> {
    const { data } = await this.http.get<Focus[]>('/focus', { params: { from, to, type } });
    return data;
  }

  async deleteFocus(focusId: string, type: FocusType): Promise<Focus> {
    const { data } = await this.http.delete<Focus>(`/focus/${focusId}`, { params: { type } });
    return data;
  }

  // ===== Habits =====

  async getHabits(): Promise<Habit[]> {
    const { data } = await this.http.get<Habit[]>('/habit');
    return data;
  }

  async getHabit(habitId: string): Promise<Habit> {
    const { data } = await this.http.get<Habit>(`/habit/${habitId}`);
    return assertResource(data, 'Привычка', habitId);
  }

  async createHabit(params: CreateHabitParams): Promise<Habit> {
    const { data } = await this.http.post<Habit>('/habit', params);
    return data;
  }

  async updateHabit(habitId: string, params: UpdateHabitParams): Promise<Habit> {
    const { data } = await this.http.post<Habit>(`/habit/${habitId}`, params);
    return data;
  }

  async checkinHabit(habitId: string, input: HabitCheckinInput): Promise<HabitCheckin> {
    const { data } = await this.http.post<HabitCheckin>(`/habit/${habitId}/checkin`, input);
    return data;
  }

  async getHabitCheckins(habitIds: string[], from: number, to: number): Promise<HabitCheckin[]> {
    const { data } = await this.http.get<HabitCheckin[]>('/habit/checkins', {
      params: { habitIds: habitIds.join(','), from, to },
    });
    return data;
  }

  // ===== Helpers — built on top of documented endpoints =====

  async getAllTasks(): Promise<{ tasks: Task[]; projects: Project[] }> {
    const projects = await this.getProjects();
    const allTasks: Task[] = [];

    for (const project of projects) {
      try {
        const data = await this.getProjectData(project.id);
        if (data.tasks) {
          allTasks.push(...data.tasks);
        }
      } catch {
        // project may have no tasks or access denied
      }
    }

    return { tasks: allTasks, projects };
  }

  async findTaskById(
    taskId: string,
    inboxId?: string,
  ): Promise<{ task: Task; project: Project } | null> {
    const projects = await this.getProjects();

    for (const project of projects) {
      try {
        const data = await this.getProjectData(project.id);
        const task = data.tasks?.find(t => t.id === taskId);
        if (task) return { task, project };
      } catch {
        // skip
      }
    }

    if (inboxId) {
      try {
        const task = await this.getTask(inboxId, taskId);
        return {
          task,
          project: { id: inboxId, name: 'Inbox', kind: 'INBOX' },
        };
      } catch {
        // not in inbox either
      }
    }

    return null;
  }

  // Зонд для определения inboxId: создаёт временную задачу без projectId,
  // читает projectId из ответа (это inbox<userId>), удаляет.
  async detectInboxId(): Promise<string> {
    const probe = await this.createTask({ title: 'Inbox detect (auto-cleanup)' });
    if (!probe?.id || !probe?.projectId) {
      throw new Error('detectInboxId: пустой ответ /open/v1/task');
    }
    try {
      await this.deleteTask(probe.projectId, probe.id);
    } catch {
      // best effort: задача может остаться в Inbox
    }
    return probe.projectId;
  }
}

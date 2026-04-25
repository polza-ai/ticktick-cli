import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type {
  Task, Project, ProjectData, Tag, UserProfile,
  BatchCheckResponse, CreateTaskParams, UpdateTaskParams,
} from './types.js';

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

  // User

  async getUserProfile(): Promise<UserProfile> {
    const { data } = await this.http.get<UserProfile>('/user');
    return data;
  }

  // Projects

  async getProjects(): Promise<Project[]> {
    const { data } = await this.http.get<Project[]>('/project');
    return data;
  }

  async getProject(projectId: string): Promise<Project> {
    const { data } = await this.http.get<Project>(`/project/${projectId}`);
    return data;
  }

  async getProjectData(projectId: string): Promise<ProjectData> {
    const { data } = await this.http.get<ProjectData>(`/project/${projectId}/data`);
    return data;
  }

  // Tasks

  async getTask(projectId: string, taskId: string): Promise<Task> {
    const { data } = await this.http.get<Task>(`/project/${projectId}/task/${taskId}`);
    return data;
  }

  async createTask(params: CreateTaskParams): Promise<Task> {
    const { data } = await this.http.post<Task>('/task', params);
    return data;
  }

  async updateTask(projectId: string, taskId: string, params: UpdateTaskParams): Promise<Task> {
    const { data } = await this.http.post<Task>(`/task/${taskId}`, { ...params, projectId });
    return data;
  }

  async completeTask(projectId: string, taskId: string): Promise<void> {
    await this.http.post(`/project/${projectId}/task/${taskId}/complete`);
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await this.http.delete(`/project/${projectId}/task/${taskId}`);
  }

  // Tags

  async batchCreateTags(tags: { name: string; color?: string }[]): Promise<void> {
    await this.http.post('/batch/tag', tags);
  }

  async updateTag(oldName: string, newTag: { name: string; color?: string }): Promise<void> {
    await this.http.put(`/tag/${oldName}`, newTag);
  }

  async deleteTag(name: string): Promise<void> {
    await this.http.delete(`/tag/${name}`);
  }

  // Batch

  async batchCheck(): Promise<BatchCheckResponse> {
    const { data } = await this.http.get<BatchCheckResponse>('/batch/check/0');
    return data;
  }

  // Helpers

  async findTaskById(taskId: string): Promise<{ task: Task; projectId: string } | null> {
    const batch = await this.batchCheck();
    const tasks = batch.syncTaskBean?.update ?? [];
    const task = tasks.find(t => t.id === taskId);
    if (task) return { task, projectId: task.projectId };
    return null;
  }

  async getAllTasks(): Promise<Task[]> {
    const batch = await this.batchCheck();
    return batch.syncTaskBean?.update ?? [];
  }

  async getAllTags(): Promise<Tag[]> {
    const batch = await this.batchCheck();
    return batch.tags ?? [];
  }
}

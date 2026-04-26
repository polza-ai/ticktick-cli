import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type {
  Task, Project, ProjectData, CreateTaskParams,
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

  // Projects (documented in official API)

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

  // Tasks (documented in official API)

  async createTask(params: CreateTaskParams): Promise<Task> {
    const { data } = await this.http.post<Task>('/task', params);
    return data;
  }

  async completeTask(projectId: string, taskId: string): Promise<void> {
    await this.http.post(`/project/${projectId}/task/${taskId}/complete`);
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await this.http.delete(`/project/${projectId}/task/${taskId}`);
  }

  // Helpers — built on top of documented endpoints

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

  async findTaskById(taskId: string): Promise<{ task: Task; project: Project } | null> {
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

    return null;
  }
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  desc?: string;
  startDate?: string;
  dueDate?: string;
  priority: number; // 0=none, 1=low, 3=medium, 5=high
  status: number; // 0=normal, 2=completed
  tags?: string[];
  reminders?: string[];
  repeatFlag?: string;
  items?: SubTask[];
  sortOrder?: number;
  timeZone?: string;
  isAllDay?: string;
  completedTime?: string;
  createdTime?: string;
  modifiedTime?: string;
  kind?: string;
}

export interface SubTask {
  id: string;
  title: string;
  status: number; // 0=normal, 1=completed
  completedTime?: string;
  isAllDay?: string;
  sortOrder?: number;
  startDate?: string;
  timeZone?: string;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  viewMode?: string;
  groupId?: string;
  sortOrder?: number;
  closed?: string;
  permission?: string;
  kind?: string;
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  sortOrder?: number;
}

export interface Tag {
  name: string;
  label?: string;
  color?: string;
  sortOrder?: number;
  parent?: string;
}

export interface UserProfile {
  username: string;
  id?: string;
  name?: string;
  email?: string;
}

export interface ProjectData {
  project: Project;
  tasks: Task[];
  columns?: Column[];
}

export interface BatchCheckResponse {
  syncTaskBean?: { update?: Task[] };
  projectProfiles?: Project[];
  tags?: Tag[];
}

export interface CreateTaskParams {
  title: string;
  content?: string;
  projectId?: string;
  priority?: number;
  startDate?: string;
  dueDate?: string;
  tags?: string[];
  items?: { title: string; status?: number }[];
}

export interface UpdateTaskParams {
  title?: string;
  content?: string;
  projectId?: string;
  priority?: number;
  startDate?: string;
  dueDate?: string;
  tags?: string[];
  items?: SubTask[];
}

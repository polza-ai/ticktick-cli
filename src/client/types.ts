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
  isAllDay?: boolean;
  completedTime?: string;
  createdTime?: string;
  modifiedTime?: string;
  kind?: string;
  etag?: string;
}

export interface SubTask {
  id: string;
  title: string;
  status: number; // 0=normal, 1=completed
  completedTime?: string;
  isAllDay?: boolean;
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
  closed?: boolean;
  permission?: string;
  kind?: string;
}

export interface Column {
  id: string;
  projectId: string;
  name: string;
  sortOrder?: number;
}

export interface ProjectData {
  project: Project;
  tasks: Task[];
  columns?: Column[];
}

export interface CreateTaskParams {
  title: string;
  content?: string;
  desc?: string;
  projectId?: string;
  priority?: number;
  startDate?: string;
  dueDate?: string;
  tags?: string[];
  isAllDay?: boolean;
  timeZone?: string;
  reminders?: string[];
  repeatFlag?: string;
  sortOrder?: number;
  items?: SubTaskInput[];
}

export interface UpdateTaskParams {
  id: string;
  projectId: string;
  title?: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  reminders?: string[];
  repeatFlag?: string;
  priority?: number;
  sortOrder?: number;
  items?: SubTaskInput[];
}

export interface SubTaskInput {
  title: string;
  startDate?: string;
  isAllDay?: boolean;
  sortOrder?: number;
  timeZone?: string;
  status?: number;
  completedTime?: string;
}

export interface MoveTaskOperation {
  fromProjectId: string;
  toProjectId: string;
  taskId: string;
}

export interface MoveTaskResult {
  id: string;
  etag: string;
}

export interface CompletedTasksParams {
  projectIds?: string[];
  startDate?: string;
  endDate?: string;
}

export interface FilterTasksParams {
  projectIds?: string[];
  startDate?: string;
  endDate?: string;
  priority?: number[];
  tag?: string[];
  status?: number[];
}

export interface CreateProjectParams {
  name: string;
  color?: string;
  sortOrder?: number;
  viewMode?: 'list' | 'kanban' | 'timeline';
  kind?: 'TASK' | 'NOTE';
}

export interface UpdateProjectParams {
  name?: string;
  color?: string;
  sortOrder?: number;
  viewMode?: 'list' | 'kanban' | 'timeline';
  kind?: 'TASK' | 'NOTE';
}

export type FocusType = 0 | 1; // 0=Pomodoro, 1=Timing

export interface PomodoroTaskBrief {
  taskId?: string;
  title?: string;
  habitId?: string;
  timerId?: string;
  timerName?: string;
  startTime?: string;
  endTime?: string;
}

export interface Focus {
  id: string;
  type: FocusType;
  userId?: number;
  taskId?: string;
  note?: string;
  tasks?: PomodoroTaskBrief[];
  status?: number;
  startTime?: string;
  endTime?: string;
  pauseDuration?: number;
  adjustTime?: number;
  added?: boolean;
  createdTime?: string;
  modifiedTime?: string;
  etimestamp?: number;
  etag?: string;
  duration?: number;
  relationType?: number[];
}

export interface Habit {
  id: string;
  name: string;
  iconRes?: string;
  color?: string;
  sortOrder?: number;
  status?: number;
  encouragement?: string;
  totalCheckIns?: number;
  createdTime?: string;
  modifiedTime?: string;
  archivedTime?: string;
  type?: string;
  goal?: number;
  step?: number;
  unit?: string;
  etag?: string;
  repeatRule?: string;
  reminders?: string[];
  recordEnable?: boolean;
  sectionId?: string;
  targetDays?: number;
  targetStartDate?: number;
  completedCycles?: number;
  exDates?: string[];
  style?: number;
}

export interface CreateHabitParams {
  name: string;
  iconRes?: string;
  color?: string;
  sortOrder?: number;
  status?: number;
  encouragement?: string;
  type?: string;
  goal?: number;
  step?: number;
  unit?: string;
  repeatRule?: string;
  reminders?: string[];
  recordEnable?: boolean;
  sectionId?: string;
  targetDays?: number;
  targetStartDate?: number;
  completedCycles?: number;
  exDates?: string[];
  style?: number;
}

export type UpdateHabitParams = Partial<CreateHabitParams>;

export interface HabitCheckinInput {
  stamp: number; // YYYYMMDD
  time?: string;
  opTime?: string;
  value?: number;
  goal?: number;
  status?: number;
}

export interface HabitCheckinData {
  id?: string;
  stamp: number;
  time?: string;
  opTime?: string;
  value?: number;
  goal?: number;
  status?: number;
}

export interface HabitCheckin {
  id?: string;
  habitId: string;
  createdTime?: string;
  modifiedTime?: string;
  etag?: string;
  year: number;
  checkins: HabitCheckinData[];
}

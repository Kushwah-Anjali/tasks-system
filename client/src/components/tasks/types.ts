export type TaskStatus = "assigned" | "in_progress" | "submitted" | "completed";

export interface Task {
  id: number;
  title: string;
  assigned_to_name: string;
  due_date: string;
  status: TaskStatus;
  progress: number;
  assigned_date: string;
}
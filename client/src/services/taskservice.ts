import api from "./api";

export interface CreateTaskPayload {
  title: string;
  assigned_to: number;
  due_date: string;
}

export const createTask = async (payload: CreateTaskPayload) => {
  const response = await api.post("/tasks", payload);

  return response.data;
};
export const getAllTasks = async () => {
  const response = await api.get("/tasks");
  return response.data;
};
export const deleteTask = async (taskId: number) => {
  const response = await api.delete(`/tasks/${taskId}`);
  return response.data;
};
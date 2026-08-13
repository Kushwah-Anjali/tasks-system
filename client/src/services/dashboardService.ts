import api from "./api";

export interface DashboardStats {
  totalEmployees: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get<DashboardStats>("/dashboard/stats");

  return response.data;
};
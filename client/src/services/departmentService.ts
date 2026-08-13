import api from "./api";

export interface Department {
  id: number;
  name: string;
}

interface DepartmentsResponse {
  data: Department[];
}

export async function getDepartments(): Promise<Department[]> {
  const response = await api.get<DepartmentsResponse>("/departments");
  return response.data.data;
}
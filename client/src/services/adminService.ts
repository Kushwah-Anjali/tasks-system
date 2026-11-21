import api from "./api";

export type ManagedRole = "manager" | "employee";

export interface ManagedAccount {
  id: number;
  full_name: string;
  email: string;
  role: ManagedRole;
  is_active: number | boolean;
}

export interface CreateManagerInput {
  role: "manager";
  full_name: string;
  email: string;
  password: string;
}

export interface CreateEmployeeInput {
  role: "employee";
  full_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  date_of_birth: string;
  department_id: number;
  designation: string;
  joining_date: string;
}

export interface ResetManagedAccountPasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export const getManagedAccounts = async (): Promise<ManagedAccount[]> => {
  const response = await api.get<{ accounts: ManagedAccount[] }>("/admin/accounts");
  return response.data.accounts;
};

export const createManagedAccount = async (input: CreateManagerInput | CreateEmployeeInput) => {
  const response = await api.post<{ message: string }>("/admin/accounts", input);
  return response.data;
};

export const setManagedAccountActive = async (userId: number, isActive: boolean) => {
  const response = await api.patch<{ message: string }>(`/admin/accounts/${userId}/status`, { isActive });
  return response.data;
};

export const resetManagedAccountPassword = async (
  userId: number,
  input: ResetManagedAccountPasswordInput
) => {
  const response = await api.post<{ message: string }>(`/admin/accounts/${userId}/password`, input);
  return response.data;
};

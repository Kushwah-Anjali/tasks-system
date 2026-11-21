import api from "./api";

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export const changePassword = async (input: ChangePasswordInput): Promise<string> => {
  const response = await api.post<{ message: string }>("/auth/change-password", input);
  return response.data.message;
};

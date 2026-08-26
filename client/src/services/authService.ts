import api from "./api";

export const login = async (email: string, password: string) => {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};
export const logout = async () => {
  const response = await api.post("/auth/logout");

  return response.data;
};
export const register = async (payload: {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  date_of_birth: string;
  department_id: number;
  designation: string;
  joining_date: string;
}) => {
  const response = await api.post("/auth/register", payload);
  return response.data;
};
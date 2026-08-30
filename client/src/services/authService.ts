import api from "./api";

import type {
    AuthUser,
    LoginResponse,
} from "../types/auth";

export interface RegisterPayload {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    date_of_birth: string;
    department_id: number;
    designation: string;
    joining_date: string;
}

interface RegisterResponse {
    message: string;
    registrationNumber: string;
}

export const login = async (
    email: string,
    password: string
): Promise<LoginResponse> => {
    const response =
        await api.post<LoginResponse>(
            "/auth/login",
            {
                email,
                password,
            }
        );

    return response.data;
};

export const register = async (
    payload: RegisterPayload
): Promise<RegisterResponse> => {
    const response =
        await api.post<RegisterResponse>(
            "/auth/register",
            payload
        );

    return response.data;
};

export const logout = async (): Promise<void> => {
    await api.post("/auth/logout");
};

export type { AuthUser };
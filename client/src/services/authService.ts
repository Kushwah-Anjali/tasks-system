import api from "./api";

import type {
    AuthUser,
    LoginResponse,
} from "../types/auth";

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

export const logout = async (): Promise<void> => {
    await api.post("/auth/logout");
};

export type { AuthUser };

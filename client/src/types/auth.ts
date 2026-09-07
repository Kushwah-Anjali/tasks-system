export type UserRole =
    | "manager"
    | "employee";

export interface AuthUser {
    id: number;
    full_name: string;
    email: string;
    role: UserRole;
    can_manage_attendance: boolean;
}

export interface LoginResponse {
    message: string;
    user: AuthUser;
}

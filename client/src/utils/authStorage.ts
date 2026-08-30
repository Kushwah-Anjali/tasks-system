import type { AuthUser } from "../types/auth";

const USER_STORAGE_KEY = "user";

export const saveCurrentUser = (
    user: AuthUser
): void => {
    localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(user)
    );
};

export const getCurrentUser =
    (): AuthUser | null => {
        const storedUser = localStorage.getItem(
            USER_STORAGE_KEY
        );

        if (!storedUser) return null;

        try {
            return JSON.parse(
                storedUser
            ) as AuthUser;
        } catch {
            localStorage.removeItem(
                USER_STORAGE_KEY
            );

            return null;
        }
    };

export const clearCurrentUser = (): void => {
    localStorage.removeItem(USER_STORAGE_KEY);
};

export const getInitials = (
    name: string
): string => {
    return name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
};
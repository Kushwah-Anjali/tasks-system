import type { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import type { UserRole } from "../../types/auth";

import { getCurrentUser } from "../../utils/authStorage";

interface ProtectedRouteProps {
    allowedRole: UserRole;
    children: ReactNode;
}

export default function ProtectedRoute({
    allowedRole,
    children,
}: ProtectedRouteProps) {
    const user = getCurrentUser();

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    if (user.role !== allowedRole) {
        const destination =
            user.role === "manager"
                ? "/dashboard"
                : "/employee-dashboard";

        return (
            <Navigate
                to={destination}
                replace
            />
        );
    }

    return children;
}
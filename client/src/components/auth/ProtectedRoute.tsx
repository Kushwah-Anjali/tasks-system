import type { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import type { UserRole } from "../../types/auth";

import { getCurrentUser } from "../../utils/authStorage";

interface ProtectedRouteProps {
    allowedRole?: UserRole;
    requireAttendanceView?: boolean;
    children: ReactNode;
}

export default function ProtectedRoute({
    allowedRole,
    requireAttendanceView = false,
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

    const destination =
        user.role === "manager"
            ? "/dashboard"
            : "/employee-dashboard";

    if (
        allowedRole &&
        user.role !== allowedRole
    ) {
        return (
            <Navigate
                to={destination}
                replace
            />
        );
    }

    if (
        requireAttendanceView &&
        user.role !== "manager" &&
        user.can_manage_attendance !== true
    ) {
        return (
            <Navigate
                to={destination}
                replace
            />
        );
    }

    return children;
}

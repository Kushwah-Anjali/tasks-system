import { Link } from "react-router-dom";

import EmployeeWelcomeCard from "../components/dashboard/EmployeeWelcomeCard";
import EmployeeDashboardLayout from "../components/layout/EmployeeDashboardLayout";
import {
    getCurrentUser,
    getInitials,
} from "../utils/authStorage";

export default function EmployeeDashboard() {
    const user = getCurrentUser();

    if (!user) return null;

    const firstName =
        user.full_name
            .trim()
            .split(/\s+/)[0] || "Employee";

    return (
        <EmployeeDashboardLayout
            employeeId={user.id}
            employeeName={user.full_name}
            employeeInitials={getInitials(
                user.full_name
            )}
        >
            <EmployeeWelcomeCard
                name={firstName}
            />

            <div className="rounded-2xl border border-blue-200 border-l-4 border-l-blue-500 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <h2 className="text-xl font-semibold text-[#0F172A]">
                    My Tasks
                </h2>
                <p className="mt-1 text-sm text-[#64748B]">
                    Review new assignments, respond to forwarding requests, and submit finished work.
                </p>
                <Link
                    to="/employee-tasks"
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]"
                >
                    View My Tasks
                </Link>
            </div>
        </EmployeeDashboardLayout>
    );
}

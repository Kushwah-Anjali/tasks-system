import { ClipboardList } from "lucide-react";

import StatsCard from "../components/dashboard/StatsCard";
import WelcomeCard from "../components/dashboard/WelcomeCard";
import EmployeeDashboardLayout from "../components/layout/EmployeeDashboardLayout";
import {
    getCurrentUser,
    getInitials,
} from "../utils/authStorage";

export default function EmployeeDashboard() {
    const user = getCurrentUser();

    if (!user) return null;

    return (
        <EmployeeDashboardLayout
            employeeId={user.id}
            employeeName={user.full_name}
            employeeInitials={getInitials(
                user.full_name
            )}
        >
            <WelcomeCard name={user.full_name} />

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                <div className="col-span-2 md:col-span-1">
                    <StatsCard
                        label="My Tasks"
                        icon={<ClipboardList className="h-4 w-4" />}
                        tone="blue"
                        action={{ label: "View My Tasks", to: "/employee-tasks" }}
                    />
                </div>
            </div>
        </EmployeeDashboardLayout>
    );
}

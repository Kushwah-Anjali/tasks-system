import {
    CalendarCheck2,
    CalendarPlus,
    ClipboardList,
    FileClock,
    FilePlus2,
    UserPlus,
    Users,
    Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

import DashboardLayout from "../components/layout/DashboardLayout";
import QuickActions, {
    type QuickAction,
} from "../components/dashboard/QuickActions";
import RecentAttendance from "../components/dashboard/RecentAttendance";
import StatisticsSection from "../components/dashboard/StatisticsSection";
import type { StatCard } from "../components/dashboard/StatsCard";
import WelcomeCard from "../components/dashboard/WelcomeCard";
import {
    getDashboardStats,
    getRecentAttendance,
    type DashboardStats,
    type RecentAttendanceRecord,
} from "../services/dashboardService";
import { getCurrentUser } from "../utils/authStorage";

const initialStats: DashboardStats = {
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    openTasks: 0,
};

const quickActions: QuickAction[] = [
    { label: "Add Employee", icon: <UserPlus className="h-5 w-5" /> },
    { label: "Mark Attendance", icon: <CalendarPlus className="h-5 w-5" /> },
    { label: "Create Task", icon: <FilePlus2 className="h-5 w-5" /> },
    { label: "Run Payroll", icon: <Wallet className="h-5 w-5" /> },
];

export default function ManagerDashboard() {
    const user = getCurrentUser();
    const [stats, setStats] = useState<DashboardStats>(initialStats);
    const [recentAttendance, setRecentAttendance] = useState<
        RecentAttendanceRecord[]
    >([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const [dashboardStats, attendance] = await Promise.all([
                    getDashboardStats(),
                    getRecentAttendance(),
                ]);

                setStats(dashboardStats);
                setRecentAttendance(attendance);
            } catch {
                setErrorMessage("Unable to load dashboard data.");
            } finally {
                setIsLoading(false);
            }
        };

        void loadDashboard();
    }, []);

    if (!user) return null;

    const value = (count: number) => (isLoading ? "—" : String(count));

    const statCards: StatCard[] = [
        {
            label: "Total Employees",
            value: value(stats.totalEmployees),
            delta: "Active employees",
            trend: "up",
            icon: <Users className="h-5 w-5" />,
        },
        {
            label: "Present Today",
            value: value(stats.presentToday),
            delta: "Includes late check-ins",
            trend: "up",
            icon: <CalendarCheck2 className="h-5 w-5" />,
        },
        {
            label: "On Leave",
            value: value(stats.onLeave),
            delta: "Leave API not connected",
            trend: "up",
            icon: <FileClock className="h-5 w-5" />,
        },
        {
            label: "Open Tasks",
            value: value(stats.openTasks),
            delta: "Not completed",
            trend: "up",
            icon: <ClipboardList className="h-5 w-5" />,
        },
    ];

    return (
        <DashboardLayout user={user}>
            <WelcomeCard name={user.full_name} />

            {errorMessage ? (
                <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {errorMessage}
                </div>
            ) : null}

            <div className="mt-6">
                <StatisticsSection stats={statCards} />
            </div>

            <div className="mt-6">
                <RecentAttendance
                    rows={recentAttendance}
                    isLoading={isLoading}
                />
            </div>

            <div className="mt-6">
                <QuickActions actions={quickActions} />
            </div>
        </DashboardLayout>
    );
}

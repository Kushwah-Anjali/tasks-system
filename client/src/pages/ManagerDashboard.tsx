import {
    CalendarCheck2,
    ClipboardList,
    UserX,
    Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import DashboardLayout from "../components/layout/DashboardLayout";
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
    absentToday: 0,
    openTasks: 0,
};

export default function ManagerDashboard() {
    const user = getCurrentUser();

    const [stats, setStats] =
        useState<DashboardStats>(initialStats);

    const [recentAttendance, setRecentAttendance] =
        useState<RecentAttendanceRecord[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const [dashboardStats, attendance] =
                    await Promise.all([
                        getDashboardStats(),
                        getRecentAttendance(),
                    ]);

                setStats(dashboardStats);
                setRecentAttendance(attendance);
            } catch {
                setErrorMessage(
                    "Unable to load dashboard data."
                );
            } finally {
                setIsLoading(false);
            }
        };

        void loadDashboard();
    }, []);

    if (!user) return null;

    const value = (count: number) =>
        isLoading ? "—" : String(count);

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
            delta: "Marked present today",
            trend: "up",
            icon: <CalendarCheck2 className="h-5 w-5" />,
        },
        {
            label: "Absent Today",
            value: value(stats.absentToday),
            delta: "Marked absent today",
            trend: "down",
            icon: <UserX className="h-5 w-5" />,
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
                <StatisticsSection
                    stats={statCards}
                />
            </div>

            <div className="mt-6">
                <RecentAttendance
                    rows={recentAttendance}
                    isLoading={isLoading}
                />
            </div>
        </DashboardLayout>
    );
}

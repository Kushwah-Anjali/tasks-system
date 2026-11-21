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
        isLoading ? "\u2014" : String(count);

    const statCards: StatCard[] = [
        {
            label: "Total Employees",
            tone: "blue",
            value: value(stats.totalEmployees),
            icon: <Users className="h-4 w-4" />,
        },
        {
            label: "Present Today",
            tone: "green",
            value: value(stats.presentToday),
            icon: <CalendarCheck2 className="h-4 w-4" />,
        },
        {
            label: "Absent Today",
            tone: "red",
            value: value(stats.absentToday),
            icon: <UserX className="h-4 w-4" />,
        },
        {
            label: "Open Tasks",
            tone: "amber",
            value: value(stats.openTasks),
            icon: <ClipboardList className="h-4 w-4" />,
        },
    ];

    return (
        <DashboardLayout user={user}>
            <WelcomeCard name={user.full_name} />

            {errorMessage ? (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                </div>
            ) : null}

            <div className="mt-4">
                <StatisticsSection
                    stats={statCards}
                />
            </div>

            <div className="mt-4">
                <RecentAttendance
                    rows={recentAttendance}
                    isLoading={isLoading}
                />
            </div>
        </DashboardLayout>
    );
}

import {
  Users,
  CalendarCheck2,
  FileClock,
  ClipboardList,
  UserPlus,
  CalendarPlus,
  FilePlus2,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

import DashboardLayout from "../components/layout/DashboardLayout";
import WelcomeCard from "../components/dashboard/WelcomeCard";
import StatisticsSection from "../components/dashboard/StatisticsSection";
import RecentAttendance, {
  type AttendanceRow,
} from "../components/dashboard/RecentAttendance";
import QuickActions, {
  type QuickAction,
} from "../components/dashboard/QuickActions";
import type { StatCard } from "../components/dashboard/StatsCard";

import { getDashboardStats } from "../services/dashboardService";

const attendanceRows: AttendanceRow[] = [
  {
    name: "Amelia Carter",
    role: "Product Designer",
    checkIn: "09:02 AM",
    checkOut: "06:10 PM",
    status: "Present",
  },
  {
    name: "Rohan Mehta",
    role: "Backend Engineer",
    checkIn: "09:24 AM",
    checkOut: "06:05 PM",
    status: "Late",
  },
  {
    name: "Sofia Reyes",
    role: "HR Manager",
    checkIn: "08:55 AM",
    checkOut: "05:58 PM",
    status: "Present",
  },
  {
    name: "Daniel Kim",
    role: "QA Engineer",
    checkIn: "—",
    checkOut: "—",
    status: "Absent",
  },
  {
    name: "Priya Nair",
    role: "Marketing Lead",
    checkIn: "09:01 AM",
    checkOut: "06:20 PM",
    status: "Present",
  },
];

const quickActions: QuickAction[] = [
  {
    label: "Add Employee",
    icon: <UserPlus className="h-5 w-5" />,
  },
  {
    label: "Mark Attendance",
    icon: <CalendarPlus className="h-5 w-5" />,
  },
  {
    label: "Create Task",
    icon: <FilePlus2 className="h-5 w-5" />,
  },
  {
    label: "Run Payroll",
    icon: <Wallet className="h-5 w-5" />,
  },
];

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [totalEmployees, setTotalEmployees] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        const stats = await getDashboardStats();

        setTotalEmployees(stats.totalEmployees);
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadDashboardStats();
  }, []);

  const statCards: StatCard[] = [
    {
      label: "Total Employees",
      value: isLoadingStats ? "—" : String(totalEmployees),
      delta: "",
      trend: "up",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Present Today",
      value: "221",
      delta: "89% attendance",
      trend: "up",
      icon: <CalendarCheck2 className="h-5 w-5" />,
    },
    {
      label: "On Leave",
      value: "14",
      delta: "-3 vs last week",
      trend: "down",
      icon: <FileClock className="h-5 w-5" />,
    },
    {
      label: "Open Tasks",
      value: "37",
      delta: "+5 this week",
      trend: "up",
      icon: <ClipboardList className="h-5 w-5" />,
    },
  ];

  return (
    <DashboardLayout user={user}>
      <WelcomeCard name={user.full_name} />

      <div className="mt-6">
        <StatisticsSection stats={statCards} />
      </div>

      <div className="mt-6">
        <RecentAttendance rows={attendanceRows} />
      </div>

      <div className="mt-6">
        <QuickActions actions={quickActions} />
      </div>
    </DashboardLayout>
  );
}
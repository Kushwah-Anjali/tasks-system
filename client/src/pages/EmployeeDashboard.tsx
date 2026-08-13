import EmployeeDashboardLayout from "../components/layout/Employeedashboardlayout";
import EmployeeWelcomeCard from "../components/dashboard/EmployeeWelcomeCard";
import TodayAttendanceCard from "../components/dashboard/TodayAttendanceCard";
import AttendanceSummaryCard from "../components/dashboard/AttendanceSummaryCard";
import WeeklyAttendanceChart, {
  type WeeklyAttendanceDay,
} from "../components/dashboard/WeeklyAttendanceChart";
import MonthlyAttendanceVisual from "../components/dashboard/MonthlyAttendanceVisual";
import AttendanceCalendar from "../components/dashboard/AttendanceCalendar";
import type { AttendanceDayStatus } from "../components/employees/AttendenceStatus";
import { useEffect, useState } from "react";
import {
  getTodayAttendance,
  getWeeklyAttendance,
  getMonthlySummary,
  getMonthlyAttendance,
  checkIn,
  checkOut,
  type TodayAttendance,
  type MonthlyAttendanceSummary,
  type MonthlyAttendance,
} from "../services/attendanceService";

import { useLocation } from "react-router-dom";
export default function EmployeeDashboard() {
  const location = useLocation();
  const user = location.state?.user;
  const [todayAttendance, setTodayAttendance] =
    useState<TodayAttendance | null>(null);
  const [weeklyAttendance, setWeeklyAttendance] = useState<TodayAttendance[]>(
    [],
  );
  const [monthSummary, setMonthSummary] = useState<MonthlyAttendanceSummary>({
    present: 0,
    late: 0,
    absent: 0,
    attendancePercentage: 0,
  });
  const [monthlyAttendance, setMonthlyAttendance] = useState<
    MonthlyAttendance[]
  >([]);
  const calendarAttendance: Record<number, AttendanceDayStatus> = {};

  monthlyAttendance.forEach((day) => {
    const date = Number(day.attendance_date.split("-")[2]);

    if (day.status === "late") {
      calendarAttendance[date] = "Late";
    } else if (day.status === "present") {
      calendarAttendance[date] = "Present";
    } else if (day.status === "absent") {
      calendarAttendance[date] = "Absent";
    }
  });
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const [today, weekly, monthly, calendar] = await Promise.all([
          getTodayAttendance(),
          getWeeklyAttendance(),
          getMonthlySummary(),
          getMonthlyAttendance(2026, 8),
        ]);

        setTodayAttendance(today);
        setWeeklyAttendance(weekly);
        setMonthSummary(monthly);
        setMonthlyAttendance(calendar);
      } catch (error) {
        console.error("Failed to load attendance:", error);
      } finally {
        setIsLoadingAttendance(false);
      }
    };

    loadAttendance();
  }, []);

  const getDisplayStatus = ():
    | "Present"
    | "Late"
    | "Absent"
    | "Not Checked In" => {
    if (!todayAttendance) {
      return "Not Checked In";
    }

    switch (todayAttendance.status) {
      case "present":
        return "Present";

      case "late":
        return "Late";

      case "absent":
        return "Absent";

      default:
        return "Not Checked In";
    }
  };
  const formatTime = (value: string | null) => {
    if (!value) return "";

    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = () => {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };
  const handleCheckIn = async () => {
    try {
      await checkIn();

      const attendance = await getTodayAttendance();

      setTodayAttendance(attendance);
    } catch (error) {
      console.error("Check-in failed:", error);
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut();

      const attendance = await getTodayAttendance();

      setTodayAttendance(attendance);
    } catch (error) {
      console.error("Check-out failed:", error);
    }
  };
  const calculateHours = (
    checkIn: string | null,
    checkOut: string | null,
  ): number => {
    if (!checkIn || !checkOut) return 0;

    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();

    return Number(((end - start) / (1000 * 60 * 60)).toFixed(1));
  };
  const weeklyChartData: WeeklyAttendanceDay[] = weeklyAttendance.map(
    (day) => ({
      label: new Date(day.attendance_date).toLocaleDateString("en-US", {
        weekday: "short",
      }),
      date: new Date(day.attendance_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      status:
        day.status === "late"
          ? "Late"
          : day.status === "present"
            ? "Present"
            : "Absent",
      checkIn: day.check_in ? formatTime(day.check_in) : "—",
      hours: calculateHours(day.check_in, day.check_out),
    }),
  );

  const fullName = user.full_name;
  const firstName = fullName.split(" ")[0];

  const initials = fullName
    .split(" ")
    .map((name: string) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <EmployeeDashboardLayout
      employeeName={fullName}
      employeeInitials={initials}
    >
      <EmployeeWelcomeCard name={firstName} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <TodayAttendanceCard
          date={formatDate()}
          checkIn={
            isLoadingAttendance
              ? "Loading..."
              : formatTime(todayAttendance?.check_in ?? null) || "—"
          }
          checkOut={formatTime(todayAttendance?.check_out ?? null)}
          status={getDisplayStatus()}
          canCheckIn={!isLoadingAttendance && !todayAttendance?.check_in}
          canCheckOut={
            !isLoadingAttendance &&
            !!todayAttendance?.check_in &&
            !todayAttendance?.check_out
          }
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
        />
        <AttendanceSummaryCard
          present={monthSummary.present}
          late={monthSummary.late}
          absent={monthSummary.absent}
          attendancePercentage={monthSummary.attendancePercentage}
        />
      </div>

      <div className="mt-5">
        <WeeklyAttendanceChart days={weeklyChartData} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <MonthlyAttendanceVisual
          present={monthSummary.present}
          late={monthSummary.late}
          absent={monthSummary.absent}
        />
        <AttendanceCalendar
          year={2026}
          month={7}
          monthLabel="August 2026"
          attendanceByDate={calendarAttendance}
          today={10}
        />
      </div>
    </EmployeeDashboardLayout>
  );
}

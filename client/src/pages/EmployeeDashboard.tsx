import {
    useEffect,
    useState,
} from "react";

import EmployeeDashboardLayout from "../components/layout/EmployeeDashboardLayout";

import EmployeeWelcomeCard from "../components/dashboard/EmployeeWelcomeCard";
import TodayAttendanceCard from "../components/dashboard/TodayAttendanceCard";
import AttendanceSummaryCard from "../components/dashboard/AttendanceSummaryCard";

import {
    checkIn,
    checkOut,
    getMonthlySummary,
    getTodayAttendance,
} from "../services/attendanceService";

import type {
    AttendanceRecord,
    MonthlyAttendanceSummary,
} from "../types/attendance";
import {
    getCurrentUser,
    getInitials,
} from "../utils/authStorage";

const emptyMonthlySummary: MonthlyAttendanceSummary =
    {
        present: 0,
        late: 0,
        absent: 0,
        attendancePercentage: 0,
    };

const formatTime = (
    value: string | null | undefined
): string => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatTodayDate = (): string => {
    return new Date().toLocaleDateString(
        "en-IN",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
        }
    );
};

const getAttendanceStatus = (
    attendance: AttendanceRecord | null
):
    | "Present"
    | "Late"
    | "Absent"
    | "Not Checked In" => {
    switch (
        attendance?.status) {
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

export default function EmployeeDashboard() {
    const user = getCurrentUser();

    const [
        todayAttendance,
        setTodayAttendance,
    ] = useState<AttendanceRecord | null>(
        null
    );

    const [
        monthlySummary,
        setMonthlySummary,
    ] =
        useState<MonthlyAttendanceSummary>(
            emptyMonthlySummary
        );

    const [isLoading, setIsLoading] =
        useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [isUpdating, setIsUpdating] =
        useState(false);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const [today, summary] =
                    await Promise.all([
                        getTodayAttendance(),
                        getMonthlySummary(),
                    ]);

                setTodayAttendance(today);
                setMonthlySummary(summary);
            } catch {
                setErrorMessage(
                    "Unable to load attendance information."
                );
            } finally {
                setIsLoading(false);
            }
        };

        void loadDashboard();
    }, []);

    const refreshTodayAttendance =
        async () => {
            const attendance =
                await getTodayAttendance();

            setTodayAttendance(attendance);
        };

    const handleCheckIn = async () => {
        try {
            setIsUpdating(true);
            setErrorMessage("");

            await checkIn();
            await refreshTodayAttendance();
        } catch {
            setErrorMessage(
                "Check-in failed. Please try again."
            );
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCheckOut = async () => {
        try {
            setIsUpdating(true);
            setErrorMessage("");

            await checkOut();
            await refreshTodayAttendance();
        } catch {
            setErrorMessage(
                "Check-out failed. Please try again."
            );
        } finally {
            setIsUpdating(false);
        }
    };

    if (!user) return null;

    const firstName =
        user.full_name
            .trim()
            .split(/\s+/)[0] || "Employee";

    return (
        <EmployeeDashboardLayout
            employeeName={user.full_name}
            employeeInitials={getInitials(
                user.full_name
            )}
        >
            <EmployeeWelcomeCard
                name={firstName}
            />

            {errorMessage ? (
                <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {errorMessage}
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <TodayAttendanceCard
                    date={formatTodayDate()}
                    checkIn={
                        isLoading
                            ? "Loading..."
                            : formatTime(
                                  todayAttendance?.check_in
                              )
                    }
                    checkOut={formatTime(
                        todayAttendance?.check_out
                    )}
                    status={getAttendanceStatus(
                        todayAttendance
                    )}
                    canCheckIn={
                        !isLoading &&
                        !isUpdating &&
                        !todayAttendance?.check_in
                    }
                    canCheckOut={
                        !isLoading &&
                        !isUpdating &&
                        Boolean(
                            todayAttendance?.check_in
                        ) &&
                        !todayAttendance?.check_out
                    }
                    onCheckIn={
                        handleCheckIn
                    }
                    onCheckOut={
                        handleCheckOut
                    }
                />

                <AttendanceSummaryCard
                    present={
                        monthlySummary.present
                    }
                    late={
                        monthlySummary.late
                    }
                    absent={
                        monthlySummary.absent
                    }
                    attendancePercentage={
                        monthlySummary.attendancePercentage
                    }
                />
            </div>
        </EmployeeDashboardLayout>
    );
}
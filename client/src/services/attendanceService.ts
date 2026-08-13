import api from "./api";

export interface TodayAttendance {
  id: number;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
}
export interface MonthlyAttendanceSummary {
  present: number;
  late: number;
  absent: number;
  attendancePercentage: number;
}

export interface MonthlyAttendance {
  id: number;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
}

export const getTodayAttendance = async (): Promise<TodayAttendance | null> => {
  const response = await api.get("/attendance/today");

  return response.data.attendance;
};
export const getWeeklyAttendance = async (): Promise<TodayAttendance[]> => {
  const response = await api.get("/attendance/weekly");

  return response.data.attendance;
};
export const checkIn = async () => {
  const response = await api.post("/attendance/check-in");

  return response.data;
};

export const checkOut = async () => {
  const response = await api.post("/attendance/check-out");

  return response.data;
};
export const getMonthlySummary =
  async (): Promise<MonthlyAttendanceSummary> => {
    const response = await api.get("/attendance/monthly-summary");

    return response.data.summary;
  };
  export const getMonthlyAttendance = async (
  year: number,
  month: number
): Promise<MonthlyAttendance[]> => {
  const response = await api.get("/attendance/monthly", {
    params: {
      year,
      month,
    },
  });

  return response.data.attendance;
};
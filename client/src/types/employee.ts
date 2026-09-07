export type EmployeeStatus =
    | "Active"
    | "Inactive"
    | "On Leave";

export interface Employee {
    id: number;
    employeeId: number;
    fullName: string;
    email: string;
    registrationNumber: string;
    department: string | null;
    designation: string | null;
    joiningDate: string | null;
    status: EmployeeStatus;
    canManageAttendance: boolean;
}

export interface EmployeeApiResponse {
    id: number;
    employee_id: number;
    registration_number: string;
    date_of_birth: string | null;
    designation: string | null;
    joining_date: string | null;
    full_name: string;
    email: string;
    phone: string | null;
    account_status: string;
    is_active: number;
    can_manage_attendance: number | boolean;
    department_id: number | null;
    department: string | null;
}

export type EmployeeStatus =
    | "Active"
    | "Inactive"
    | "On Leave";

export interface Employee {
    /** users.id, used for API actions. */
    id: number;
    /** employees.id, the profile ID. */
    employeeId: number;
    phone: string | null;
    dateOfBirth: string | null;
    departmentId: number | null;
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

export interface UpdateEmployeeInput {
    fullName: string;
    email: string;
    phone: string | null;
    registrationNumber: string;
    departmentId: number | null;
    designation: string | null;
    joiningDate: string | null;
    dateOfBirth: string | null;
    isActive: boolean;
}

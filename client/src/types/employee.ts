export type EmployeeStatus =
    | "Active"
    | "Inactive"
    | "On Leave";

export interface Employee {
    id: number;
    fullName: string;
    email: string;
    registrationNumber: string;
    department: string | null;
    designation: string | null;
    joiningDate: string | null;
    status: EmployeeStatus;
}

export interface EmployeeApiResponse {
    id: number;
    registration_number: string;
    date_of_birth: string | null;
    designation: string | null;
    joining_date: string | null;
    full_name: string;
    email: string;
    phone: string | null;
    account_status: string;
    is_active: number;
    department_id: number | null;
    department: string | null;
}
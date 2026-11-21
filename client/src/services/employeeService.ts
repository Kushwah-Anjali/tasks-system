import api from "./api";

import type {
    Employee,
    EmployeeApiResponse,
    EmployeeStatus,
    UpdateEmployeeInput,
} from "../types/employee";

interface GetEmployeesResponse {
    employees: EmployeeApiResponse[];
}

export interface CreateEmployeePayload {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    confirm_password: string;
    date_of_birth: string;
    department_id: number;
    designation: string;
    joining_date: string;
}

interface CreateEmployeeResponse {
    message: string;
    registrationNumber: string;
}

export const createEmployee = async (payload: CreateEmployeePayload) => {
    const response = await api.post<CreateEmployeeResponse>("/employees", payload);
    return response.data;
};

interface UpdateAttendancePermissionResponse {
    message: string;
}

const mapEmployee = (
    employee: EmployeeApiResponse
): Employee => {
    const status: EmployeeStatus =
        Number(employee.is_active) === 1
            ? "Active"
            : "Inactive";

    return {
        id: employee.id,
        employeeId: employee.employee_id,
        fullName: employee.full_name,
        email: employee.email,
        phone: employee.phone,
        dateOfBirth: employee.date_of_birth,
        departmentId: employee.department_id,
        registrationNumber:
            employee.registration_number,
        department: employee.department,
        designation: employee.designation,
        joiningDate: employee.joining_date,
        status,
        canManageAttendance:
            employee.can_manage_attendance === true ||
            Number(employee.can_manage_attendance) === 1,
    };
};

export const getEmployees =
    async (): Promise<Employee[]> => {
        const response =
            await api.get<GetEmployeesResponse>(
                "/employees"
            );

        return response.data.employees.map(
            mapEmployee
        );
    };

export const updateAttendancePermission = async (
    userId: number,
    canManageAttendance: boolean
): Promise<string> => {
    const response =
        await api.patch<UpdateAttendancePermissionResponse>(
            `/employees/${userId}/attendance-permission`,
            { canManageAttendance }
        );

    return response.data.message;
};

export const updateEmployee = async (userId: number, data: UpdateEmployeeInput): Promise<Employee> => {
    const response = await api.patch<{ employee: EmployeeApiResponse }>(`/employees/${userId}`, data);
    return mapEmployee(response.data.employee);
};
export const deactivateEmployee = async (userId: number): Promise<Employee> => {
    const response = await api.patch<{ employee: EmployeeApiResponse }>(`/employees/${userId}/deactivate`);
    return mapEmployee(response.data.employee);
};

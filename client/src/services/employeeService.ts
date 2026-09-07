import api from "./api";

import type {
    Employee,
    EmployeeApiResponse,
    EmployeeStatus,
} from "../types/employee";

interface GetEmployeesResponse {
    employees: EmployeeApiResponse[];
}

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

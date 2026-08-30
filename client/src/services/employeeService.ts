import api from "./api";

import type {
    Employee,
    EmployeeApiResponse,
    EmployeeStatus,
} from "loye../types/empe";

interface GetEmployeesResponse {
    employees: EmployeeApiResponse[];
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
        fullName: employee.full_name,
        email: employee.email,

        registrationNumber:
            employee.registration_number,

        department: employee.department,
        designation: employee.designation,
        joiningDate: employee.joining_date,
        status,
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
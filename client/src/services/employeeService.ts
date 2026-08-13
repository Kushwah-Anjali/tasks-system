import api from "./api";
import type { Employee, EmployeeStatus } from "../components/employees/types";
interface EmployeeApiResponse {
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

interface GetEmployeesResponse {
  employees: EmployeeApiResponse[];
}

const mapEmployee = (employee: EmployeeApiResponse): Employee => {
  const status: EmployeeStatus = employee.is_active
    ? "Active"
    : "Inactive";

  return {
    id: employee.id,
    fullName: employee.full_name,
    email: employee.email,
    registrationNumber: employee.registration_number,
    department: employee.department,
    designation: employee.designation,
    joiningDate: employee.joining_date,
    status,
  };
};

export const getEmployees = async (): Promise<Employee[]> => {
  const response = await api.get<GetEmployeesResponse>("/employees");

  return response.data.employees.map(mapEmployee);
};
import {
    useEffect,
    useMemo,
    useState,
} from "react";

import DashboardLayout from "../components/layout/DashboardLayout";
import EmployeeFilters from "../components/employees/EmployeeFilters";
import EmployeeTable from "../components/employees/EmployeeTable";

import { getEmployees } from "../services/employeeService";

import type {
    Employee,
    EmployeeStatus,
} from "../types/employee";

import { getCurrentUser } from "../utils/authStorage";

export default function Employees() {
    const user = getCurrentUser();

    const [employees, setEmployees] =
        useState<Employee[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [department, setDepartment] =
        useState("");

    const [status, setStatus] = useState<
        EmployeeStatus | ""
    >("");

    useEffect(() => {
        const loadEmployees = async () => {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const employeeList =
                    await getEmployees();

                setEmployees(employeeList);
            } catch {
                setErrorMessage(
                    "Unable to load employees. Please try again."
                );
            } finally {
                setIsLoading(false);
            }
        };

        void loadEmployees();
    }, []);

    const departments = useMemo(() => {
        const availableDepartments =
            employees
                .map(
                    (employee) =>
                        employee.department
                )
                .filter(
                    (
                        employeeDepartment
                    ): employeeDepartment is string =>
                        Boolean(
                            employeeDepartment
                        )
                );

        return Array.from(
            new Set(availableDepartments)
        ).sort();
    }, [employees]);

    const filteredEmployees =
        useMemo(() => {
            const query = search
                .trim()
                .toLowerCase();

            return employees.filter(
                (employee) => {
                    const matchesSearch =
                        !query ||
                        employee.fullName
                            .toLowerCase()
                            .includes(query) ||
                        employee.email
                            .toLowerCase()
                            .includes(query) ||
                        employee.registrationNumber
                            .toLowerCase()
                            .includes(query);

                    const matchesDepartment =
                        !department ||
                        employee.department ===
                            department;

                    const matchesStatus =
                        !status ||
                        employee.status ===
                            status;

                    return (
                        matchesSearch &&
                        matchesDepartment &&
                        matchesStatus
                    );
                }
            );
        }, [
            employees,
            search,
            department,
            status,
        ]);

    const handleClearFilters = () => {
        setSearch("");
        setDepartment("");
        setStatus("");
    };

    if (!user) return null;

    return (
        <DashboardLayout user={user}>
            <div className="mb-7">
                <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                    Employees
                </h1>

                <p className="mt-1 text-sm text-[#64748B]">
                    Manage your
                    organization&apos;s
                    employees.
                </p>
            </div>

            {errorMessage ? (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {errorMessage}
                </div>
            ) : null}

            <div className="flex flex-col gap-5">
                <EmployeeFilters
                    search={search}
                    onSearchChange={setSearch}
                    department={department}
                    onDepartmentChange={
                        setDepartment
                    }
                    departments={
                        departments
                    }
                    status={status}
                    onStatusChange={
                        setStatus
                    }
                    onClearFilters={
                        handleClearFilters
                    }
                />

                <EmployeeTable
                    employees={
                        filteredEmployees
                    }
                    isLoading={isLoading}
                />
            </div>
        </DashboardLayout>
    );
}
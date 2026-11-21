import { isAxiosError } from "axios";
import { getDepartments } from "../services/departmentService";
import type { Department } from "../types/department";
import {
    useEffect,
    useRef,
    type FormEvent,
    useMemo,
    useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import EmployeeFilters from "../components/employees/EmployeeFilters";
import EmployeeTable from "../components/employees/EmployeeTable";
import AppModal from "../components/ui/AppModal";

import {
    getEmployees,
    updateEmployee,
    deactivateEmployee,
    updateAttendancePermission,
} from "../services/employeeService";

import type {
    Employee,
    EmployeeStatus,
    UpdateEmployeeInput,
} from "../types/employee";

import { getCurrentUser } from "../utils/authStorage";

type EmployeeModalMode =
    | "view"
    | "edit"
    | "deactivate"
    | null;

export default function Employees() {
    const user = getCurrentUser();
    const location = useLocation();
    const navigate = useNavigate();

    const [employees, setEmployees] =
        useState<Employee[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [errorMessage, setErrorMessage] =
        useState("");

    const [successMessage, setSuccessMessage] = useState(() => {
        const state = location.state as { successMessage?: string } | null;
        return state?.successMessage || "";
    });

    const [
        updatingPermissionUserId,
        setUpdatingPermissionUserId,
    ] = useState<number | null>(null);

    const [search, setSearch] =
        useState("");

    const [department, setDepartment] =
        useState("");

    const [status, setStatus] = useState<
        EmployeeStatus | ""
    >("");

    const [
        selectedEmployee,
        setSelectedEmployee,
    ] = useState<Employee | null>(null);

    const [
        modalMode,
        setModalMode,
    ] = useState<EmployeeModalMode>(null);

    const [form, setForm] = useState<UpdateEmployeeInput | null>(null);
    const [departmentOptions, setDepartmentOptions] = useState<Department[]>([]);
    const [departmentsError, setDepartmentsError] = useState("");
    const [modalError, setModalError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitting = useRef(false);

    useEffect(() => {
        const state = location.state as { successMessage?: string } | null;
        if (state?.successMessage) {
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.pathname, location.state, navigate]);

    useEffect(() => {
        getDepartments().then(setDepartmentOptions).catch(() => {
            setDepartmentsError("Unable to load departments. The current department will be preserved.");
        });
    }, []);

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

    const handleAttendancePermissionChange =
        async (
            employee: Employee,
            canManageAttendance: boolean
        ) => {
            try {
                setUpdatingPermissionUserId(
                    employee.id
                );

                setErrorMessage("");
                setSuccessMessage("");

                await updateAttendancePermission(
                    employee.id,
                    canManageAttendance
                );

                setEmployees(
                    (currentEmployees) =>
                        currentEmployees.map(
                            (item) =>
                                item.id ===
                                    employee.id
                                    ? {
                                        ...item,
                                        canManageAttendance,
                                    }
                                    : item
                        )
                );

                setSuccessMessage(
                    canManageAttendance
                        ? `${employee.fullName} can now manage attendance.`
                        : `Attendance management access removed from ${employee.fullName}.`
                );
            } catch {
                setErrorMessage(
                    `Unable to update attendance access for ${employee.fullName}.`
                );
            } finally {
                setUpdatingPermissionUserId(
                    null
                );
            }
        };

    const openEmployeeModal = (employee: Employee, mode: EmployeeModalMode) => {
        setSelectedEmployee(employee);
        setModalMode(mode);
        setModalError("");
        setSuccessMessage("");
        setForm({
            fullName: employee.fullName, email: employee.email, phone: employee.phone,
            registrationNumber: employee.registrationNumber, departmentId: employee.departmentId,
            designation: employee.designation, joiningDate: employee.joiningDate?.slice(0, 10) || null,
            dateOfBirth: employee.dateOfBirth?.slice(0, 10) || null, isActive: employee.status === "Active",
        });
    };
    const handleViewEmployee = (employee: Employee) => openEmployeeModal(employee, "view");
    const handleEditEmployee = (employee: Employee) => openEmployeeModal(employee, "edit");
    const handleDeactivateEmployee = (employee: Employee) => openEmployeeModal(employee, "deactivate");
    const handleCloseModal = () => {
        if (submitting.current) return;
        setModalMode(null);
        setSelectedEmployee(null);
        setForm(null);
        setModalError("");
    };
    const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        if (!selectedEmployee || !form || submitting.current) return;
        submitting.current = true;
        setIsSubmitting(true);
        setModalError("");
        try {
            const userId = selectedEmployee.id;
            if (modalMode === "edit") {
                const updated = await updateEmployee(userId, form);
                setEmployees(current => current.map(employee => employee.id === userId
                    ? { ...updated, canManageAttendance: employee.canManageAttendance } : employee));
                setSuccessMessage("Employee updated successfully.");
            } else if (modalMode === "deactivate") {
                const updated = await deactivateEmployee(userId);
                setEmployees(current => current.map(employee => employee.id === userId
                    ? { ...updated, canManageAttendance: employee.canManageAttendance }
                    : employee));
                setSuccessMessage("Employee deactivated successfully.");
            }
            setModalMode(null);
            setSelectedEmployee(null);
            setForm(null);
        } catch (error) {
            setModalError(isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message || "Unable to complete employee action. Please try again."
                : "Unable to complete employee action. Please try again.");
        } finally {
            submitting.current = false;
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <DashboardLayout user={user}>
            <div className="mb-7">
                <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                    Employees
                </h1>

                <p className="mt-1 text-sm text-[#64748B]">
                    Manage your organization&apos;s
                    employees and attendance access.
                </p>
            </div>

            {successMessage ? (
                <div className="mb-5 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-[#16A34A]">
                    {successMessage}
                </div>
            ) : null}

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
                    departments={departments}
                    status={status}
                    onStatusChange={
                        setStatus
                    }
                    onClearFilters={
                        handleClearFilters
                    }
                    onAddEmployee={() => navigate("/employees/new")}
                />

                <EmployeeTable
                    employees={
                        filteredEmployees
                    }
                    isLoading={isLoading}
                    updatingPermissionUserId={
                        updatingPermissionUserId
                    }
                    onAttendancePermissionChange={
                        handleAttendancePermissionChange
                    }
                    onViewEmployee={
                        handleViewEmployee
                    }
                    onEditEmployee={
                        handleEditEmployee
                    }
                    onDeactivateEmployee={
                        handleDeactivateEmployee
                    }
                />
            </div>

            <AppModal
                open={
                    Boolean(modalMode) &&
                    Boolean(selectedEmployee)
                }
                onClose={handleCloseModal}
                title={
                    modalMode === "view"
                        ? "Employee Details"
                        : modalMode === "edit"
                            ? "Edit Employee"
                            : "Deactivate Employee"
                }
                description={
                    selectedEmployee
                        ? selectedEmployee.fullName
                        : undefined
                }
                size={
                    modalMode === "edit"
                        ? "lg"
                        : "md"
                }
            >
                {modalError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{modalError}</p>}
                {modalMode === "view" && selectedEmployee && (
                    <dl className="grid gap-5 sm:grid-cols-2">
                        {[
                            ["Full Name", selectedEmployee.fullName], ["Email", selectedEmployee.email],
                            ["Phone", selectedEmployee.phone], ["Registration Number", selectedEmployee.registrationNumber],
                            ["Department", selectedEmployee.department], ["Designation", selectedEmployee.designation],
                            ["Joining Date", selectedEmployee.joiningDate], ["Date of Birth", selectedEmployee.dateOfBirth],
                            ["Status", selectedEmployee.status],
                            ["Attendance Access", (employees.find(item => item.id === selectedEmployee.id) || selectedEmployee).canManageAttendance ? "Granted" : "Not granted"],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-xl border border-[#E2E8F0] bg-slate-50 p-4">
                                <dt className="text-xs font-medium text-[#64748B]">{label}</dt>
                                <dd className="mt-1 break-words text-sm font-medium text-[#0F172A]">{value || "?"}</dd>
                            </div>
                        ))}
                    </dl>
                )}
                {modalMode === "edit" && form && (
                    <form onSubmit={handleSubmit}>
                        <fieldset disabled={isSubmitting} className="grid gap-4 sm:grid-cols-2">
                            {([
                                ["fullName", "Full Name", "text", true], ["email", "Email", "email", true],
                                ["phone", "Phone", "tel", false], ["registrationNumber", "Registration Number", "text", true],
                                ["designation", "Designation", "text", false], ["joiningDate", "Joining Date", "date", false],
                                ["dateOfBirth", "Date of Birth", "date", false],
                            ] as const).map(([key, label, type, required]) => (
                                <label key={key} className="text-sm font-medium text-[#334155]">
                                    {label}
                                    <input type={type} required={required} value={form[key] || ""}
                                        onChange={event => setForm({ ...form, [key]: event.target.value })}
                                        className="mt-1 block w-full rounded-lg border border-[#CBD5E1] px-3 py-2" />
                                </label>
                            ))}
                            <label className="text-sm font-medium text-[#334155]">
                                Department
                                <select value={form.departmentId ?? ""} disabled={Boolean(departmentsError)}
                                    onChange={event => setForm({ ...form, departmentId: event.target.value ? Number(event.target.value) : null })}
                                    className="mt-1 block w-full rounded-lg border border-[#CBD5E1] px-3 py-2">
                                    <option value="">No department</option>
                                    {form.departmentId !== null && !departmentOptions.some(item => item.id === form.departmentId) && (
                                        <option value={form.departmentId}>{selectedEmployee?.department || "Current department"}</option>
                                    )}
                                    {departmentOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                </select>
                            </label>
                            <label className="text-sm font-medium text-[#334155]">
                                Status
                                <select value={form.isActive ? "active" : "inactive"}
                                    onChange={event => setForm({ ...form, isActive: event.target.value === "active" })}
                                    className="mt-1 block w-full rounded-lg border border-[#CBD5E1] px-3 py-2">
                                    <option value="active">Active</option><option value="inactive">Inactive</option>
                                </select>
                            </label>
                        </fieldset>
                        {departmentsError && <p role="alert" className="mt-3 text-sm text-amber-700">{departmentsError}</p>}
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" disabled={isSubmitting} onClick={handleCloseModal} className="h-10 rounded-lg border border-[#CBD5E1] px-4 text-sm font-semibold">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{isSubmitting ? "Saving..." : "Save Changes"}</button>
                        </div>
                    </form>
                )}
                {modalMode === "deactivate" && selectedEmployee && (
                    <div className="space-y-4">
                        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            Deactivate this employee? They will lose access, but their records and task history will be kept.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button type="button" disabled={isSubmitting} onClick={handleCloseModal} className="h-10 rounded-lg border border-[#CBD5E1] px-4 text-sm font-semibold">Cancel</button>
                            <button type="button" disabled={isSubmitting} onClick={() => void handleSubmit()} className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">{isSubmitting ? "Deactivating..." : "Deactivate Employee"}</button>
                        </div>
                    </div>
                )}
            </AppModal>
        </DashboardLayout>
    );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import RegisterForm, {
  type RegisterFormValues,
} from "../components/auth/RegisterForm";
import DashboardLayout from "../components/layout/DashboardLayout";
import { createEmployee } from "../services/employeeService";
import { getDepartments } from "../services/departmentService";
import type { Department } from "../types/department";
import { getCurrentUser } from "../utils/authStorage";

const getApiErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const responseError = error as {
      response?: { data?: { message?: string } };
    };
    return responseError.response?.data?.message || "Unable to create employee.";
  }
  return "Unable to create employee. Please try again.";
};

export default function AddEmployee() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let active = true;
    getDepartments()
      .then((items) => { if (active) setDepartments(items); })
      .catch(() => {
        if (active) setErrorMessage("Unable to load departments. Please refresh the page.");
      })
      .finally(() => { if (active) setIsLoadingDepartments(false); });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (values: RegisterFormValues) => {
    setErrorMessage(undefined);
    setIsSubmitting(true);
    try {
      await createEmployee({
        full_name: values.fullName.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        password: values.password,
        confirm_password: values.confirmPassword,
        date_of_birth: values.dateOfBirth,
        department_id: values.departmentId,
        designation: values.designation.trim(),
        joining_date: values.joiningDate,
      });
      navigate("/employees", {
        replace: true,
        state: { successMessage: "Employee created successfully." },
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout user={user}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Add Employee</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Create an active employee account and share the login details directly.
          </p>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] sm:p-7"
        >
          <RegisterForm
            departments={departments}
            isLoadingDepartments={isLoadingDepartments}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/employees")}
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
          />
        </motion.section>
      </div>
    </DashboardLayout>
  );
}

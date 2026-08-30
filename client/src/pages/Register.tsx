import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import RegisterForm, {
  type RegisterFormValues,
} from "../components/auth/RegisterForm";
import {
    getDepartments,
} from "../services/departmentService";

import type {
    Department,
} from "../types/department";import { register } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [registrationNumber, setRegistrationNumber] = useState<string>();

  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .catch(() =>
        setErrorMessage("Unable to load departments. Please refresh the page."),
      )
      .finally(() => setIsLoadingDepartments(false));
  }, []);
const getApiErrorMessage = (
    error: unknown
): string => {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
    ) {
        const responseError = error as {
            response?: {
                data?: {
                    message?: string;
                };
            };
        };

        return (
            responseError.response?.data
                ?.message ||
            "Registration failed."
        );
    }

    return "Registration failed.";
};
  const handleSubmit = async (values: RegisterFormValues) => {
    setErrorMessage(undefined);
    setIsSubmitting(true);
    try {
    const response = await register({
    full_name: values.fullName.trim(),
    email: values.email
        .trim()
        .toLowerCase(),
    phone: values.phone.trim(),
    password: values.password,
    date_of_birth:
        values.dateOfBirth || "",
    department_id: Number(
        values.departmentId
    ),
    designation:
        values.designation.trim(),
    joining_date:
        values.joiningDate || "",
});
      setRegistrationNumber(response.registrationNumber);
     } catch (error: unknown) {
    setErrorMessage(
        getApiErrorMessage(error)
    );
} finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout maxWidthClassName="max-w-md">
   
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] sm:p-7"
      >
        {registrationNumber ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2
                className="h-7 w-7 text-[#22C55E]"
                strokeWidth={2}
              />
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#0F172A]">
              Registration successful
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Your employee account has been created successfully.
            </p>
            <div className="mt-6 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
              <p className="text-xs font-medium text-[#64748B]">
                Registration number
              </p>
              <p className="mt-1 text-lg font-bold tracking-tight text-[#2563EB]">
                {registrationNumber}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-6 h-11 w-full rounded-xl bg-[#2563EB] text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
            >
              Continue to Login
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                Create your account
              </h2>
              <p className="mt-1.5 text-sm text-[#64748B]">
                Fill in your details to register as a new employee.
              </p>
            </div>

            <RegisterForm
              departments={departments}
              isLoadingDepartments={isLoadingDepartments}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              errorMessage={errorMessage}
            />

            <p className="mt-5 text-center text-sm text-[#64748B]">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-[#2563EB] transition-colors duration-150 hover:text-[#1D4ED8]"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>

      {/* ============================== */}
      {/* Footer */}
      {/* ============================== */}
      <p className="mt-6 text-center text-xs text-[#94A3B8]">
        &copy; {new Date().getFullYear()} All rights reserved.
      </p>
    </AuthLayout>
  );
}

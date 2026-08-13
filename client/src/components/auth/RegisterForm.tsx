import { useState, type FormEvent, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import PasswordInput from "./PasswordInput";
import type { Department } from "../../services/departmentService";

export interface RegisterFormValues {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  departmentId: number | null;
  designation: string;
  joiningDate: string;
}

type FormErrors = Partial<Record<keyof RegisterFormValues, string>>;

const initialValues: RegisterFormValues = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  dateOfBirth: "",
  departmentId: null,
  designation: "",
  joiningDate: "",
};

function validate(values: RegisterFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.fullName.trim()) errors.fullName = "Full name is required.";
  if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (!/^[0-9]{10}$/.test(values.phone)) errors.phone = "Enter a valid 10-digit phone number.";
  if (values.password.length < 8) errors.password = "Password must be at least 8 characters.";
  if (values.confirmPassword !== values.password) errors.confirmPassword = "Passwords do not match.";
  if (!values.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
  if (!values.departmentId) errors.departmentId = "Please select a department.";
  if (!values.designation.trim()) errors.designation = "Designation is required.";
  if (!values.joiningDate) errors.joiningDate = "Joining date is required.";

  return errors;
}

const inputClass =
  "h-12 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all duration-150 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-[#0F172A]">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-[#EF4444]">{message}</p>;
}

interface RegisterFormProps {
  departments: Department[];
  isLoadingDepartments?: boolean;
  onSubmit: (values: RegisterFormValues) => void;
  isSubmitting?: boolean;
  errorMessage?: string;
}

export default function RegisterForm({
  departments,
  isLoadingDepartments = false,
  onSubmit,
  isSubmitting = false,
  errorMessage,
}: RegisterFormProps) {
  const [values, setValues] = useState<RegisterFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (
    field: keyof RegisterFormValues
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { value } = event.target;
    setValues((prev) => ({
      ...prev,
      [field]: field === "departmentId" ? Number(value) || null : value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      onSubmit(values);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {errorMessage ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#EF4444]">
          {errorMessage}
        </div>
      ) : null}

      {/* ============================== */}
      {/* Full Name */}
      {/* ============================== */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="fullName">Full name</FieldLabel>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Jordan Ellis"
          value={values.fullName}
          onChange={handleChange("fullName")}
          className={inputClass}
        />
        <FieldError message={errors.fullName} />
      </div>

      {/* ============================== */}
      {/* Email + Phone */}
      {/* ============================== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="email">Work email</FieldLabel>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={values.email}
            onChange={handleChange("email")}
            className={inputClass}
          />
          <FieldError message={errors.email} />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="phone">Phone number</FieldLabel>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
            placeholder="9876543210"
            value={values.phone}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                phone: event.target.value.replace(/\D/g, "").slice(0, 10),
              }))
            }
            className={inputClass}
          />
          <FieldError message={errors.phone} />
        </div>
      </div>

      {/* ============================== */}
      {/* Password + Confirm Password */}
      {/* ============================== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <PasswordInput
            id="password"
            label="Password"
            value={values.password}
            onChange={(value) => setValues((prev) => ({ ...prev, password: value }))}
          />
          <FieldError message={errors.password} />
        </div>
        <div className="flex flex-col gap-1.5">
          <PasswordInput
            id="confirmPassword"
            label="Confirm password"
            value={values.confirmPassword}
            onChange={(value) => setValues((prev) => ({ ...prev, confirmPassword: value }))}
            autoComplete="new-password"
          />
          <FieldError message={errors.confirmPassword} />
        </div>
      </div>

      {/* ============================== */}
      {/* Date of Birth + Department */}
      {/* ============================== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="dateOfBirth">Date of birth</FieldLabel>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={values.dateOfBirth}
            onChange={handleChange("dateOfBirth")}
            className={inputClass}
          />
          <FieldError message={errors.dateOfBirth} />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="departmentId">Department</FieldLabel>
          <div className="relative">
            <select
              id="departmentId"
              name="departmentId"
              value={values.departmentId ?? ""}
              onChange={handleChange("departmentId")}
              disabled={isLoadingDepartments}
              className={`${inputClass} appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="" disabled>
                {isLoadingDepartments ? "Loading departments..." : "Select department"}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
              strokeWidth={2}
            />
          </div>
          <FieldError message={errors.departmentId} />
        </div>
      </div>

      {/* ============================== */}
      {/* Designation + Joining Date */}
      {/* ============================== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="designation">Designation</FieldLabel>
          <input
            id="designation"
            name="designation"
            type="text"
            placeholder="Software Engineer"
            value={values.designation}
            onChange={handleChange("designation")}
            className={inputClass}
          />
          <FieldError message={errors.designation} />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="joiningDate">Joining date</FieldLabel>
          <input
            id="joiningDate"
            name="joiningDate"
            type="date"
            value={values.joiningDate}
            onChange={handleChange("joiningDate")}
            className={inputClass}
          />
          <FieldError message={errors.joiningDate} />
        </div>
      </div>

      {/* ============================== */}
      {/* Submit Button */}
      {/* ============================== */}
      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
        whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
        className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-[#2563EB] text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Creating account
          </span>
        ) : (
          "Create account"
        )}
      </motion.button>
    </form>
  );
}
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import PasswordInput from "./PasswordInput";
import type {
    Department,
} from "../../types/department";
import { zodResolver } from "@hookform/resolvers/zod";
import {z} from "zod";

const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required."),
    email: z.string().email("Enter a valid email address."),
    phone: z.string().regex(/^[0-9]{10}$/, "Enter a valid 10-digit phone number."),
  password: z
    .string()
    .min(
        6,
        "Password must contain at least 6 characters"
    ),
    confirmPassword: z.string(),
    dateOfBirth: z.string().min(1, "Date of birth is required.").refine((val) => {
      const dob = new Date(val);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
      return age >= 18;
    }, "Employee must be at least 18 years old."),
departmentId: z.coerce
    .number()
    .int()
    .positive(
        "Please select a department"
    ),
    designation: z.string().trim().min(1, "Designation is required."),
    joiningDate: z.string().min(1, "Joining date is required."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur", // validate a field once the user leaves it — fixes the stale-error bug
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      dateOfBirth: "",
      departmentId: null,
      designation: "",
      joiningDate: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {errorMessage ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#EF4444]">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="fullName">Full name</FieldLabel>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          placeholder="Jordan Ellis"
          {...register("fullName")}
          className={inputClass}
        />
        <FieldError message={errors.fullName?.message} />
      </div>


      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="email">Work email</FieldLabel>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
            className={inputClass}
          />
          <FieldError message={errors.email?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="phone">Phone number</FieldLabel>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
            placeholder="9876543210"
            {...register("phone", {
              onChange: (e) => {
                // strip non-digits and cap at 10, same as your original onChange did
                e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
              },
            })}
            className={inputClass}
          />
          <FieldError message={errors.phone?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <PasswordInput
            id="password"
            label="Password"
            value={watch("password")}
            onChange={(value) => setValue("password", value, { shouldValidate: true })}
          />
          <FieldError message={errors.password?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <PasswordInput
            id="confirmPassword"
            label="Confirm password"
            value={watch("confirmPassword")}
            onChange={(value) => setValue("confirmPassword", value, { shouldValidate: true })}
            autoComplete="new-password"
          />
          <FieldError message={errors.confirmPassword?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="dateOfBirth">Date of birth</FieldLabel>
          <input id="dateOfBirth" type="date" {...register("dateOfBirth")} className={inputClass} />
          <FieldError message={errors.dateOfBirth?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="departmentId">Department</FieldLabel>
          <div className="relative">
            <select
              id="departmentId"
              disabled={isLoadingDepartments}
              {...register("departmentId", { valueAsNumber: true })}
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
          <FieldError message={errors.departmentId?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="designation">Designation</FieldLabel>
          <input
            id="designation"
            type="text"
            placeholder="Software Engineer"
            {...register("designation")}
            className={inputClass}
          />
          <FieldError message={errors.designation?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="joiningDate">Joining date</FieldLabel>
          <input
            id="joiningDate"
            type="date"
            max={new Date().toISOString().split("T")[0]}
            {...register("joiningDate")}
            className={inputClass}
          />
          <FieldError message={errors.joiningDate?.message} />
        </div>
      </div>

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
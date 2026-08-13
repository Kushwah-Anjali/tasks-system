import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import PasswordInput from "./PasswordInput";

export interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onSubmit?: (values: LoginFormValues) => void;
  isSubmitting?: boolean;
  errorMessage?: string;
}

export default function LoginForm({
  onSubmit,
  isSubmitting = false,
  errorMessage,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (isSubmitting) return;
    onSubmit?.({
      email,
      password,
      rememberMe,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {/* ============================== */}
      {/* Error Message */}
      {/* ============================== */}
      {errorMessage ? (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-[#EF4444]">
          {errorMessage}
        </div>
      ) : null}

      {/* ============================== */}
      {/* Email Field */}
      {/* ============================== */}
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-semibold text-[#0F172A]">
          Work email
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#64748B]"
            strokeWidth={2}
          />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-white pl-11 pr-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all duration-150 focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />
        </div>
      </div>

      {/* ============================== */}
      {/* Password Field */}
      {/* ============================== */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#0F172A]">Password</span>
          <a
            href="#forgot-password"
            className="text-sm font-medium text-[#2563EB] transition-colors duration-150 hover:text-[#1D4ED8]"
          >
            Forgot password?
          </a>
        </div>
        <PasswordInput id="password" value={password} onChange={setPassword} />
      </div>

      {/* ============================== */}
      {/* Remember Me */}
      {/* ============================== */}
      <label
        htmlFor="rememberMe"
        className="flex select-none items-center gap-2.5 pt-1"
      >
        <input
          id="rememberMe"
          name="rememberMe"
          type="checkbox"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          className="h-4 w-4 rounded border-[#CBD5E1] text-[#2563EB] accent-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
        />
        <span className="text-sm font-medium text-[#334155]">
          Remember me on this device
        </span>
      </label>

      {/* ============================== */}
      {/* Submit Button */}
      {/* ============================== */}
      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
        whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
        className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-[#2563EB] text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Signing in
          </span>
        ) : (
          "Sign in"
        )}
      </motion.button>
    </form>
  );
}

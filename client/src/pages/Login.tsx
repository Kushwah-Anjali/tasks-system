import { motion } from "framer-motion";
import AuthLayout from "../components/layout/AuthLayout";
import LoginForm, { type LoginFormValues } from "../components/auth/LoginForm";
import { login } from "../services/authService";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const handleSubmit = async (values: LoginFormValues) => {
    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const data = await login(values.email, values.password);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.user.role === "manager") {
        navigate("/dashboard");
      } else if (data.user.role === "employee") {
        navigate("/employee-dashboard", {
          state: { user: data.user },
        });
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="rounded-2xl border border-[#E2E8F0] bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] sm:p-9"
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-[#64748B]">
            Sign in with your work email to access your dashboard.
          </p>
        </div>

        <LoginForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
        />
      </motion.div>
      <p className="mt-8 text-center text-xs text-[#94A3B8]">
        &copy; {new Date().getFullYear()} All rights reserved.
      </p>
    </AuthLayout>
  );
}

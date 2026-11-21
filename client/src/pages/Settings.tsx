import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../components/auth/PasswordInput";
import AdminLayout from "../components/layout/AdminLayout";
import DashboardLayout from "../components/layout/DashboardLayout";
import EmployeeDashboardLayout from "../components/layout/EmployeeDashboardLayout";
import { changePassword } from "../services/passwordService";
import { clearCurrentUser, getCurrentUser, getInitials } from "../utils/authStorage";

const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error && "response" in error) {
    const apiError = error as { response?: { data?: { message?: string } } };
    return apiError.response?.data?.message || "Unable to change password. Please try again.";
  }
  return "Unable to change password. Please try again.";
};

export default function Settings() {
  const user = getCurrentUser();
  if (!user) return null;

  const content = <ChangePasswordForm />;
  if (user.role === "admin") return <AdminLayout user={user}>{content}</AdminLayout>;
  if (user.role === "employee") {
    return <EmployeeDashboardLayout employeeId={user.id} employeeName={user.full_name} employeeInitials={getInitials(user.full_name)}>{content}</EmployeeDashboardLayout>;
  }
  return <DashboardLayout user={user}>{content}</DashboardLayout>;
}

function ChangePasswordForm() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setErrorMessage("");
    if (newPassword.length < 6) {
      setErrorMessage("New password must contain at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage("Choose a new password different from your current password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const message = await changePassword({ currentPassword, newPassword, confirmNewPassword });
      clearCurrentUser();
      navigate("/login", { replace: true, state: { successMessage: message } });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight text-[#0F172A] sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-[#64748B]">Update your account password.</p>
      </div>
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-[#0F172A]">Change password</h2>
        <p className="mt-1 text-sm text-[#64748B]">Use at least 6 characters. You’ll be signed out on all devices after changing it.</p>
        <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4" noValidate>
          {errorMessage ? <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">{errorMessage}</p> : null}
          <fieldset disabled={isSubmitting} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <PasswordInput id="current-password" label="Current password" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} />
            </div>
            <PasswordInput id="new-password" label="New password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} />
            <PasswordInput id="confirm-new-password" label="Confirm new password" autoComplete="new-password" value={confirmNewPassword} onChange={setConfirmNewPassword} />
          </fieldset>
          <div className="flex justify-end">
            <button type="submit" disabled={isSubmitting} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
              {isSubmitting ? "Updating password…" : "Change password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

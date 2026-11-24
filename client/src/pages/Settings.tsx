import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../components/auth/PasswordInput";
import AdminLayout from "../components/layout/AdminLayout";
import DashboardLayout from "../components/layout/DashboardLayout";
import EmployeeDashboardLayout from "../components/layout/EmployeeDashboardLayout";
import { changePassword } from "../services/passwordService";
import { notifyProfileAvatarUpdated, saveMyAvatarPreset } from "../services/profileService";
import { useUserAvatarProfile } from "../hooks/useUserAvatarProfile";
import UserAvatar from "../components/profile/UserAvatar";
import { AVATAR_PRESETS, type AvatarPresetId } from "../utils/avatarPresets";
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

  const content = <div className="mx-auto w-full max-w-3xl space-y-5"><ProfileSettings userId={user.id} name={user.full_name} /><ChangePasswordForm /></div>;
  if (user.role === "admin") return <AdminLayout user={user}>{content}</AdminLayout>;
  if (user.role === "employee") {
    return <EmployeeDashboardLayout employeeId={user.id} employeeName={user.full_name} employeeInitials={getInitials(user.full_name)}>{content}</EmployeeDashboardLayout>;
  }
  return <DashboardLayout user={user}>{content}</DashboardLayout>;
}

function ProfileSettings({ userId, name }: { userId: number; name: string }) {
  const { profile, setProfile, defaultPresetId, loading } = useUserAvatarProfile(userId);
  const [selected, setSelected] = useState<AvatarPresetId | null>(null);
  const saved = profile.avatarPresetId || defaultPresetId;
  const selectedPreset = selected || saved;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const dirty = selectedPreset !== saved;

  const save = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await saveMyAvatarPreset(selectedPreset);
      setProfile(updated); setSelected(null); setSuccess("Profile avatar saved."); notifyProfileAvatarUpdated();
    } catch (caught) {
      const message = typeof caught === "object" && caught && "response" in caught
        ? (caught as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setError(message || "Unable to save your profile avatar. Please try again.");
    } finally { setSaving(false); }
  };

  return <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-6" aria-labelledby="profile-settings-title">
    <div className="flex items-center gap-3"><UserAvatar userId={userId} name={name} presetId={selectedPreset} photoUrl={profile.photoUrl} size={56} /><div><h1 id="profile-settings-title" className="text-xl font-bold tracking-tight text-[#0F172A]">Profile</h1><p className="mt-1 text-sm text-[#64748B]">Choose how your profile picture appears.</p></div></div>
    <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => document.getElementById("avatar-presets")?.focus()} className="rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">Choose Avatar</button><button type="button" disabled className="cursor-not-allowed rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-500" title="Persistent photo storage is not configured">Upload Photo</button><button type="button" disabled className="cursor-not-allowed rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-500">Remove Photo / Use Avatar</button></div>
    <p className="mt-2 text-xs text-slate-500">Photo uploads are unavailable until durable object storage is configured. Preset avatars are saved to your account.</p>
    <fieldset className="mt-4"><legend className="mb-2 text-sm font-semibold text-slate-800">Choose an avatar</legend><div id="avatar-presets" tabIndex={-1} className="grid grid-cols-4 gap-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:grid-cols-6">{AVATAR_PRESETS.map((avatar) => <button key={avatar.id} type="button" aria-label={`${avatar.label}${selectedPreset === avatar.id ? ", selected" : ""}`} aria-pressed={selectedPreset === avatar.id} onClick={() => { setSelected(avatar.id); setSuccess(""); }} className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${selectedPreset === avatar.id ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200" : "border-slate-200 hover:bg-slate-50"}`}><UserAvatar userId={userId} name={name} presetId={avatar.id} size={42} /><span className="text-[11px] text-slate-600">{avatar.label}</span></button>)}</div></fieldset>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{success && <p role="status" className="mt-3 text-sm text-emerald-700">{success}</p>}
    <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={!dirty || saving} onClick={() => { setSelected(null); setError(""); setSuccess(""); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Cancel</button><button type="button" disabled={!dirty || saving || loading} onClick={() => void save()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div>
  </section>;
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

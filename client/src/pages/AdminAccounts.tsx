import { useEffect, useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, Check, LoaderCircle, Plus, Search, UserRound, UserRoundCog } from "lucide-react";
import Swal from "sweetalert2";
import AppModal from "../components/ui/AppModal";
import PasswordInput from "../components/auth/PasswordInput";
import RegisterForm, { type RegisterFormValues } from "../components/auth/RegisterForm";
import AdminLayout from "../components/layout/AdminLayout";
import { createManagedAccount, getManagedAccounts, resetManagedAccountPassword, setManagedAccountActive, type ManagedAccount, type ManagedRole } from "../services/adminService";
import { getDepartments } from "../services/departmentService";
import type { Department } from "../types/department";
import { getCurrentUser } from "../utils/authStorage";

type StatusFilter = "all" | "active" | "inactive";
const toast = Swal.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 2600, timerProgressBar: true });

const errorText = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error && "response" in error) {
    const responseError = error as { response?: { data?: { message?: string } } };
    return responseError.response?.data?.message || fallback;
  }
  return fallback;
};

export default function AdminAccounts() {
  const user = getCurrentUser();
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [role, setRole] = useState<ManagedRole>("manager");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [resetAccount, setResetAccount] = useState<ManagedAccount | null>(null);
  const [resetCurrentPassword, setResetCurrentPassword] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const resetSubmittingRef = useRef(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const managerNameRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setLoadError("");
    try {
      setAccounts(await getManagedAccounts());
    } catch (error) {
      setLoadError(errorText(error, "Unable to load accounts. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    getManagedAccounts()
      .then((items) => { if (alive) setAccounts(items); })
      .catch((error: unknown) => { if (alive) setLoadError(errorText(error, "Unable to load accounts. Please try again.")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!dialogOpen || role !== "employee") return;
    let alive = true;
    getDepartments().then((items) => { if (alive) setDepartments(items); })
      .catch(() => { if (alive) setFormError("Unable to load departments. Please close and try again."); })
      .finally(() => { if (alive) setDepartmentsLoading(false); });
    return () => { alive = false; };
  }, [dialogOpen, role]);

  useEffect(() => {
    if (dialogOpen && role === "manager") managerNameRef.current?.focus();
  }, [dialogOpen, role]);

  const counts = useMemo(() => ({
    manager: accounts.filter((account) => account.role === "manager").length,
    employee: accounts.filter((account) => account.role === "employee").length,
  }), [accounts]);

  const filteredAccounts = useMemo(() => accounts.filter((account) => {
    const active = Number(account.is_active) === 1;
    const query = search.trim().toLowerCase();
    return account.role === role &&
      (status === "all" || (status === "active" ? active : !active)) &&
      (!query || `${account.full_name} ${account.email}`.toLowerCase().includes(query));
  }), [accounts, role, search, status]);

  const openDialog = (nextRole: ManagedRole) => {
    setRole(nextRole);
    setFormError("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
    setFormError("");
  };

  const submitManager = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("full_name") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    if (!fullName || fullName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      setFormError("Enter a name, valid work email, and password with at least 6 characters.");
      return;
    }
    setSubmitting(true); setFormError("");
    try {
      await createManagedAccount({ role: "manager", full_name: fullName, email, password });
      setDialogOpen(false); await refresh(); await toast.fire({ icon: "success", title: "Manager account created" });
    } catch (error) { setFormError(errorText(error, "Unable to create manager account.")); }
    finally { setSubmitting(false); }
  };

  const submitEmployee = async (values: RegisterFormValues) => {
    setSubmitting(true); setFormError("");
    try {
      await createManagedAccount({
        role: "employee", full_name: values.fullName.trim(), email: values.email.trim().toLowerCase(), phone: values.phone,
        password: values.password, confirm_password: values.confirmPassword, date_of_birth: values.dateOfBirth,
        department_id: values.departmentId, designation: values.designation.trim(), joining_date: values.joiningDate,
      });
      setDialogOpen(false); await refresh(); await toast.fire({ icon: "success", title: "Employee account created" });
    } catch (error) { setFormError(errorText(error, "Unable to create employee account.")); }
    finally { setSubmitting(false); }
  };

  const toggleActive = async (account: ManagedAccount) => {
    const becomingActive = Number(account.is_active) !== 1;
    const result = await Swal.fire({
      title: `${becomingActive ? "Activate" : "Deactivate"} account?`,
      text: `${account.full_name} will ${becomingActive ? "be able to sign in" : "lose access immediately"}.`,
      icon: "warning", showCancelButton: true, confirmButtonText: becomingActive ? "Activate" : "Deactivate",
      cancelButtonText: "Cancel", confirmButtonColor: becomingActive ? "#2563EB" : "#DC2626",
    });
    if (!result.isConfirmed) return;
    setPendingId(account.id);
    try {
      await setManagedAccountActive(account.id, becomingActive);
      setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, is_active: becomingActive ? 1 : 0 } : item));
      await toast.fire({ icon: "success", title: becomingActive ? "Account activated" : "Account deactivated" });
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Could not update account", text: errorText(error, "Please try again.") });
    } finally { setPendingId(null); }
  };

  const closePasswordReset = () => {
    if (resetSubmittingRef.current) return;
    setResetAccount(null);
    setResetCurrentPassword("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setResetError("");
  };

  const submitPasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetAccount || resetSubmittingRef.current) return;
    setResetError("");
    if (!resetCurrentPassword) {
      setResetError("Enter your current admin password.");
      return;
    }
    if (resetNewPassword.length < 6) {
      setResetError("Temporary password must contain at least 6 characters.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Temporary passwords do not match.");
      return;
    }

    resetSubmittingRef.current = true;
    setResetSubmitting(true);
    try {
      const confirmation = await Swal.fire({
        title: `Reset ${resetAccount.full_name}'s password?`,
        text: "Their existing sessions will be revoked. The account status will stay unchanged.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Reset password",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#2563EB",
      });
      if (!confirmation.isConfirmed) return;

      await resetManagedAccountPassword(resetAccount.id, {
        currentPassword: resetCurrentPassword,
        newPassword: resetNewPassword,
        confirmNewPassword: resetConfirmPassword,
      });
      setResetAccount(null);
      setResetCurrentPassword("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      await toast.fire({ icon: "success", title: "Password reset. Share it privately." });
    } catch (error) {
      setResetError(errorText(error, "Unable to reset this account password."));
    } finally {
      resetSubmittingRef.current = false;
      setResetSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <AdminLayout user={user}>
      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-xl font-bold tracking-tight sm:text-2xl">Account management</h1><p className="mt-1 text-sm text-slate-600">Manage manager and employee access.</p></div>
          <button ref={addButtonRef} type="button" onClick={() => openDialog(role)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"><Plus className="h-4 w-4" /> Add {role === "manager" ? "Manager" : "Employee"}</button>
        </div>

        <div className="mb-4 flex gap-2 border-b border-slate-200" role="tablist" aria-label="Account type">
          {(["manager", "employee"] as const).map((tab) => {
            const selected = role === tab;
            const Icon = tab === "manager" ? UserRoundCog : BriefcaseBusiness;
            return <button key={tab} id={`admin-tab-${tab}`} type="button" role="tab" aria-controls="admin-accounts-panel" aria-selected={selected} tabIndex={selected ? 0 : -1} onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); const next = tab === "manager" ? "employee" : "manager"; setRole(next); document.getElementById(`admin-tab-${next}`)?.focus(); } }} onClick={() => setRole(tab)} className={`-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${selected ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}><Icon className="h-4 w-4" />{tab === "manager" ? "Managers" : "Employees"}<span className={`rounded-full px-2 py-0.5 text-xs ${selected ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{counts[tab]}</span></button>;
          })}
        </div>

        <section id="admin-accounts-panel" role="tabpanel" aria-labelledby={`admin-tab-${role}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label={`${role} accounts`}>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:p-4">
            <label className="relative min-w-0 flex-1"><span className="sr-only">Search accounts</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label className="flex items-center gap-2 text-sm text-slate-600"><span>Status</span><select aria-label="Filter by account status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="h-10 min-w-32 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          </div>
          {loading ? <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading accounts…</div> : loadError ? <div className="p-6 text-center"><p className="text-sm text-red-700">{loadError}</p><button type="button" onClick={() => { setLoading(true); void refresh(); }} className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Try again</button></div> : filteredAccounts.length === 0 ? <div className="flex min-h-40 flex-col items-center justify-center px-4 text-center"><UserRound className="h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">{accounts.some((item) => item.role === role) ? "No matching accounts" : `No ${role} accounts yet`}</p><p className="mt-1 text-xs text-slate-500">{accounts.some((item) => item.role === role) ? "Try another search or status filter." : `Add a ${role} account to get started.`}</p></div> : <>
            <div className="hidden overflow-x-auto md:block"><table className="w-full table-fixed text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-[24%] px-4 py-3 font-semibold">Name</th><th className="w-[30%] px-4 py-3 font-semibold">Email</th><th className="w-[13%] px-4 py-3 font-semibold">Role</th><th className="w-[13%] px-4 py-3 font-semibold">Status</th><th className="w-[20%] px-4 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredAccounts.map((account) => <tr key={account.id} className="hover:bg-slate-50/70"><td className="break-words px-4 py-3 font-semibold text-slate-800">{account.full_name}</td><td className="break-all px-4 py-3 text-slate-600">{account.email}</td><td className="px-4 py-3 capitalize text-slate-600">{account.role}</td><td className="px-4 py-3"><StatusPill active={Number(account.is_active) === 1} /></td><td className="px-4 py-3 text-right"><div className="flex flex-col items-end gap-1"><StatusAction account={account} pending={pendingId === account.id} onClick={() => void toggleActive(account)} /><button type="button" onClick={() => { setResetAccount(account); setResetError(""); }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Reset password</button></div></td></tr>)}</tbody></table></div>
            <ul className="divide-y divide-slate-100 md:hidden">{filteredAccounts.map((account) => <li key={account.id} className="p-4"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-800">{account.full_name}</p><p className="mt-1 break-all text-sm text-slate-600">{account.email}</p></div><StatusPill active={Number(account.is_active) === 1} /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs capitalize text-slate-500">{account.role}</span><div className="flex items-center gap-1"><StatusAction account={account} pending={pendingId === account.id} onClick={() => void toggleActive(account)} /><button type="button" onClick={() => { setResetAccount(account); setResetError(""); }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Reset password</button></div></div></li>)}</ul>
          </>}
        </section>
      </div>

      <AppModal open={dialogOpen} onClose={closeDialog} title={`Add ${role === "manager" ? "Manager" : "Employee"}`} description={role === "manager" ? "Create a manager login." : "Create an employee account and profile."} size="lg" closeOnBackdrop={!submitting}>
        {role === "manager" ? <form onSubmit={(event) => void submitManager(event)} className="space-y-4" noValidate>
          {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          <div><label htmlFor="admin-manager-name" className="mb-1.5 block text-sm font-semibold text-slate-800">Full name</label><input ref={managerNameRef} id="admin-manager-name" name="full_name" autoComplete="name" required maxLength={100} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
          <div><label htmlFor="admin-manager-email" className="mb-1.5 block text-sm font-semibold text-slate-800">Work email</label><input id="admin-manager-email" name="email" type="email" autoComplete="email" required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
          <div><label htmlFor="admin-manager-password" className="mb-1.5 block text-sm font-semibold text-slate-800">Temporary password</label><input id="admin-manager-password" name="password" type="password" autoComplete="new-password" minLength={6} required className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><p className="mt-1 text-xs text-slate-500">At least 6 characters.</p></div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeDialog} disabled={submitting} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Cancel</button><button type="submit" disabled={submitting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">{submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}Create Manager</button></div>
        </form> : <>
          {formError && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          <RegisterForm departments={departments} isLoadingDepartments={departmentsLoading} onSubmit={submitEmployee} isSubmitting={submitting} onCancel={closeDialog} />
        </>}
      </AppModal>

      <AppModal
        open={Boolean(resetAccount)}
        onClose={closePasswordReset}
        title="Reset account password"
        description={resetAccount ? `${resetAccount.full_name} · ${resetAccount.role}` : undefined}
        size="md"
        closeOnBackdrop={!resetSubmitting}
      >
        <form onSubmit={(event) => void submitPasswordReset(event)} className="space-y-4" noValidate>
          <p className="text-sm leading-5 text-slate-600">Choose a temporary password with at least 6 characters. Share it privately; they can change it in Settings.</p>
          {resetError ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{resetError}</p> : null}
          <fieldset disabled={resetSubmitting} className="space-y-4">
            <div>
              <PasswordInput id="admin-reset-current-password" label="Your admin password" autoComplete="current-password" value={resetCurrentPassword} onChange={setResetCurrentPassword} />
              <p className="mt-1.5 text-xs leading-5 text-slate-500">Enter your own admin login password to authorise this reset. You do not need this user’s old password.</p>
            </div>
            <PasswordInput id="admin-reset-new-password" label="New temporary password" autoComplete="new-password" value={resetNewPassword} onChange={setResetNewPassword} />
            <PasswordInput id="admin-reset-confirm-password" label="Confirm temporary password" autoComplete="new-password" value={resetConfirmPassword} onChange={setResetConfirmPassword} />
          </fieldset>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={closePasswordReset} disabled={resetSubmitting} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Cancel</button>
            <button type="submit" disabled={resetSubmitting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">{resetSubmitting ? <><LoaderCircle className="h-4 w-4 animate-spin" />Resetting…</> : "Reset password"}</button>
          </div>
        </form>
      </AppModal>
    </AdminLayout>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{active ? <Check className="h-3 w-3" /> : null}{active ? "Active" : "Inactive"}</span>;
}

function StatusAction({ account, pending, onClick }: { account: ManagedAccount; pending: boolean; onClick: () => void }) {
  const active = Number(account.is_active) === 1;
  return <button type="button" disabled={pending} onClick={onClick} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 ${active ? "text-red-700 hover:bg-red-50" : "text-blue-700 hover:bg-blue-50"}`}>{pending ? "Saving…" : active ? "Deactivate" : "Activate"}</button>;
}

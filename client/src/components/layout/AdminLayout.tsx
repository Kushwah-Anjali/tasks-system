import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLogout } from "../../hooks/useLogout";
import type { AuthUser } from "../../types/auth";
import UserAvatar from "../profile/UserAvatar";
import { useUserAvatarProfile } from "../../hooks/useUserAvatarProfile";

export default function AdminLayout({ user, children }: { user: AuthUser; children: ReactNode }) {
  const { profile, defaultPresetId } = useUserAvatarProfile(user.id);
  const { handleLogout, isLoggingOut } = useLogout();
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">TS</div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-bold">Task System</p>
              <p className="text-xs text-slate-500">IT administration</p>
            </div>
            <span className="text-sm font-semibold text-slate-700 sm:ml-2 sm:border-l sm:border-slate-200 sm:pl-4">Accounts</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <UserAvatar userId={user.id} name={user.full_name} presetId={profile.avatarPresetId || defaultPresetId} photoUrl={profile.photoUrl} size={36} />
            <span className="hidden max-w-40 truncate text-sm font-medium sm:block">{user.full_name}</span>
            <Link to="/settings" className="rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Settings</Link>
            <button type="button" onClick={() => void handleLogout()} disabled={isLoggingOut} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">{isLoggingOut ? "Signing out…" : "Sign out"}</button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">{children}</main>
    </div>
  );
}

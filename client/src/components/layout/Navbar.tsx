import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLogout } from "../../hooks/useLogout";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import NotificationPanel from "./NotificationPanel";
import UserAvatar from "../profile/UserAvatar";
import { useUserAvatarProfile } from "../../hooks/useUserAvatarProfile";
import type {
    AuthUser,
} from "../../types/auth";
import {
  Menu,
  Search,
  ChevronDown,
  Settings,
  LogOut,
  // UserRound,
} from "lucide-react";

function ProfileMenuItem({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
       onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ${
        danger
          ? "text-[#EF4444] hover:bg-red-50"
          : "text-[#334155] hover:bg-[#F1F5F9]"
      }`}
   
    >
      {icon}
      {label}
    </button>
  );
}

interface NavbarProps {
    onMenuClick: () => void;
    user: AuthUser;
}
export default function Navbar({ onMenuClick, user }: NavbarProps) {
  const navigate = useNavigate();
  const { profile, defaultPresetId } = useUserAvatarProfile(user.id);
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    soundEnabled,
    soundReady,
    soundBlocked,
    refresh: refreshNotifications,
    markRead,
    markAllRead,
    toggleSound,
    muteSound,
  } = useNotificationCenter(user.id);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
const {
    handleLogout,
    isLoggingOut,
} = useLogout();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-[#E2E8F0] bg-white/95 px-4 backdrop-blur-sm sm:px-6">
 
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
          strokeWidth={2}
        />
        <input
          type="text"
          placeholder="Search employees, tasks..."
          className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all duration-150 focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
        />
      </div>
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] sm:hidden"
        aria-label="Search"
      >
        <Search className="h-[18px] w-[18px]" />
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          loading={notificationsLoading}
          error={notificationsError}
          soundEnabled={soundEnabled}
          soundReady={soundReady}
          soundBlocked={soundBlocked}
          refresh={refreshNotifications}
          markRead={markRead}
          markAllRead={markAllRead}
          toggleSound={toggleSound}
          muteSound={muteSound}
          onOpenNotification={(notification) => {
            const target = notification.reference_id && notification.type.startsWith("task_")
              ? `/tasks/${notification.reference_id}`
              : notification.link;
            if (target) navigate(target);
          }}
        />

        {/* ============================== */}
        {/* Profile */}
        {/* ============================== */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-[#F1F5F9] sm:pl-1.5 sm:pr-3"
          >
            <UserAvatar userId={user.id} name={user.full_name} presetId={profile.avatarPresetId || defaultPresetId} photoUrl={profile.photoUrl} size={40} />
            <span className="hidden text-sm font-medium text-[#0F172A] sm:block">
              {user.full_name}
            </span>
            <ChevronDown className="hidden h-4 w-4 text-[#64748B] sm:block" />
          </button>

          <AnimatePresence>
            {profileOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
              >
                <div className="px-3 py-2.5">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {user?.role || "Employee"}
                  </p>
                </div>
                <div className="my-1 h-px bg-[#E2E8F0]" />
                {/* <ProfileMenuItem
                  icon={<UserRound className="h-4 w-4" />}
                  label="View profile"
                /> */}
                <ProfileMenuItem icon={<Settings className="h-4 w-4" />} label="Settings" onClick={() => { setProfileOpen(false); navigate("/settings"); }} />
                <div className="my-1 h-px bg-[#E2E8F0]" />
             <ProfileMenuItem
    icon={
        <LogOut className="h-4 w-4" />
    }
    label={
        isLoggingOut
            ? "Signing out..."
            : "Sign out"
    }
    danger
    onClick={() => {
        void handleLogout();
    }}
/>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

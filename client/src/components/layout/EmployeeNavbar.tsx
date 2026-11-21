import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useLogout } from "../../hooks/useLogout";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import NotificationPanel from "./NotificationPanel";

function ProfileMenuItem({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ${danger
        ? "text-[#EF4444] hover:bg-red-50"
        : "text-[#334155] hover:bg-[#F1F5F9]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface EmployeeNavbarProps {
  onMenuClick: () => void;
  employeeId: number;
  employeeName: string;
  employeeInitials: string;
}

export default function EmployeeNavbar({
  onMenuClick,
  employeeId,
  employeeName,
  employeeInitials,
}: EmployeeNavbarProps) {
  const navigate = useNavigate();
  const notificationCenter = useNotificationCenter(employeeId);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { handleLogout, isLoggingOut } = useLogout();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-[#E2E8F0] bg-white/95 px-4 backdrop-blur-sm sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9] lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <NotificationPanel
          notifications={notificationCenter.notifications}
          unreadCount={notificationCenter.unreadCount}
          loading={notificationCenter.loading}
          error={notificationCenter.error}
          soundEnabled={notificationCenter.soundEnabled}
          soundReady={notificationCenter.soundReady}
          soundBlocked={notificationCenter.soundBlocked}
          refresh={notificationCenter.refresh}
          markRead={notificationCenter.markRead}
          markAllRead={notificationCenter.markAllRead}
          toggleSound={notificationCenter.toggleSound}
          muteSound={notificationCenter.muteSound}
          onOpenNotification={(notification) => {
            if (notification.link) navigate(notification.link);
          }}
        />

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-[#F1F5F9] sm:pl-1.5 sm:pr-3"
            aria-expanded={profileOpen}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-sm font-semibold text-blue-800">
              {employeeInitials}
            </div>
            <span className="hidden text-sm font-medium text-[#0F172A] sm:block">{employeeName}</span>
            <ChevronDown className="hidden h-4 w-4 text-[#64748B] sm:block" />
          </button>

          <AnimatePresence>
            {profileOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
              >
                <div className="px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-[#0F172A]">{employeeName}</p>
                  <p className="text-xs text-[#64748B]">Employee</p>
                </div>
                <div className="my-1 h-px bg-[#E2E8F0]" />
                <ProfileMenuItem
                  icon={<LogOut className="h-4 w-4" />}
                  label={isLoggingOut ? "Signing out..." : "Sign out"}
                  danger
                  onClick={() => void handleLogout()}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

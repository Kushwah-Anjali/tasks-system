import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Bell, ChevronDown, Settings, LogOut, UserRound } from "lucide-react";
import type { ReactNode } from "react";

function NotificationRow({ title, time }: { title: string; time: string }) {
  return (
    <button className="flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#F8FAFC]">
      <span className="text-sm font-medium text-[#0F172A]">{title}</span>
      <span className="text-xs text-[#94A3B8]">{time}</span>
    </button>
  );
}

function ProfileMenuItem({
  icon,
  label,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ${
        danger ? "text-[#EF4444] hover:bg-red-50" : "text-[#334155] hover:bg-[#F1F5F9]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface EmployeeNavbarProps {
  onMenuClick: () => void;
  employeeName: string;
  employeeInitials: string;
}

export default function EmployeeNavbar({
  onMenuClick,
  employeeName,
  employeeInitials,
}: EmployeeNavbarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#E2E8F0] bg-white/90 px-4 backdrop-blur-sm sm:px-6">
      {/* ============================== */}
      {/* Mobile Menu Trigger */}
      {/* ============================== */}
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* ============================== */}
        {/* Notifications */}
        {/* ============================== */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
          </button>

          <AnimatePresence>
            {notificationsOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
              >
                <div className="px-3 py-2 text-sm font-semibold text-[#0F172A]">
                  Notifications
                </div>
                <NotificationRow title="Your leave request was approved" time="1 hour ago" />
                <NotificationRow title="Payslip for July is available" time="Yesterday" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ============================== */}
        {/* Profile */}
        {/* ============================== */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-[#F1F5F9] sm:pl-1.5 sm:pr-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-sm font-semibold text-white">
              {employeeInitials}
            </div>
            <span className="hidden text-sm font-medium text-[#0F172A] sm:block">
              {employeeName}
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
                  <p className="text-sm font-semibold text-[#0F172A]">{employeeName}</p>
                  <p className="text-xs text-[#64748B]">Employee</p>
                </div>
                <div className="my-1 h-px bg-[#E2E8F0]" />
                <ProfileMenuItem icon={<UserRound className="h-4 w-4" />} label="View profile" />
                <ProfileMenuItem icon={<Settings className="h-4 w-4" />} label="Account settings" />
                <div className="my-1 h-px bg-[#E2E8F0]" />
                <ProfileMenuItem icon={<LogOut className="h-4 w-4" />} label="Sign out" danger />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
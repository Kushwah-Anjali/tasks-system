import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import type {
  ReactNode,
} from "react";

import { useLogout } from "../../hooks/useLogout";
import { useNotificationCenter } from "../../hooks/useNotificationCenter";
import NotificationSoundControl from "./NotificationSoundControl";

import type {
  AppNotification,
} from "../../types/notification";

const getNotificationCopy = (notification: AppNotification) => {
  const title = notification.type === "task_handoff"
    ? "Task forwarding request"
    : notification.type === "task_handoff_rejected"
      ? "Forward request declined"
      : notification.title;
  const message = notification.message?.replace(/\bhand[\s-]?off\b/gi, "forward") ?? null;
  return { title, message };
};


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
  } = useNotificationCenter(employeeId);

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false);

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const notifRef =
    useRef<HTMLDivElement>(null);

  const profileRef =
    useRef<HTMLDivElement>(null);


  const {
    handleLogout,
    isLoggingOut,
  } = useLogout();


  // ==============================
  // Close dropdowns on outside click
  // ==============================

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(
          event.target as Node
        )
      ) {
        setNotificationsOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target as Node
        )
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);


  // ==============================
  // Open Notification
  // ==============================

  const handleNotificationClick =
    async (
      notification: AppNotification
    ) => {
      if (!await markRead(notification)) return;
      setNotificationsOpen(false);
      if (notification.link) navigate(notification.link);
    };


  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-[#E2E8F0] bg-white/95 px-4 backdrop-blur-sm sm:px-6">

      {/* ============================== */}
      {/* Mobile Menu */}
      {/* ============================== */}

      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9] lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>


      <div className="ml-auto flex items-center gap-2 sm:gap-3">

        {/* ============================== */}
        {/* Notifications */}
        {/* ============================== */}

        <div
          className="relative"
          ref={notifRef}
        >
          <button
            type="button"
            onClick={() =>
              setNotificationsOpen(
                (current) =>
                  !current
              )
            }
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9]"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />

            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 9
                  ? "9+"
                  : unreadCount}
              </span>
            ) : null}
          </button>


          <AnimatePresence>
            {notificationsOpen ? (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -8,
                  scale: 0.98,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                  scale: 0.98,
                }}
                transition={{
                  duration: 0.15,
                }}
                className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.1)] sm:w-80"
              >

                {/* Header */}

                <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">
                      Notifications
                    </p>

                    {unreadCount > 0 ? (
                      <p className="mt-0.5 text-xs text-[#64748B]">
                        {unreadCount} unread
                      </p>
                    ) : null}
                  </div>

                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      className="shrink-0 text-xs font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8]"
                    >
                      Mark all read
                    </button>
                  ) : null}
                </div>
                <NotificationSoundControl enabled={soundEnabled} ready={soundReady} blocked={soundBlocked} onToggle={() => void toggleSound()} onMute={() => void muteSound()} />


                {/* Notification List */}

                <div className="max-h-[360px] overflow-y-auto p-2">
                  {notificationsLoading ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-[#64748B]">
                        Loading notifications...
                      </p>
                    </div>
                  ) : notificationsError && notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p role="alert" className="text-sm text-red-600">{notificationsError}</p>
                      <button type="button" onClick={() => void refreshNotifications()} className="mt-2 text-xs font-semibold text-[#2563EB]">Try again</button>
                    </div>
                  ) : notifications.length ===
                    0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="mx-auto h-6 w-6 text-[#CBD5E1]" />

                      <p className="mt-2 text-sm font-medium text-[#334155]">
                        No notifications
                      </p>

                      <p className="mt-1 text-xs text-[#94A3B8]">
                        New task notifications
                        will appear here.
                      </p>
                    </div>
                  ) : (
                    <>
                    {notificationsError ? <p role="alert" className="px-3 py-2 text-xs text-red-600">{notificationsError}</p> : null}
                    {notifications.map(
                      (
                        notification
                      ) => {
                        const notificationCopy = getNotificationCopy(notification);
                        return (
                        <button
                          key={
                            notification.id
                          }
                          type="button"
                          onClick={() =>
                            void handleNotificationClick(
                              notification
                            )
                          }
                          className={`mb-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors last:mb-0 hover:bg-[#F8FAFC] ${notification.is_read ===
                              0
                              ? "bg-blue-50/60"
                              : "bg-white"
                            }`}
                        >
                          <div
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.is_read ===
                                0
                                ? "bg-[#2563EB]"
                                : "bg-transparent"
                              }`}
                          />

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm text-[#0F172A] ${notification.is_read ===
                                  0
                                  ? "font-semibold"
                                  : "font-medium"
                                }`}
                            >
                              {
                              notificationCopy.title
                              }
                            </p>

                            {notificationCopy.message ? (
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B]">
                                {
                                  notificationCopy.message
                                }
                              </p>
                            ) : null}
                          </div>
                        </button>
                        );
                      }
                    )
                    }
                    </>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>


        {/* ============================== */}
        {/* Profile */}
        {/* ============================== */}

        <div
          className="relative"
          ref={profileRef}
        >
          <button
            type="button"
            onClick={() =>
              setProfileOpen(
                (current) =>
                  !current
              )
            }
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-[#F1F5F9] sm:pl-1.5 sm:pr-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-sm font-semibold text-blue-800">
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
                initial={{
                  opacity: 0,
                  y: -8,
                  scale: 0.98,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                  scale: 0.98,
                }}
                transition={{
                  duration: 0.15,
                }}
                className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
              >
                <div className="px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-[#0F172A]">
                    {employeeName}
                  </p>

                  <p className="text-xs text-[#64748B]">
                    Employee
                  </p>
                </div>

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

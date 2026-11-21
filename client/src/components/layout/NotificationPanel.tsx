import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import type { AppNotification } from "../../types/notification";
import NotificationSoundControl from "./NotificationSoundControl";

interface NotificationPanelProps {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  soundEnabled: boolean;
  soundReady: boolean;
  soundBlocked: boolean;
  refresh: () => Promise<void>;
  markRead: (notification: AppNotification) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
  toggleSound: () => Promise<void>;
  muteSound: () => Promise<void>;
  onOpenNotification: (notification: AppNotification) => void;
}

const getNotificationCopy = (notification: AppNotification) => ({
  title: notification.type === "task_handoff"
    ? "Task forwarding request"
    : notification.type === "task_handoff_rejected"
      ? "Forward request declined"
      : notification.title,
  message: notification.message?.replace(/\bhand[\s-]?off\b/gi, "forward") ?? null,
});

const getNotificationTime = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export default function NotificationPanel({
  notifications,
  unreadCount,
  loading,
  error,
  soundEnabled,
  soundReady,
  soundBlocked,
  refresh,
  markRead,
  markAllRead,
  toggleSound,
  muteSound,
  onOpenNotification,
}: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!await markRead(notification)) return;
    setOpen(false);
    onOpenNotification(notification);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9]"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="notification-panel"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 ? (
          <span aria-hidden="true" className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.section
            id="notification-panel"
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed left-4 right-4 top-[5.5rem] z-50 flex max-h-[calc(100dvh-6.5rem)] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.1)] md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-80 md:max-h-[calc(100dvh-7rem)]"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E2E8F0] px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0F172A]">Notifications</p>
                {unreadCount > 0 ? <p className="mt-0.5 text-xs text-[#64748B]">{unreadCount} unread</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {unreadCount > 0 ? (
                  <button type="button" onClick={() => void markAllRead()} className="min-h-11 rounded-lg px-2 text-xs font-semibold text-[#2563EB] transition-colors hover:bg-blue-50 hover:text-[#1D4ED8]">
                    Mark all read
                  </button>
                ) : null}
                <button ref={closeRef} type="button" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]" aria-label="Close notifications">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="shrink-0">
              <NotificationSoundControl enabled={soundEnabled} ready={soundReady} blocked={soundBlocked} onToggle={() => void toggleSound()} onMute={() => void muteSound()} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {loading ? (
                <p role="status" className="px-4 py-8 text-center text-sm text-[#64748B]">Loading notifications...</p>
              ) : error && notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p role="alert" className="break-words text-sm text-red-600">{error}</p>
                  <button type="button" onClick={() => void refresh()} className="mt-2 min-h-11 rounded-lg px-3 text-xs font-semibold text-[#2563EB]">Try again</button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="mx-auto h-6 w-6 text-[#CBD5E1]" />
                  <p className="mt-2 text-sm font-medium text-[#334155]">No notifications</p>
                  <p className="mt-1 text-xs text-[#64748B]">New task notifications will appear here.</p>
                </div>
              ) : (
                <>
                  {error ? <p role="alert" className="break-words px-3 py-2 text-xs text-red-600">{error}</p> : null}
                  {notifications.map((notification) => {
                    const copy = getNotificationCopy(notification);
                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => void handleNotificationClick(notification)}
                        className={`mb-1 flex min-h-11 w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors last:mb-0 hover:bg-[#F8FAFC] ${notification.is_read === 0 ? "bg-blue-50/60" : "bg-white"}`}
                      >
                        <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.is_read === 0 ? "bg-[#2563EB]" : "bg-transparent"}`} />
                        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                          <span className={`block text-sm text-[#0F172A] ${notification.is_read === 0 ? "font-semibold" : "font-medium"}`}>{copy.title}</span>
                          {copy.message ? <span className="mt-1 block text-xs leading-5 text-[#64748B] [overflow-wrap:anywhere]">{copy.message}</span> : null}
                          <time className="mt-1 block text-[11px] text-[#94A3B8]" dateTime={notification.created_at}>{getNotificationTime(notification.created_at)}</time>
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

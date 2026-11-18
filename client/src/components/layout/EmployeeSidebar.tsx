import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck2,
  ClipboardList,
  // UserRound,
  X,
} from "lucide-react";
import { getCurrentUser } from "../../utils/authStorage";

export interface EmployeeNavItem {
  label: string;
  icon: ReactNode;
  path?: string;
  requiresAttendanceManagement?: boolean;
}

const navItems: EmployeeNavItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
    path: "/employee-dashboard",
  },
  {
    label: "Attendance",
    icon: <CalendarCheck2 className="h-[18px] w-[18px]" />,
    path: "/attendance",
    requiresAttendanceManagement: true,
  },
  { label: "Tasks", icon: <ClipboardList className="h-[18px] w-[18px]" />, path: "/employee-tasks" },
];

interface EmployeeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmployeeSidebar({ isOpen, onClose }: EmployeeSidebarProps) {
  const location = useLocation();
  const user = getCurrentUser();
  const visibleNavItems = navItems.filter(
    (item) =>
      !item.requiresAttendanceManagement ||
      user?.can_manage_attendance === true
  );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#D5DFEC] bg-white shadow-[3px_0_16px_rgba(30,41,59,0.025)] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* ============================== */}
      {/* Logo */}
      {/* ============================== */}
      <div className="flex h-20 items-center justify-between border-b border-[#E2E8F0] px-5">
        <div><p className="text-lg font-bold text-slate-800">Workplace</p><p className="text-xs text-slate-500">My workspace</p></div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* ============================== */}
      {/* Navigation Items */}
      {/* ============================== */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-5">
        {visibleNavItems.map((item) => {
          const isActive = item.path ? (location.pathname === item.path || location.pathname.startsWith(item.path + "/")) : false;
          const itemClassName = `flex w-full items-center gap-3.5 rounded-xl border border-transparent px-4 py-3 text-base font-semibold transition-colors duration-150 ${
            isActive
              ? "border-blue-200 bg-blue-50 text-blue-800 shadow-[inset_3px_0_0_#2563EB]"
              : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          }`;

          if (item.path) {
            return (
              <Link key={item.label} to={item.path} aria-current={isActive ? "page" : undefined} onClick={onClose} className={itemClassName}>
                {item.icon}
                {item.label}
              </Link>
            );
          }

          return (
            <button key={item.label} className={itemClassName}>
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

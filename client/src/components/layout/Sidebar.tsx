import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  ClipboardList,
  Settings,
  LogOut,
  X,
} from "lucide-react";

export interface NavItem {
  label: string;
  icon: ReactNode;
  path?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="h-[18px] w-[18px]" />, path: "/dashboard" },
  { label: "Employees", icon: <Users className="h-[18px] w-[18px]" />, path: "/employees" },
  { label: "Attendance", icon: <CalendarCheck2 className="h-[18px] w-[18px]" /> },
  { label: "Tasks", icon: <ClipboardList className="h-[18px] w-[18px]" />, path: "/tasks" },  { label: "Settings", icon: <Settings className="h-[18px] w-[18px]" /> },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#E2E8F0] bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* ============================== */}
      {/* Logo */}
      {/* ============================== */}
      <div className="flex h-16 items-center justify-between px-5">
       
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
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.path ? location.pathname === item.path : false;
          const itemClassName = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
            isActive
              ? "bg-[#2563EB]/10 text-[#2563EB]"
              : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          }`;

          if (item.path) {
            return (
              <Link key={item.label} to={item.path} onClick={onClose} className={itemClassName}>
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
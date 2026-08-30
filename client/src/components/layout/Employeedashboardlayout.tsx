import { useState } from "react";

import {
    AnimatePresence,
    motion,
} from "framer-motion";

import type { ReactNode } from "react";

import EmployeeNavbar from "./EmployeeNavbar";
import EmployeeSidebar from "./EmployeeSidebar";

interface EmployeeDashboardLayoutProps {
    children: ReactNode;
    employeeName: string;
    employeeInitials: string;
}

export default function EmployeeDashboardLayout({
    children,
    employeeName,
    employeeInitials,
}: EmployeeDashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] =
        useState(false);

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC]">
            <AnimatePresence>
                {sidebarOpen ? (
                    <motion.button
                        type="button"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeSidebar}
                        aria-label="Close sidebar"
                        className="fixed inset-0 z-40 h-full w-full bg-[#0F172A]/40 lg:hidden"
                    />
                ) : null}
            </AnimatePresence>

            <EmployeeSidebar
                isOpen={sidebarOpen}
                onClose={closeSidebar}
            />

            <div className="lg:pl-[260px]">
                <EmployeeNavbar
                    onMenuClick={() =>
                        setSidebarOpen(true)
                    }
                    employeeName={
                        employeeName
                    }
                    employeeInitials={
                        employeeInitials
                    }
                />

                <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
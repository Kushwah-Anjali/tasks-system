import { useState } from "react";

import {
    AnimatePresence,
    motion,
} from "framer-motion";

import type { ReactNode } from "react";

import type {
    AuthUser,
} from "../../types/auth";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
    children: ReactNode;
    user: AuthUser;
}

export default function DashboardLayout({
    children,
    user,
}: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] =
        useState(false);

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <AnimatePresence>
                {sidebarOpen ? (
                    <motion.button
                        type="button"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={
                            closeSidebar
                        }
                        aria-label="Close sidebar"
                        className="fixed inset-0 z-40 h-full w-full bg-[#0F172A]/40 lg:hidden"
                    />
                ) : null}
            </AnimatePresence>

            <Sidebar
                isOpen={sidebarOpen}
                onClose={closeSidebar}
            />

            <div className="lg:pl-[260px]">
                <Navbar
                    user={user}
                    onMenuClick={() =>
                        setSidebarOpen(true)
                    }
                />

                <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
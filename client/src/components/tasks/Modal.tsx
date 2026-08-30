import { useEffect } from "react";

import {
    AnimatePresence,
    motion,
} from "framer-motion";

import { X } from "lucide-react";

import type { ReactNode } from "react";

interface ModalProps {
    open: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
}

export default function Modal({
    open,
    title,
    children,
    onClose,
}: ModalProps) {
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (
            event: KeyboardEvent
        ) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;

            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
                    <motion.button
                        type="button"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: 0.15,
                        }}
                        onClick={onClose}
                        aria-label="Close modal"
                        className="absolute inset-0 h-full w-full cursor-default bg-[#0F172A]/40"
                    />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                        initial={{
                            opacity: 0,
                            y: 12,
                            scale: 0.98,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                        }}
                        exit={{
                            opacity: 0,
                            y: 12,
                            scale: 0.98,
                        }}
                        transition={{
                            duration: 0.2,
                            ease: "easeOut",
                        }}
                        className="relative z-10 max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white shadow-xl"
                    >
                        <div className="sticky top-0 flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-4">
                            <h2
                                id="modal-title"
                                className="text-base font-semibold text-[#0F172A]"
                            >
                                {title}
                            </h2>

                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9]"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="px-6 py-5">
                            {children}
                        </div>
                    </motion.div>
                </div>
            ) : null}
        </AnimatePresence>
    );
}
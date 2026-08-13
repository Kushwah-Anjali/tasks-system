import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";

export default function EmployeeActionsMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex justify-end" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
        aria-label="Row actions"
      >
        <MoreHorizontal className="h-4.5 w-4.5" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-9 z-20 w-40 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
          >
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#334155] transition-colors duration-150 hover:bg-[#F1F5F9]">
              <Eye className="h-4 w-4" />
              View
            </button>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#334155] transition-colors duration-150 hover:bg-[#F1F5F9]">
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#EF4444] transition-colors duration-150 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}